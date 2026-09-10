#!/usr/bin/env bash
# ==============================================================================
# Presco — Deploy do backend (executado NO SERVIDOR remoto)
#
# Este script NÃO contém segredos. Toda a configuração sensível chega por
# variáveis de ambiente, tipicamente via `deploy/.env.deploy` enviado pelo
# `scripts/deploy_remote.sh` ou pelos GitHub Actions Secrets.
#
# Obrigatórias : DATABASE_URL, JWT_SECRET
# Opcionais    : REDIS_URL, HERE_API_KEY, ALLOWED_ORIGINS, SERVER_PORT,
#                SERVER_HOST, PROJECT_DIR, PUBLIC_URL, DEPLOY_PULL=1
# ==============================================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKEND_DIR="$PROJECT_DIR/src/backend"
LOG_DIR="$PROJECT_DIR/logs"
SERVER_PORT="${SERVER_PORT:-3333}"
SERVER_HOST="${SERVER_HOST:-0.0.0.0}"
PUBLIC_URL="${PUBLIC_URL:-}"
APP_NAME="${APP_NAME:-presco-backend}"

# Carrega o arquivo de segredos entregue pelo orquestrador, se existir.
SECRETS_FILE="${SECRETS_FILE:-$PROJECT_DIR/deploy/.env.deploy}"
if [ -f "$SECRETS_FILE" ]; then
  set -a; . "$SECRETS_FILE"; set +a
  rm -f "$SECRETS_FILE"
fi

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/deploy.log") 2>&1

echo "================================================================================"
echo "🚀 [Deploy] Backend Presco — $(date +"%Y-%m-%d %H:%M:%S")"
echo "================================================================================"

: "${DATABASE_URL:?DATABASE_URL não definida (configure o secret)}"
: "${JWT_SECRET:?JWT_SECRET não definida (configure o secret)}"

cd "$PROJECT_DIR"

# 1. Atualização opcional do código a partir do Git
if [ "${DEPLOY_PULL:-0}" = "1" ] || [ "${1:-}" = "--pull" ]; then
  BRANCH="$(git branch --show-current 2>/dev/null || echo main)"
  echo "📥 [Git] Atualizando branch $BRANCH..."
  git pull --ff-only origin "$BRANCH" || echo "⚠️  [Git] Pull ignorado; seguindo com a cópia local."
fi

# 2. Proxy reverso do Apache (público → 127.0.0.1:PORT)
if [ ! -f "$PROJECT_DIR/.htaccess" ]; then
  echo "⚙️  [Apache] Criando .htaccess de proxy reverso..."
  cat > "$PROJECT_DIR/.htaccess" <<HTACCESS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase ${REWRITE_BASE:-/}

    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    <IfModule mod_headers.c>
        RequestHeader set X-Forwarded-Proto https
        RequestHeader set X-Forwarded-Port 443
    </IfModule>

    RewriteRule ^(.*)\$ http://127.0.0.1:${SERVER_PORT}/\$1 [P,L]
</IfModule>

Options -Indexes
HTACCESS
  chmod 644 "$PROJECT_DIR/.htaccess"
fi

# 3. .env do backend gerado a partir do ambiente (nunca versionado)
echo "🔒 [Config] Regravando $BACKEND_DIR/.env a partir dos segredos injetados..."
mkdir -p "$BACKEND_DIR"
umask 077
{
  echo "# Gerado por deploy/deploy.sh em $(date -Iseconds). NÃO versionar."
  echo "DATABASE_URL=$DATABASE_URL"
  [ -n "${REDIS_URL:-}" ]        && echo "REDIS_URL=$REDIS_URL"
  echo "SERVER_PORT=$SERVER_PORT"
  echo "SERVER_HOST=$SERVER_HOST"
  echo "JWT_SECRET=$JWT_SECRET"
  echo "NODE_ENV=${NODE_ENV:-production}"
  echo "LOG_DIR=$LOG_DIR"
  [ -n "${HERE_API_KEY:-}" ]     && echo "HERE_API_KEY=$HERE_API_KEY"
  [ -n "${ALLOWED_ORIGINS:-}" ]  && echo "ALLOWED_ORIGINS=$ALLOWED_ORIGINS"
} > "$BACKEND_DIR/.env"
chmod 600 "$BACKEND_DIR/.env"
echo "✓ .env escrito (modo 600, $(wc -l < "$BACKEND_DIR/.env") linhas)."

# 4. Dependências
echo "📦 [NPM] Instalando dependências do backend..."
cd "$BACKEND_DIR"
npm install --omit=optional --no-audit --fund=false

# 5. Migrações + seed (idempotentes)
echo "🗄️  [Database] Migrações Drizzle..."
npm run db:migrate || echo "⚠️  [Database] Aviso nas migrações; continuando."
echo "🌱 [Database] Seed idempotente..."
npm run db:seed || echo "⚠️  [Database] Aviso no seed; continuando."

# 6. PM2
echo "⚡ [PM2] Reiniciando $APP_NAME..."
cd "$PROJECT_DIR"

# `pm2 startOrRestart` NÃO troca o exec_mode de um processo já registrado: se o
# ecosystem passou a pedir fork e o processo vivo está em cluster, ele continua
# em cluster (e no cluster o stdout do tsx some, deixando os logs zerados).
# Detectamos a divergência e recriamos o processo.
DESIRED_MODE="$(grep -oE 'exec_mode:[[:space:]]*"[a-z_]+"' "$PROJECT_DIR/ecosystem.config.cjs" | grep -oE '"[a-z_]+"' | tr -d '"' || true)"
DESIRED_MODE="${DESIRED_MODE:-fork}"
CURRENT_MODE="$(pm2 jlist 2>/dev/null | node -e '
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    try {
      const app = JSON.parse(raw).find((a) => a.name === process.argv[1]);
      process.stdout.write(app ? String(app.pm2_env.exec_mode || "") : "");
    } catch { process.stdout.write(""); }
  });
' "$APP_NAME" || true)"

if [ -n "$CURRENT_MODE" ] && [ "$CURRENT_MODE" != "${DESIRED_MODE}_mode" ]; then
  echo "♻️  [PM2] exec_mode diverge (atual: $CURRENT_MODE, desejado: ${DESIRED_MODE}_mode). Recriando o processo..."
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
fi

pm2 startOrRestart "$PROJECT_DIR/ecosystem.config.cjs" --update-env
pm2 save || true

# 7. Healthcheck local
echo "🔍 [HealthCheck] Aguardando 127.0.0.1:$SERVER_PORT/health..."
for i in $(seq 1 25); do
  sleep 1
  BODY="$(curl -s --max-time 5 "http://127.0.0.1:$SERVER_PORT/health" || true)"
  if echo "$BODY" | grep -q '"database":"connected"'; then
    echo "✅ [HealthCheck] OK → $BODY"
    HEALTHY=1
    break
  fi
  echo "   tentativa $i/25..."
done

if [ "${HEALTHY:-0}" != "1" ]; then
  echo "❌ [HealthCheck] Backend não respondeu de forma saudável."
  pm2 logs "$APP_NAME" --lines 30 --nostream || true
  exit 1
fi

# 8. Healthcheck público
if [ -n "$PUBLIC_URL" ]; then
  echo "🌐 [HealthCheck] Endpoint público: $(curl -s -k -o /dev/null -w '%{http_code}' "$PUBLIC_URL/health" || echo fail)"
fi

echo "================================================================================"
echo "🎉 [Deploy] Concluído em $(date +"%Y-%m-%d %H:%M:%S")"
echo "📜 Logs: $LOG_DIR/{backend-out.log,backend-error.log,crash.log}"
echo "================================================================================"
