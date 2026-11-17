#!/usr/bin/env bash
# ==============================================================================
# Presco — Deploy do backend (executado NO SERVIDOR remoto)
#
# Layout ancorado em $APP_ROOT (/var/www/equipes/26-presco ou .../staging):
#   .htaccess         (prod apenas)
#   README.md         (prod apenas)
#   deploy/           (deploy.sh, self_heal.sh, logrotate.conf)
#   shared/           (.env 0600, logs/ 0700, .cache/images/ 0700, backups/ 0700, locks)
#   releases/<ts-pid>/
#   current -> releases/<ts-pid>
#
# Obrigatorias : DATABASE_URL, JWT_SECRET
# Opcionais    : REDIS_URL, REDIS_KEY_PREFIX, DB_SCHEMA, HERE_API_KEY,
#                RESEND_API_KEY, RESEND_FROM, ALLOWED_ORIGINS, SERVER_PORT,
#                SERVER_HOST, PROJECT_DIR, PRESCO_APP_ROOT, IMAGE_CACHE_DIR,
#                PUBLIC_URL, REWRITE_BASE, APP_NAME, PRESCO_ENV,
#                RUN_REALLOCATE, CRON_OWNER
# ==============================================================================
set -euo pipefail
umask 0077

if [ -d "$HOME/.nvm/versions/node" ]; then
  _NVM_NODE_BIN="$(ls -1d "$HOME/.nvm/versions/node/"*/bin 2>/dev/null | tail -n 1 || true)"
  [ -n "$_NVM_NODE_BIN" ] && export PATH="$_NVM_NODE_BIN:$PATH"
fi
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SECRETS_FILE="${SECRETS_FILE:-$PROJECT_DIR/deploy/.env.deploy}"

cleanup_on_exit() {
  rm -f "${SECRETS_FILE:-}"
  if [ "${IS_NEW_RELEASE:-0}" = "1" ] && [ -n "${RELEASE_DIR:-}" ] && [ -d "${RELEASE_DIR:-}" ]; then
    local active_target=""
    if [ -L "${CURRENT_LINK:-}" ] || [ -e "${CURRENT_LINK:-}" ]; then
      active_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
    fi
    if [ "$active_target" != "$RELEASE_DIR" ]; then
      rm -rf "$RELEASE_DIR" 2>/dev/null || true
    fi
  fi
}
trap cleanup_on_exit EXIT

if [ -f "$SECRETS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  set +a
  rm -f "$SECRETS_FILE"
fi

APP_ROOT="${PRESCO_APP_ROOT:-$PROJECT_DIR}"
PROJECT_DIR="$APP_ROOT"
SHARED_DIR="$APP_ROOT/shared"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
LOG_DIR="${LOG_DIR:-$SHARED_DIR/logs}"
CACHE_DIR="${IMAGE_CACHE_DIR:-$SHARED_DIR/.cache/images}"
BACKUPS_DIR="$SHARED_DIR/backups"

IS_STAGING=0
if [ "$(basename "$APP_ROOT")" = "staging" ] || [ "${PRESCO_ENV:-}" = "staging" ] || [ "${NODE_ENV:-}" = "development" ]; then
  IS_STAGING=1
fi

if [ "$IS_STAGING" = "1" ]; then
  SERVER_PORT="${SERVER_PORT:-3334}"
  APP_NAME="${APP_NAME:-presco-backend-dev}"
  NODE_ENV="${NODE_ENV:-development}"
  PRESCO_ENV="staging"
  DB_SCHEMA="${DB_SCHEMA:-staging}"
  REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-staging:}"
else
  SERVER_PORT="${SERVER_PORT:-3333}"
  APP_NAME="${APP_NAME:-presco-backend}"
  NODE_ENV="${NODE_ENV:-production}"
  PRESCO_ENV="${PRESCO_ENV:-production}"
  DB_SCHEMA="${DB_SCHEMA:-}"
  REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-prod:}"
fi

SERVER_HOST="${SERVER_HOST:-127.0.0.1}"
PUBLIC_URL="${PUBLIC_URL:-}"
IMAGE_CACHE_DIR="$CACHE_DIR"
PRESCO_APP_ROOT="$APP_ROOT"

if [ -n "${DB_SCHEMA:-}" ] && [ "$DB_SCHEMA" != "public" ]; then
  TARGET_SCHEMA="$DB_SCHEMA"
  MIGRATIONS_SCHEMA="drizzle_${DB_SCHEMA}"
else
  TARGET_SCHEMA="public"
  MIGRATIONS_SCHEMA="drizzle"
fi

mkdir -p "$APP_ROOT/deploy" "$SHARED_DIR" "$LOG_DIR" "$CACHE_DIR" "$BACKUPS_DIR" "$RELEASES_DIR"
chmod 0700 "$APP_ROOT/deploy" "$SHARED_DIR" "$LOG_DIR" "$SHARED_DIR/.cache" "$CACHE_DIR" "$BACKUPS_DIR" "$RELEASES_DIR" 2>/dev/null || true
touch "$SHARED_DIR/deploy.lock" "$SHARED_DIR/pm2.lock" 2>/dev/null || true
chmod 0600 "$SHARED_DIR/deploy.lock" "$SHARED_DIR/pm2.lock" 2>/dev/null || true
chmod 0700 "$APP_ROOT/deploy/deploy.sh" "$APP_ROOT/deploy/self_heal.sh" 2>/dev/null || true
chmod 0600 "$APP_ROOT/deploy/logrotate.conf" 2>/dev/null || true

if [ "$IS_STAGING" = "1" ] && [ -d "$(dirname "$APP_ROOT")/shared" ] && [ -w "$(dirname "$APP_ROOT")/shared" ]; then
  PROD_ROOT="$(dirname "$APP_ROOT")"
  PM2_LOCK_FILE="$PROD_ROOT/shared/pm2.lock"
  touch "$PM2_LOCK_FILE" 2>/dev/null || true
  chmod 0600 "$PM2_LOCK_FILE" 2>/dev/null || true
else
  PROD_ROOT="$APP_ROOT"
  PM2_LOCK_FILE="$SHARED_DIR/pm2.lock"
fi

exec > >(tee -a "$LOG_DIR/deploy.log") 2>&1
chmod 0600 "$LOG_DIR/deploy.log" 2>/dev/null || true

exec 9>>"$SHARED_DIR/deploy.lock"
if ! flock -w 120 9; then
  echo "[ERRO] Nao foi possivel obter deploy.lock em $SHARED_DIR/deploy.lock (timeout 120s)." >&2
  exit 1
fi

with_pm2_lock() {
  (
    umask 0077
    exec 8>>"$PM2_LOCK_FILE"
    chmod 0600 "$PM2_LOCK_FILE" 2>/dev/null || true
    flock -w 60 8
    "$@" 8>&- 9>&-
  )
}

echo "================================================================================"
echo "[INFO] [Deploy] Backend Presco ($APP_NAME) — $(date +"%Y-%m-%d %H:%M:%S")"
echo "[INFO] [Layout] APP_ROOT=$APP_ROOT | SCHEMA=$TARGET_SCHEMA | PREFIX=$REDIS_KEY_PREFIX"
echo "================================================================================"

: "${DATABASE_URL:?DATABASE_URL nao definida (configure o secret)}"
: "${JWT_SECRET:?JWT_SECRET nao definida (configure o secret)}"

cd "$APP_ROOT"

# 1. Proxy reverso do Apache e README (apenas na raiz de producao)
if [ "$IS_STAGING" = "0" ]; then
  if [ -w "$APP_ROOT/.htaccess" ] || [ ! -e "$APP_ROOT/.htaccess" ]; then
    echo "[INFO] [Apache] Configurando .htaccess endurecido de proxy reverso..."
    {
      cat <<'HTACCESS_HEAD'
<FilesMatch "(^\.env|\.log$|\.sh$|\.php[0-9]?$|\.phtml$|\.phar$)">
    Require all denied
</FilesMatch>

<IfModule mod_rewrite.c>
    RewriteEngine On
HTACCESS_HEAD
      printf '    RewriteBase %s\n' "${REWRITE_BASE:-/}"
      cat <<'HTACCESS_MID'

    RewriteRule ^(\.env|deploy(/|$)|logs(/|$)|shared(/|$)|releases(/|$)|src(/|$)|ecosystem\.config\.cjs$|staging/(deploy|logs|shared|releases|src)(/|$)) - [F,L]

    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    <IfModule mod_headers.c>
        RequestHeader set X-Forwarded-Proto https
        RequestHeader set X-Forwarded-Port 443
        RequestHeader unset x-bypass-rate-limit
        RequestHeader unset x-k6-test-secret
    </IfModule>

    RewriteRule ^staging/(.*)$ http://127.0.0.1:3334/$1 [P,L]
    RewriteRule ^staging$ http://127.0.0.1:3334/ [P,L]
HTACCESS_MID
      printf '    RewriteRule ^(.*)$ http://127.0.0.1:%s/$1 [P,L]\n' "${SERVER_PORT}"
      cat <<'HTACCESS_TAIL'
</IfModule>

Options -Indexes
HTACCESS_TAIL
    } > "$APP_ROOT/.htaccess"
    chmod 0640 "$APP_ROOT/.htaccess" 2>/dev/null || true
    if command -v setfacl >/dev/null 2>&1; then
      setfacl -m u:www-data:r--,g::---,o::--- "$APP_ROOT/.htaccess" 2>/dev/null || true
    fi
  else
    echo "[INFO] [Apache] .htaccess sem permissao de escrita; preservando arquivo atual."
  fi

  if [ -w "$APP_ROOT/README.md" ] || [ ! -e "$APP_ROOT/README.md" ]; then
    cat > "$APP_ROOT/README.md" <<'README_EOF'
# Presco Backend

Ambiente exclusivo da API REST do **Presco** (INI3A-EQ3).

- **Repositorio oficial e documentacao:** [github.com/criperrr/INI3A-EQ3](https://github.com/criperrr/INI3A-EQ3)
- **Gerenciador de Processos:** PM2
- **Proxy Reverso:** Apache (`.htaccess`)
- **Healthcheck:** `GET /health`

---
*Nota: Este diretorio armazena exclusivamente os arquivos essenciais de execucao da API Node.js/Express, migracoes Drizzle ORM e conexao com PostgreSQL/Redis.*
README_EOF
    chmod 0644 "$APP_ROOT/README.md" 2>/dev/null || true
    echo "[OK] README.md gerado como unico documento do servidor."
  fi
fi

# 2. Escrita atomica de shared/.env (0600 em subshell isolado)
echo "[INFO] [Config] Gravando $SHARED_DIR/.env (modo 0600)..."
(
  umask 077
  ENV_TMP="$SHARED_DIR/.env.tmp.$$"
  {
    echo "# Gerado por deploy/deploy.sh em $(date -Iseconds). NAO versionar."
    echo "DATABASE_URL=$DATABASE_URL"
    [ -n "${DB_SCHEMA:-}" ]        && echo "DB_SCHEMA=$DB_SCHEMA"
    [ -n "${REDIS_URL:-}" ]        && echo "REDIS_URL=$REDIS_URL"
    [ -n "${REDIS_KEY_PREFIX:-}" ] && echo "REDIS_KEY_PREFIX=$REDIS_KEY_PREFIX"
    echo "SERVER_PORT=$SERVER_PORT"
    echo "SERVER_HOST=$SERVER_HOST"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "NODE_ENV=$NODE_ENV"
    echo "PRESCO_ENV=$PRESCO_ENV"
    echo "PRESCO_APP_ROOT=$APP_ROOT"
    echo "LOG_DIR=$LOG_DIR"
    echo "IMAGE_CACHE_DIR=$IMAGE_CACHE_DIR"
    [ -n "${HERE_API_KEY:-}" ]     && echo "HERE_API_KEY=$HERE_API_KEY"
    [ -n "${RESEND_API_KEY:-}" ]   && echo "RESEND_API_KEY=$RESEND_API_KEY"
    [ -n "${RESEND_FROM:-}" ]      && echo "RESEND_FROM=$RESEND_FROM"
    [ -n "${SMTP_HOST:-}" ]        && echo "SMTP_HOST=$SMTP_HOST"
    [ -n "${SMTP_PORT:-}" ]        && echo "SMTP_PORT=$SMTP_PORT"
    [ -n "${SMTP_SECURE:-}" ]      && echo "SMTP_SECURE=$SMTP_SECURE"
    [ -n "${SMTP_USER:-}" ]        && echo "SMTP_USER=$SMTP_USER"
    [ -n "${SMTP_PASS:-}" ]        && echo "SMTP_PASS=$SMTP_PASS"
    [ -n "${SMTP_FROM:-}" ]        && echo "SMTP_FROM=$SMTP_FROM"
    [ -n "${ALLOWED_ORIGINS:-}" ]  && echo "ALLOWED_ORIGINS=$ALLOWED_ORIGINS"
  } > "$ENV_TMP"
  chmod 0600 "$ENV_TMP"
  mv -f "$ENV_TMP" "$SHARED_DIR/.env"
)
echo "[OK] shared/.env gravado (modo 0600, $(wc -l < "$SHARED_DIR/.env") linhas)."

# 3. Preparar release em releases/<timestamp>-<pid>/
IS_NEW_RELEASE=0
if [ -f "$APP_ROOT/.incoming-release/src/backend/dist/server.mjs" ]; then
  IS_NEW_RELEASE=1
  RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-$$"
  RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
  mv "$APP_ROOT/.incoming-release" "$RELEASE_DIR"
  if [ -f "$APP_ROOT/.incoming-ecosystem.config.cjs" ]; then
    mv "$APP_ROOT/.incoming-ecosystem.config.cjs" "$RELEASE_DIR/ecosystem.config.cjs"
  elif [ -f "$CURRENT_LINK/ecosystem.config.cjs" ]; then
    cp -f "$CURRENT_LINK/ecosystem.config.cjs" "$RELEASE_DIR/ecosystem.config.cjs"
  elif [ -f "$APP_ROOT/ecosystem.config.cjs" ]; then
    cp -f "$APP_ROOT/ecosystem.config.cjs" "$RELEASE_DIR/ecosystem.config.cjs"
  fi
  chmod -R u+rwX,go-rwx "$RELEASE_DIR" 2>/dev/null || true
elif [ -L "$CURRENT_LINK" ] && [ -f "$CURRENT_LINK/src/backend/dist/server.mjs" ]; then
  RELEASE_DIR="$(readlink -f "$CURRENT_LINK")"
  if [ -f "$APP_ROOT/.incoming-ecosystem.config.cjs" ]; then
    mv "$APP_ROOT/.incoming-ecosystem.config.cjs" "$RELEASE_DIR/ecosystem.config.cjs"
  fi
else
  echo "[ERRO] Nenhuma release recebida em .incoming-release e nenhum symlink current valido encontrado." >&2
  exit 1
fi

RELEASE_BACKEND_DIR="$RELEASE_DIR/src/backend"
ln -sfn "$SHARED_DIR/.env" "$RELEASE_BACKEND_DIR/.env"

if [ ! -f "$RELEASE_DIR/ecosystem.config.cjs" ]; then
  echo "[ERRO] ecosystem.config.cjs ausente na release $RELEASE_DIR." >&2
  exit 1
fi

cd "$RELEASE_BACKEND_DIR"
if [ "$IS_NEW_RELEASE" = "1" ] || [ ! -d "$RELEASE_BACKEND_DIR/node_modules" ]; then
  echo "[INFO] [NPM] Instalando dependencias de runtime (npm ci --omit=dev --include=optional)..."
  npm ci --omit=dev --include=optional --no-audit --fund=false
fi

# 4. Pre-swap smoke check (antes de tocar no banco ou no PM2)
echo "[INFO] [Smoke] Validando bundle ESM, CLI, sharp nativo e conectividade..."
for req_artifact in \
  "$RELEASE_BACKEND_DIR/dist/server.mjs" \
  "$RELEASE_BACKEND_DIR/dist/cli/migrate.mjs" \
  "$RELEASE_BACKEND_DIR/dist/cli/seed.mjs" \
  "$RELEASE_BACKEND_DIR/dist/cli/healthCheck.mjs" \
  "$RELEASE_BACKEND_DIR/dist/shared/database/drizzle/meta/_journal.json"; do
  if [ ! -f "$req_artifact" ]; then
    echo "[ERRO] [Smoke] Artefato obrigatorio ausente: $req_artifact" >&2
    exit 1
  fi
done

node --check "$RELEASE_BACKEND_DIR/dist/server.mjs"
node --check "$RELEASE_BACKEND_DIR/dist/cli/migrate.mjs"
node -e 'import("sharp").then(async ({default:s}) => { const b = await s({create:{width:2,height:2,channels:3,background:{r:0,g:0,b:0}}}).webp().toBuffer(); if (!b.length) process.exit(1); }).catch((e) => { console.error(e); process.exit(1); })'
node "$RELEASE_BACKEND_DIR/dist/cli/healthCheck.mjs"
echo "[OK] [Smoke] Verificacao pre-swap aprovada."

# 5. Inspecao de migracoes pendentes, backup pg_dump pre-migracao e DDL fail-fast
SCHEMA_EXISTS=0
MIGRATIONS_SCHEMA_EXISTS=0
PENDING_COUNT=0
DESTRUCTIVE_DDL=0
DESTRUCTIVE_SUMMARY=""

INSPECT_OUTPUT="$(
  DATABASE_URL="$DATABASE_URL" \
  TARGET_SCHEMA="$TARGET_SCHEMA" \
  MIGRATIONS_SCHEMA="$MIGRATIONS_SCHEMA" \
  JOURNAL_PATH="$RELEASE_BACKEND_DIR/dist/shared/database/drizzle/meta/_journal.json" \
  SQL_DIR="$RELEASE_BACKEND_DIR/dist/shared/database/drizzle" \
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const { Client } = require("pg");

    function stripSqlComments(sql) {
      return sql
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/--[^\r\n]*/g, " ");
    }

    function detectDestructive(sqlText) {
      const reasons = [];
      const cleaned = stripSqlComments(sqlText);
      const stmts = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        if (/\bDROP\b/i.test(stmt)) reasons.push("DROP");
        if (/\bRENAME\b/i.test(stmt)) reasons.push("RENAME");
        if (/\bTRUNCATE\b/i.test(stmt)) reasons.push("TRUNCATE");
        if (/\bALTER\s+COLUMN\b/i.test(stmt)) reasons.push("ALTER COLUMN");
        if (/\bSET\s+NOT\s+NULL\b/i.test(stmt)) reasons.push("SET NOT NULL");
        if (/\bCREATE\s+UNIQUE\s+INDEX\b/i.test(stmt)) reasons.push("CREATE UNIQUE INDEX");
        if (/\bALTER\s+TABLE\b/i.test(stmt)) {
          const clauses = stmt.split(",");
          for (const clause of clauses) {
            if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) {
              reasons.push("NOT NULL without DEFAULT");
            }
          }
        }
      }
      return Array.from(new Set(reasons));
    }

    async function main() {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        const targetSchema = process.env.TARGET_SCHEMA;
        const migrationsSchema = process.env.MIGRATIONS_SCHEMA;
        const schemaRes = await client.query(
          "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
          [targetSchema]
        );
        const schemaExists = schemaRes.rowCount > 0;

        const migSchemaRes = await client.query(
          "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
          [migrationsSchema]
        );
        const migSchemaExists = migSchemaRes.rowCount > 0;

        let lastCreatedAt = null;
        if (migSchemaExists) {
          const tblRes = await client.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2",
            [migrationsSchema, "__drizzle_migrations"]
          );
          if (tblRes.rowCount > 0) {
            const lastRes = await client.query(
              `SELECT created_at FROM "${migrationsSchema}"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1`
            );
            if (lastRes.rows[0]) {
              lastCreatedAt = Number(lastRes.rows[0].created_at);
            }
          }
        }

        const journal = JSON.parse(fs.readFileSync(process.env.JOURNAL_PATH, "utf8"));
        const entries = Array.isArray(journal.entries) ? journal.entries : [];
        const pending = entries.filter((e) => lastCreatedAt === null || Number(e.when) > lastCreatedAt);

        const allReasons = new Set();
        for (const entry of pending) {
          const sqlFile = path.join(process.env.SQL_DIR, `${entry.tag}.sql`);
          if (fs.existsSync(sqlFile)) {
            const sqlText = fs.readFileSync(sqlFile, "utf8");
            for (const r of detectDestructive(sqlText)) {
              allReasons.add(`${entry.tag}:${r}`);
            }
          }
        }

        console.log(`SCHEMA_EXISTS=${schemaExists ? 1 : 0}`);
        console.log(`MIGRATIONS_SCHEMA_EXISTS=${migSchemaExists ? 1 : 0}`);
        console.log(`PENDING_COUNT=${pending.length}`);
        console.log(`DESTRUCTIVE_DDL=${allReasons.size > 0 ? 1 : 0}`);
        console.log(`DESTRUCTIVE_SUMMARY=${Array.from(allReasons).join(", ").replace(/[\r\n]/g, " ")}`);
      } finally {
        await client.end();
      }
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  '
)"

while IFS='=' read -r k v; do
  case "$k" in
    SCHEMA_EXISTS) SCHEMA_EXISTS="$v" ;;
    MIGRATIONS_SCHEMA_EXISTS) MIGRATIONS_SCHEMA_EXISTS="$v" ;;
    PENDING_COUNT) PENDING_COUNT="$v" ;;
    DESTRUCTIVE_DDL) DESTRUCTIVE_DDL="$v" ;;
    DESTRUCTIVE_SUMMARY) DESTRUCTIVE_SUMMARY="$v" ;;
  esac
done <<< "$INSPECT_OUTPUT"

echo "[INFO] [Database] Schema '$TARGET_SCHEMA' (existe=$SCHEMA_EXISTS), migracoes pendentes=$PENDING_COUNT, DDL destrutivo=$DESTRUCTIVE_DDL"

BACKUP_FILE=""
if [ "$PENDING_COUNT" -gt 0 ] && [ "$SCHEMA_EXISTS" = "1" ]; then
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "[ERRO] [Backup] pg_dump nao encontrado no PATH; abortando antes de aplicar migracoes." >&2
    exit 1
  fi
  BACKUP_FILE="$BACKUPS_DIR/pre-migrate-$(date -u +%Y%m%d%H%M%S)-$$.dump"
  BACKUP_TMP="${BACKUP_FILE}.tmp.$$"
  echo "[INFO] [Backup] Executando pg_dump pre-migracao para $BACKUP_FILE..."
  (
    umask 077
    DATABASE_URL="$DATABASE_URL" \
    TARGET_SCHEMA="$TARGET_SCHEMA" \
    MIGRATIONS_SCHEMA="$MIGRATIONS_SCHEMA" \
    MIGRATIONS_SCHEMA_EXISTS="$MIGRATIONS_SCHEMA_EXISTS" \
    BACKUP_TMP="$BACKUP_TMP" \
    node -e '
      const { spawnSync } = require("node:child_process");
      const u = new URL(process.env.DATABASE_URL);
      const targetSchema = process.env.TARGET_SCHEMA;
      const migrationsSchema = process.env.MIGRATIONS_SCHEMA;
      const includeMigSchema = process.env.MIGRATIONS_SCHEMA_EXISTS === "1";
      const outFile = process.env.BACKUP_TMP;
      const pgDatabase = decodeURIComponent(u.pathname.replace(/^\//, ""));
      const env = {
        ...process.env,
        PGHOST: u.hostname,
        PGPORT: u.port || "5432",
        PGUSER: decodeURIComponent(u.username),
        PGPASSWORD: decodeURIComponent(u.password),
        PGDATABASE: pgDatabase,
      };
      const sslmode = u.searchParams.get("sslmode");
      if (sslmode) env.PGSSLMODE = sslmode;
      const args = [
        "--format=custom",
        "--compress=6",
        "--no-owner",
        "--no-acl",
        "--schema=" + targetSchema,
      ];
      if (includeMigSchema && migrationsSchema) {
        args.push("--schema=" + migrationsSchema);
      }
      args.push("--exclude-table=" + targetSchema + ".spatial_ref_sys");
      args.push("--file=" + outFile);
      args.push(pgDatabase);
      const res = spawnSync("pg_dump", args, { env, stdio: "inherit" });
      process.exit(res.status ?? 1);
    '
    chmod 0600 "$BACKUP_TMP"
    mv -f "$BACKUP_TMP" "$BACKUP_FILE"
  ) || {
    rm -f "$BACKUP_TMP"
    echo "[ERRO] [Backup] Falha ao gerar pg_dump pre-migracao." >&2
    exit 1
  }
  ls -1t "$BACKUPS_DIR"/pre-migrate-*.dump 2>/dev/null | tail -n +6 | xargs -r rm -f --
  echo "[OK] [Backup] Backup pre-migracao salvo com sucesso (retencao: 5)."
fi

MIGRATION_RAN_THIS_DEPLOY=0
echo "[INFO] [Database] Aplicando migracoes Drizzle (fail-fast)..."
node "$RELEASE_BACKEND_DIR/dist/cli/migrate.mjs"
if [ "$PENDING_COUNT" -gt 0 ]; then
  MIGRATION_RAN_THIS_DEPLOY=1
fi

echo "[INFO] [Database] Executando seed idempotente..."
node "$RELEASE_BACKEND_DIR/dist/cli/seed.mjs"

if [ "${RUN_REALLOCATE:-0}" = "1" ]; then
  echo "[INFO] [Database] Executando realocacao de mercados (RUN_REALLOCATE=1)..."
  node "$RELEASE_BACKEND_DIR/dist/cli/reallocateMarkets.mjs"
else
  echo "[INFO] [Database] Realocacao de mercados ignorada (defina RUN_REALLOCATE=1 para executar)."
fi

# 6. Troca atomica do symlink current + Start/Reload PM2
PREV_RELEASE=""
if [ -e "$CURRENT_LINK" ] || [ -L "$CURRENT_LINK" ]; then
  PREV_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
fi

if [ "$IS_NEW_RELEASE" = "1" ] || [ "$PREV_RELEASE" != "$RELEASE_DIR" ]; then
  echo "[INFO] [Release] Ativando release $RELEASE_DIR via symlink atomico current..."
  ln -s "$RELEASE_DIR" "$APP_ROOT/.current.tmp.$$"
  mv -Tf "$APP_ROOT/.current.tmp.$$" "$CURRENT_LINK"
fi

start_or_reload_pm2() {
  local eco_path="$CURRENT_LINK/ecosystem.config.cjs"
  local expected_script="$CURRENT_LINK/src/backend/dist/server.mjs"
  local jlist action
  jlist="$(with_pm2_lock pm2 jlist 2>/dev/null || true)"
  action="$(SERVER_HOST="$SERVER_HOST" SERVER_PORT="$SERVER_PORT" node -e '
    const name = process.argv[1];
    const expectedScript = process.argv[2];
    let raw = "";
    process.stdin.on("data", (d) => raw += d);
    process.stdin.on("end", () => {
      try {
        const s = raw.indexOf("[");
        const e = raw.lastIndexOf("]");
        if (s === -1 || e === -1) return console.log("start");
        const list = JSON.parse(raw.slice(s, e + 1));
        const proc = list.find((p) => p && p.name === name);
        if (!proc) return console.log("start");
        const mode = proc.pm2_env && proc.pm2_env.exec_mode;
        const execPath = proc.pm2_env && proc.pm2_env.pm_exec_path;
        const status = proc.pm2_env && proc.pm2_env.status;
        const prevHost = (proc.pm2_env && proc.pm2_env.SERVER_HOST) || "";
        const prevPort = String((proc.pm2_env && proc.pm2_env.SERVER_PORT) || "");
        const nextHost = process.env.SERVER_HOST || "127.0.0.1";
        const nextPort = String(process.env.SERVER_PORT || "3333");
        if (mode !== "cluster_mode" || execPath !== expectedScript || prevHost !== nextHost || prevPort !== nextPort) {
          return console.log("recreate");
        }
        if (status === "online") {
          return console.log("reload");
        }
        return console.log("restart");
      } catch {
        console.log("start");
      }
    });
  ' "$APP_NAME" "$expected_script" <<< "$jlist" 2>/dev/null || echo "start")"

  echo "[INFO] [PM2] Acao para $APP_NAME: $action"
  case "$action" in
    reload)
      (cd "$APP_ROOT" && with_pm2_lock env PRESCO_APP_ROOT="$APP_ROOT" PRESCO_ENV="$PRESCO_ENV" SERVER_PORT="$SERVER_PORT" SERVER_HOST="$SERVER_HOST" pm2 reload "$eco_path" --update-env)
      ;;
    recreate)
      with_pm2_lock pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
      (cd "$APP_ROOT" && with_pm2_lock env PRESCO_APP_ROOT="$APP_ROOT" PRESCO_ENV="$PRESCO_ENV" SERVER_PORT="$SERVER_PORT" SERVER_HOST="$SERVER_HOST" pm2 start "$eco_path" --update-env)
      ;;
    *)
      (cd "$APP_ROOT" && with_pm2_lock env PRESCO_APP_ROOT="$APP_ROOT" PRESCO_ENV="$PRESCO_ENV" SERVER_PORT="$SERVER_PORT" SERVER_HOST="$SERVER_HOST" pm2 start "$eco_path" --update-env)
      ;;
  esac
}

echo "[INFO] [PM2] Aplicando configuracao para $APP_NAME..."
cd "$APP_ROOT"
start_or_reload_pm2

# 7. Healthcheck local + Gate de Rollback Seguro
echo "[INFO] [HealthCheck] Aguardando 127.0.0.1:$SERVER_PORT/health..."
HEALTHY=0
for i in $(seq 1 25); do
  sleep 1
  BODY="$(curl -fsS --max-time 5 "http://127.0.0.1:$SERVER_PORT/health" 2>/dev/null || true)"
  if printf '%s' "$BODY" | grep -q '"database":"connected"'; then
    echo "[OK] [HealthCheck] OK -> $BODY"
    HEALTHY=1
    break
  fi
  echo "   tentativa $i/25..."
done

if [ "$HEALTHY" != "1" ]; then
  echo "[ERRO] [HealthCheck] Backend nao respondeu de forma saudavel."
  with_pm2_lock pm2 logs "$APP_NAME" --lines 30 --nostream || true

  if [ "$MIGRATION_RAN_THIS_DEPLOY" = "1" ] && [ "$DESTRUCTIVE_DDL" = "1" ]; then
    echo "[ERRO] [Rollback] Auto-rollback RECUSADO (Case C): DDL destrutivo aplicado ($DESTRUCTIVE_SUMMARY)."
    echo "[ERRO] [Rollback] Execute recuperacao manual:"
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
      echo "  pg_restore --clean --if-exists --no-owner --no-acl -d \"\$DATABASE_URL\" \"$BACKUP_FILE\""
    else
      echo "  pg_restore --clean --if-exists --no-owner --no-acl -d \"\$DATABASE_URL\" \"$BACKUPS_DIR/<backup>.dump\""
    fi
    if [ -n "$PREV_RELEASE" ] && [ -d "$PREV_RELEASE" ]; then
      echo "  ln -sfn \"$PREV_RELEASE\" \"$CURRENT_LINK\" && pm2 reload \"$CURRENT_LINK/ecosystem.config.cjs\" --update-env"
    fi
    exit 1
  fi

  if [ -n "$PREV_RELEASE" ] && [ -d "$PREV_RELEASE" ] && [ "$PREV_RELEASE" != "$RELEASE_DIR" ]; then
    echo "[AVISO] [Rollback] Caso A/B (sem DDL destrutivo). Revertendo current -> $PREV_RELEASE..."
    ln -s "$PREV_RELEASE" "$APP_ROOT/.current.tmp.$$"
    mv -Tf "$APP_ROOT/.current.tmp.$$" "$CURRENT_LINK"
    start_or_reload_pm2 || true
    echo "[ERRO] [Rollback] Rollback concluido para $PREV_RELEASE. Deploy falhou."
  else
    echo "[ERRO] [Rollback] Nenhuma release anterior disponivel para reversao automatica."
  fi
  exit 1
fi

# 8. pm2 save apenas apos /health verde e todos os apps esperados online
EXPECTED_APPS=()
if [ "$IS_STAGING" = "0" ] || [ -f "$PROD_ROOT/current/ecosystem.config.cjs" ] || [ -f "$PROD_ROOT/ecosystem.config.cjs" ]; then
  EXPECTED_APPS+=("presco-backend")
fi
if [ "$IS_STAGING" = "1" ] || [ -f "$PROD_ROOT/staging/current/ecosystem.config.cjs" ] || [ -f "$PROD_ROOT/staging/ecosystem.config.cjs" ]; then
  EXPECTED_APPS+=("presco-backend-dev")
fi

JLIST_SAVE="$(with_pm2_lock pm2 jlist 2>/dev/null || true)"
ALL_ONLINE="$(node -e '
  const expected = process.argv.slice(1);
  let raw = "";
  process.stdin.on("data", (d) => raw += d);
  process.stdin.on("end", () => {
    try {
      const s = raw.indexOf("[");
      const e = raw.lastIndexOf("]");
      if (s === -1 || e === -1) return console.log("0");
      const list = JSON.parse(raw.slice(s, e + 1));
      const ok = expected.length > 0 && expected.every((name) => {
        const p = list.find((item) => item && item.name === name);
        return p && p.pm2_env && p.pm2_env.status === "online";
      });
      console.log(ok ? "1" : "0");
    } catch {
      console.log("0");
    }
  });
' "${EXPECTED_APPS[@]}" <<< "$JLIST_SAVE" 2>/dev/null || echo "0")"

if [ "$ALL_ONLINE" = "1" ]; then
  echo "[INFO] [PM2] Todos os apps esperados (${EXPECTED_APPS[*]}) online. Executando pm2 save..."
  with_pm2_lock pm2 save
else
  echo "[AVISO] [PM2] Nem todos os apps esperados (${EXPECTED_APPS[*]}) estao online; pulando pm2 save."
fi

# 9. Retencao de releases (manter 3 mais recentes, nunca podando o target de current) e higienizacao
ACTIVE_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
SEEN_RELEASES=0
while IFS= read -r rel_dir; do
  [ -n "$rel_dir" ] || continue
  SEEN_RELEASES=$((SEEN_RELEASES + 1))
  if [ "$SEEN_RELEASES" -le 3 ]; then
    continue
  fi
  REL_REAL="$(readlink -f "$rel_dir" 2>/dev/null || printf '%s' "$rel_dir")"
  if [ -n "$ACTIVE_RELEASE" ] && [ "$REL_REAL" = "$ACTIVE_RELEASE" ]; then
    continue
  fi
  echo "[INFO] [Cleanup] Removendo release antiga: $rel_dir"
  rm -rf "$rel_dir"
done < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -r)

echo "[INFO] [Sanitize] Higienizando diretorio raiz de $APP_ROOT..."
rm -rf "$APP_ROOT/.agents" \
       "$APP_ROOT/.github" \
       "$APP_ROOT/docs" \
       "$APP_ROOT/gestao" \
       "$APP_ROOT/sprints" \
       "$APP_ROOT/scripts" \
       "$APP_ROOT/tests" \
       "$APP_ROOT/.turbo" \
       "$APP_ROOT/.idea" \
       "$APP_ROOT/.vscode" \
       "$APP_ROOT/src" \
       "$APP_ROOT/node_modules" \
       "$APP_ROOT/_expo" \
       "$APP_ROOT/assets" \
       "$APP_ROOT/.pm2" \
       "$APP_ROOT/.incoming-release" 2>/dev/null || true

rm -f "$APP_ROOT/docker-compose.yml" \
      "$APP_ROOT/turbo.json" \
      "$APP_ROOT/eas.json" \
      "$APP_ROOT/skills-lock.json" \
      "$APP_ROOT/.gitignore" \
      "$APP_ROOT/package.json" \
      "$APP_ROOT/package-lock.json" \
      "$APP_ROOT/ecosystem.config.cjs" \
      "$APP_ROOT/.incoming-ecosystem.config.cjs" \
      "$APP_ROOT/index.html" \
      "$APP_ROOT/metadata.json" \
      "$APP_ROOT"/setup.* \
      "$APP_ROOT"/start* 2>/dev/null || true

if [ "$IS_STAGING" = "0" ]; then
  find "$APP_ROOT" \
    \( -path "$APP_ROOT/staging" -o -path "$APP_ROOT/releases" -o -path "$APP_ROOT/shared" -o -path "$APP_ROOT/current" \) -prune -o \
    -type f -iname "*.md" ! -path "$APP_ROOT/README.md" -delete 2>/dev/null || true
else
  find "$APP_ROOT" \
    \( -path "$APP_ROOT/releases" -o -path "$APP_ROOT/shared" -o -path "$APP_ROOT/current" \) -prune -o \
    -type f -iname "*.md" -delete 2>/dev/null || true
  rm -f "$APP_ROOT/.htaccess" 2>/dev/null || true
fi

# 10. Crontab de autocura + logrotate (apenas no deploy de producao e como CRON_OWNER)
CURRENT_USER="$(id -un 2>/dev/null || printf '%s' "${USER:-}")"
CRON_OWNER="${CRON_OWNER:-ra2457039}"
if [ "$IS_STAGING" = "0" ] && [ -f "$APP_ROOT/deploy/self_heal.sh" ]; then
  chmod 0700 "$APP_ROOT/deploy/self_heal.sh" 2>/dev/null || true
  if [ "$CURRENT_USER" = "$CRON_OWNER" ] && command -v crontab >/dev/null 2>&1; then
    echo "[INFO] [Cron] Registrando autocura no crontab de $CURRENT_USER..."
    SELF_HEAL_CMD="bash $APP_ROOT/deploy/self_heal.sh >/dev/null 2>&1"
    EXISTING_CRON="$(crontab -l 2>/dev/null || true)"
    FILTERED_CRON="$(printf '%s\n' "$EXISTING_CRON" | grep -v "127.0.0.1:3333/health" | grep -v "self_heal.sh" || true)"
    {
      [ -n "$FILTERED_CRON" ] && printf '%s\n' "$FILTERED_CRON"
      printf '@reboot %s\n' "$SELF_HEAL_CMD"
      printf '*/2 * * * * %s\n' "$SELF_HEAL_CMD"
    } | crontab -
    echo "[OK] [Cron] Autocura configurada (@reboot e */2 * * * *)."
  else
    echo "[INFO] [Cron] Registro ignorado (usuario atual: ${CURRENT_USER:-desconhecido}; esperado: $CRON_OWNER)."
  fi
fi

# 11. Healthcheck publico
if [ -n "$PUBLIC_URL" ]; then
  echo "[INFO] [HealthCheck] Endpoint publico: $(curl -s -k -o /dev/null -w '%{http_code}' "$PUBLIC_URL/health" || echo fail)"
fi

echo "================================================================================"
echo "[OK] [Deploy] Concluido em $(date +"%Y-%m-%d %H:%M:%S")"
echo "[INFO] Release ativa: $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "$RELEASE_DIR")"
echo "[INFO] Logs: $LOG_DIR/{backend-out.log,backend-error.log,crash.log,deploy.log,self-heal.log}"
echo "================================================================================"
