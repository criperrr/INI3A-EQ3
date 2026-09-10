#!/usr/bin/env bash
# ==============================================================================
# Presco — orquestrador de deploy (executado na SUA máquina).
#
#   npm run deploy            → sincroniza o código e roda deploy/deploy.sh remoto
#   npm run deploy -- --no-sync  → só reexecuta o deploy remoto
#
# Segredos vêm de deploy/.env.deploy (gitignorado) e são entregues ao servidor
# por stdin sobre SSH — nunca pela linha de comando (visível em `ps`) nem pelo Git.
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT/deploy/config.sh"

SYNC=1
[ "${1:-}" = "--no-sync" ] && SYNC=0
BRANCH="$(git -C "$ROOT" branch --show-current || echo main)"

echo "================================================================================"
echo "🚀 [Deploy] $SSH_USER@$SSH_HOST:$SSH_PORT → $REMOTE_TARGET_DIR (branch $BRANCH)"
echo "================================================================================"

if [ "$SYNC" = "1" ]; then
  echo "📤 Sincronizando a árvore de trabalho via rsync (node_modules e .env preservados)..."
  rsync -rlvz --omit-dir-times --no-perms --no-owner --no-group \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.env' --exclude='.env.*' \
    --exclude='deploy/.env.deploy' \
    --exclude='logs/' \
    --exclude='.turbo/' --exclude='.dev/' \
    --exclude='src/frontend/' \
    --exclude='.idea/' --exclude='.vscode/' \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/" "$REMOTE:$REMOTE_TARGET_DIR/"
fi

echo "🔐 Entregando segredos ao servidor (arquivo temporário 600, apagado após uso)..."
{
  printf 'PROJECT_DIR=%s\n' "$REMOTE_TARGET_DIR"
  for k in DATABASE_URL REDIS_URL JWT_SECRET HERE_API_KEY ALLOWED_ORIGINS \
           SERVER_PORT SERVER_HOST NODE_ENV PUBLIC_URL REWRITE_BASE; do
    v="${!k:-}"
    if [ -n "$v" ]; then printf '%s=%s\n' "$k" "$v"; fi
  done
} | remote_exec "umask 077; mkdir -p '$REMOTE_TARGET_DIR/deploy'; cat > '$REMOTE_TARGET_DIR/deploy/.env.deploy'"

echo "⚡ Executando deploy remoto..."
remote_exec "bash '$REMOTE_TARGET_DIR/deploy/deploy.sh'"

if [ -n "${PUBLIC_URL:-}" ]; then
  echo ""
  echo "🔍 Healthcheck a partir da sua máquina: $PUBLIC_URL/health"
  curl -s -k --max-time 15 "$PUBLIC_URL/health" || echo "⚠️  Sem resposta pública."
  echo ""
fi
echo "🎉 Deploy finalizado."
