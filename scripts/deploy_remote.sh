#!/usr/bin/env bash
# ==============================================================================
# Presco — orquestrador de deploy (executado na SUA máquina).
#
#   npm run deploy            -> valida typecheck/bundle, sincroniza release e roda deploy/deploy.sh remoto
#   npm run deploy -- --no-sync  -> so reexecuta o deploy remoto
#
# Segredos vem de deploy/.env.deploy (gitignorado) e sao entregues ao servidor
# por stdin sobre SSH — nunca pela linha de comando (visivel em `ps`) nem pelo Git.
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT/deploy/config.sh"

SYNC=1
[ "${1:-}" = "--no-sync" ] && SYNC=0
BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || echo main)"

IS_STAGING_TARGET=0
if [ "$(basename "$REMOTE_TARGET_DIR")" = "staging" ] || [ "${PRESCO_ENV:-}" = "staging" ] || [ "${NODE_ENV:-}" = "development" ]; then
  IS_STAGING_TARGET=1
fi

DEPLOY_SERVER_HOST="${SERVER_HOST:-127.0.0.1}"
DEPLOY_PRESCO_APP_ROOT="${PRESCO_APP_ROOT:-$REMOTE_TARGET_DIR}"
DEPLOY_IMAGE_CACHE_DIR="${IMAGE_CACHE_DIR:-$REMOTE_TARGET_DIR/shared/.cache/images}"
DEPLOY_REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-}"
if [ -z "$DEPLOY_REDIS_KEY_PREFIX" ]; then
  if [ "$IS_STAGING_TARGET" = "1" ]; then
    DEPLOY_REDIS_KEY_PREFIX="staging:"
  else
    DEPLOY_REDIS_KEY_PREFIX="prod:"
  fi
fi

echo "================================================================================"
echo "[INFO] [Deploy] $SSH_USER@$SSH_HOST:$SSH_PORT -> $REMOTE_TARGET_DIR (branch $BRANCH)"
echo "================================================================================"

if [ "$SYNC" = "1" ]; then
  echo "[INFO] Validando tipagem e compilando bundle ESM do backend..."
  npm run --prefix "$ROOT/src/backend" typecheck
  npm run --prefix "$ROOT/src/backend" build:bundle

  for required_file in \
    "$ROOT/src/backend/dist/server.mjs" \
    "$ROOT/src/backend/dist/cli/migrate.mjs" \
    "$ROOT/src/backend/dist/cli/seed.mjs" \
    "$ROOT/src/backend/dist/cli/reallocateMarkets.mjs" \
    "$ROOT/src/backend/dist/cli/healthCheck.mjs" \
    "$ROOT/src/backend/dist/shared/database/drizzle/meta/_journal.json"; do
    if [ ! -f "$required_file" ]; then
      echo "[ERRO] Artefato esperado do bundle ausente: $required_file" >&2
      exit 1
    fi
  done

  echo "[INFO] Preparando diretorios no servidor remoto (umask 0002)..."
  remote_exec "umask 0002; mkdir -p '$REMOTE_TARGET_DIR/deploy' '$REMOTE_TARGET_DIR/shared/logs' '$REMOTE_TARGET_DIR/shared/.cache/images' '$REMOTE_TARGET_DIR/shared/backups' '$REMOTE_TARGET_DIR/releases' '$REMOTE_TARGET_DIR/.incoming-release/src/backend'"

  echo "[INFO] Sincronizando release enxuto do backend para .incoming-release/..."
  echo "   -> .incoming-release/src/backend/ (package.json, package-lock.json, dist/)"
  rsync -rlvz --omit-dir-times --no-perms --no-owner --no-group --delete \
    --rsync-path="umask 0002 && rsync" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/src/backend/package.json" \
    "$ROOT/src/backend/package-lock.json" \
    "$ROOT/src/backend/dist" \
    "$REMOTE:$REMOTE_TARGET_DIR/.incoming-release/src/backend/"

  echo "   -> deploy/{deploy.sh,self_heal.sh,logrotate.conf}"
  rsync -rlvz --omit-dir-times --no-perms --no-owner --no-group \
    --rsync-path="umask 0002 && rsync" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/deploy/deploy.sh" "$ROOT/deploy/self_heal.sh" "$ROOT/deploy/logrotate.conf" \
    "$REMOTE:$REMOTE_TARGET_DIR/deploy/"

  echo "   -> .incoming-ecosystem.config.cjs"
  rsync -rlvz --omit-dir-times --no-perms --no-owner --no-group \
    --rsync-path="umask 0002 && rsync" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/ecosystem.config.cjs" "$REMOTE:$REMOTE_TARGET_DIR/.incoming-ecosystem.config.cjs"
fi

echo "[INFO] Entregando segredos ao servidor (arquivo temporario 600, apagado apos uso)..."
{
  printf 'PROJECT_DIR=%q\n' "$REMOTE_TARGET_DIR"
  printf 'PRESCO_APP_ROOT=%q\n' "$DEPLOY_PRESCO_APP_ROOT"
  printf 'IMAGE_CACHE_DIR=%q\n' "$DEPLOY_IMAGE_CACHE_DIR"
  printf 'SERVER_HOST=%q\n' "$DEPLOY_SERVER_HOST"
  printf 'REDIS_KEY_PREFIX=%q\n' "$DEPLOY_REDIS_KEY_PREFIX"
  for k in DATABASE_URL DB_SCHEMA REDIS_URL JWT_SECRET HERE_API_KEY RESEND_API_KEY RESEND_FROM ALLOWED_ORIGINS \
           SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM \
           SERVER_PORT NODE_ENV PUBLIC_URL REWRITE_BASE APP_NAME PRESCO_ENV RUN_REALLOCATE CRON_OWNER; do
    v="${!k:-}"
    if [ -n "$v" ]; then
      printf '%s=%q\n' "$k" "$v"
    fi
  done
} | remote_exec "umask 077; mkdir -p '$REMOTE_TARGET_DIR/deploy'; cat > '$REMOTE_TARGET_DIR/deploy/.env.deploy'"

echo "[INFO] Executando deploy remoto..."
remote_exec "umask 0002; bash '$REMOTE_TARGET_DIR/deploy/deploy.sh'"

if [ -n "${PUBLIC_URL:-}" ]; then
  echo ""
  echo "[INFO] Healthcheck a partir da sua maquina: $PUBLIC_URL/health"
  curl -s -k --max-time 15 "$PUBLIC_URL/health" || echo "[AVISO] Sem resposta publica."
  echo ""
fi
echo "[OK] Deploy finalizado."
