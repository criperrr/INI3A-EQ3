#!/usr/bin/env bash
# ==============================================================================
# Presco — Watchdog / Autocura e Rotacao de Logs (crontab no servidor remoto)
#
# Verifica a saude da API em 127.0.0.1:3333/health (e staging em 3334 se
# implantado). Usa locks por aplicacao em shared/deploy.lock (flock -n),
# fecha FDs de lock antes de invocar o PM2, diagnostica Postgres via pg_isready,
# exige 2 strikes consecutivos + cooldown de 180s para processos online e
# executa logrotate nativo apenas quando o socket do PM2 e gravavel.
# ==============================================================================
set -euo pipefail
umask 0002

if [ -d "$HOME/.nvm/versions/node" ]; then
  _NVM_NODE_BIN="$(ls -1d "$HOME/.nvm/versions/node/"*/bin 2>/dev/null | tail -n 1 || true)"
  [ -n "$_NVM_NODE_BIN" ] && export PATH="$_NVM_NODE_BIN:$PATH"
fi
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CRON_OWNER="${CRON_OWNER:-ra2457039}"

if [ -d "$PROJECT_DIR/shared" ]; then
  LOG_DIR="$PROJECT_DIR/shared/logs"
elif [ -d "$PROJECT_DIR/logs" ]; then
  LOG_DIR="$PROJECT_DIR/logs"
else
  LOG_DIR="$PROJECT_DIR/shared/logs"
fi
mkdir -p "$LOG_DIR" 2>/dev/null || true
chmod 2770 "$LOG_DIR" 2>/dev/null || true

LOG_FILE="$LOG_DIR/self-heal.log"
MAX_LOG_BYTES=524288

# Limite emergencial caso logrotate ainda nao tenha rodado
if [ -f "$LOG_FILE" ]; then
  LOG_SIZE="$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)"
  if [ "$LOG_SIZE" -gt "$MAX_LOG_BYTES" ]; then
    tail -n 500 "$LOG_FILE" > "${LOG_FILE}.tmp" 2>/dev/null || true
    mv -f "${LOG_FILE}.tmp" "$LOG_FILE" 2>/dev/null || true
  fi
fi

log_msg() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$LOG_FILE" 2>/dev/null || true
}

resolve_ecosystem_file() {
  local app_dir="$1"
  if [ -f "$app_dir/current/ecosystem.config.cjs" ]; then
    printf '%s\n' "$app_dir/current/ecosystem.config.cjs"
  elif [ -f "$app_dir/ecosystem.config.cjs" ]; then
    printf '%s\n' "$app_dir/ecosystem.config.cjs"
  fi
}

resolve_env_file() {
  local app_dir="$1"
  if [ -f "$app_dir/shared/.env" ]; then
    printf '%s\n' "$app_dir/shared/.env"
  elif [ -f "$app_dir/src/backend/.env" ]; then
    printf '%s\n' "$app_dir/src/backend/.env"
  fi
}

resolve_state_dir() {
  local app_dir="$1"
  if [ -d "$app_dir/shared" ]; then
    mkdir -p "$app_dir/shared/logs" 2>/dev/null || true
    printf '%s\n' "$app_dir/shared/logs"
  else
    mkdir -p "$app_dir/logs" 2>/dev/null || true
    printf '%s\n' "$app_dir/logs"
  fi
}

resolve_lock_file() {
  local app_dir="$1"
  local app_name="$2"
  if [ -d "$app_dir/shared" ]; then
    printf '%s\n' "$app_dir/shared/deploy.lock"
  else
    mkdir -p "$app_dir/logs" 2>/dev/null || true
    printf '%s\n' "$app_dir/logs/self-heal-${app_name}.lock"
  fi
}

read_env_value() {
  local env_file="$1"
  local key="$2"
  local line
  [ -f "$env_file" ] || return 0
  line="$(grep -E "^${key}=" "$env_file" 2>/dev/null | head -n 1 || true)"
  [ -n "$line" ] || return 0
  printf '%s\n' "${line#*=}" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

resolve_pg_host_port() {
  local env_file="$1"
  local db_url
  db_url="$(read_env_value "$env_file" "DATABASE_URL")"
  if [ -n "$db_url" ] && command -v node >/dev/null 2>&1; then
    node -e '
      try {
        const u = new URL(process.argv[1]);
        console.log((u.hostname || "127.0.0.1") + " " + (u.port || "54432"));
      } catch {
        console.log("127.0.0.1 54432");
      }
    ' "$db_url" 2>/dev/null || printf '127.0.0.1 54432\n'
  else
    printf '127.0.0.1 54432\n'
  fi
}

check_health() {
  local port="$1"
  local body
  body="$(curl -fsS --max-time 8 "http://127.0.0.1:${port}/health" 2>/dev/null || true)"
  printf '%s' "$body" | grep -q '"database":"connected"'
}

get_pm2_status() {
  local app_name="$1"
  local jlist
  jlist="$(pm2 jlist 9>&- 8>&- 2>/dev/null || true)"
  [ -n "$jlist" ] || { printf 'missing\n'; return 0; }
  if command -v node >/dev/null 2>&1; then
    node -e '
      const name = process.argv[1];
      let raw = "";
      process.stdin.on("data", (d) => raw += d);
      process.stdin.on("end", () => {
        try {
          const start = raw.indexOf("[");
          const end = raw.lastIndexOf("]");
          if (start === -1 || end === -1) return console.log("missing");
          const list = JSON.parse(raw.slice(start, end + 1));
          const proc = list.find((p) => p && p.name === name);
          console.log(proc && proc.pm2_env && proc.pm2_env.status ? proc.pm2_env.status : "missing");
        } catch {
          console.log("missing");
        }
      });
    ' "$app_name" <<< "$jlist" 2>/dev/null || printf 'missing\n'
  else
    if pm2 describe "$app_name" 9>&- 8>&- >/dev/null 2>&1; then
      printf 'online\n'
    else
      printf 'missing\n'
    fi
  fi
}

RECOVERED_ANY=0

recover_app() {
  local app_name="$1"
  local app_dir="$2"
  local default_port="$3"
  local is_staging="$4"

  local eco_file env_file state_dir lock_file port
  eco_file="$(resolve_ecosystem_file "$app_dir")"
  env_file="$(resolve_env_file "$app_dir")"
  [ -n "$eco_file" ] && [ -n "$env_file" ] || return 0

  port="$(read_env_value "$env_file" "SERVER_PORT")"
  port="${port:-$default_port}"

  state_dir="$(resolve_state_dir "$app_dir")"
  lock_file="$(resolve_lock_file "$app_dir" "$app_name")"

  local strike_file="$state_dir/.self_heal_${app_name}.strikes"
  local cooldown_file="$state_dir/.self_heal_${app_name}.last_restart"

  {
    chmod 0660 "$lock_file" 2>/dev/null || true
    if ! flock -n 9; then
      log_msg "[INFO] ${app_name}: deploy ou verificacao em andamento (lock ocupado); pulando."
      return 0
    fi

    # Fast path
    if check_health "$port"; then
      rm -f "$strike_file"
      return 0
    fi

    if ! command -v pm2 >/dev/null 2>&1; then
      log_msg "[ERRO] pm2 nao encontrado no PATH ($PATH)."
      return 1
    fi

    local -a env_args=("PRESCO_APP_ROOT=$app_dir")
    if [ "$is_staging" = "1" ]; then
      env_args+=("PRESCO_ENV=staging")
    fi

    local pm2_status
    pm2_status="$(get_pm2_status "$app_name")"

    if [ "$pm2_status" != "online" ] && [ "$pm2_status" != "launching" ]; then
      rm -f "$strike_file"
      log_msg "[AVISO] ${app_name} (porta ${port}, status=${pm2_status}) fora do ar. Iniciando recuperacao imediata..."

      if [ "$pm2_status" = "missing" ]; then
        pm2 resurrect 9>&- 8>&- >> "$LOG_FILE" 2>&1 || true
        pm2_status="$(get_pm2_status "$app_name")"
        if [ "$pm2_status" != "online" ] && [ "$pm2_status" != "launching" ]; then
          (cd "$app_dir" && env "${env_args[@]}" pm2 start "$eco_file" --update-env 9>&- 8>&-) >> "$LOG_FILE" 2>&1 || true
        fi
      else
        (
          cd "$app_dir"
          env "${env_args[@]}" pm2 restart "$app_name" --update-env 9>&- 8>&- || \
            env "${env_args[@]}" pm2 start "$eco_file" --update-env 9>&- 8>&-
        ) >> "$LOG_FILE" 2>&1 || true
      fi

      date +%s > "$cooldown_file" 2>/dev/null || true

      for _ in $(seq 1 15); do
        sleep 1
        if check_health "$port"; then
          RECOVERED_ANY=1
          log_msg "[OK] ${app_name} recuperado com sucesso na porta ${port}."
          return 0
        fi
      done

      log_msg "[ERRO] ${app_name} permaneceu indisponivel apos tentativa de recuperacao."
      return 1
    fi

    # Processo esta online/launching, mas /health falhou -> checar Postgres antes de reiniciar
    local pg_host pg_port
    if [ -n "${PG_HOST:-}" ] && [ -n "${PG_PORT:-}" ]; then
      pg_host="$PG_HOST"
      pg_port="$PG_PORT"
    else
      read -r pg_host pg_port <<< "$(resolve_pg_host_port "$env_file")"
      pg_host="${PG_HOST:-$pg_host}"
      pg_port="${PG_PORT:-$pg_port}"
    fi

    if command -v pg_isready >/dev/null 2>&1; then
      if ! pg_isready -h "$pg_host" -p "$pg_port" -t 3 >/dev/null 2>&1; then
        log_msg "[AVISO] ${app_name} online mas PostgreSQL (${pg_host}:${pg_port}) indisponivel; evitando restart."
        rm -f "$strike_file"
        return 1
      fi
    fi

    local prev_strikes=0 strikes=1
    if [ -f "$strike_file" ]; then
      prev_strikes="$(cat "$strike_file" 2>/dev/null || echo 0)"
      [[ "$prev_strikes" =~ ^[0-9]+$ ]] || prev_strikes=0
    fi
    strikes=$((prev_strikes + 1))
    printf '%s\n' "$strikes" > "$strike_file"

    if [ "$strikes" -lt 2 ]; then
      log_msg "[AVISO] ${app_name} online mas /health falhou com PostgreSQL ativo (strike ${strikes}/2); aguardando proximo ciclo."
      return 1
    fi

    local now last_restart=0 elapsed
    now="$(date +%s)"
    if [ -f "$cooldown_file" ]; then
      last_restart="$(cat "$cooldown_file" 2>/dev/null || echo 0)"
      [[ "$last_restart" =~ ^[0-9]+$ ]] || last_restart=0
    fi
    elapsed=$((now - last_restart))
    if [ "$elapsed" -lt 180 ]; then
      log_msg "[AVISO] ${app_name} atingiu ${strikes} strikes, mas esta em cooldown (${elapsed}s/180s); aguardando."
      return 1
    fi

    printf '%s\n' "$now" > "$cooldown_file"
    rm -f "$strike_file"
    log_msg "[AVISO] ${app_name} falhou ${strikes} verificacoes consecutivas com PostgreSQL ativo. Recarregando..."

    (
      cd "$app_dir"
      env "${env_args[@]}" pm2 reload "$eco_file" --update-env 9>&- 8>&- || \
        env "${env_args[@]}" pm2 restart "$app_name" --update-env 9>&- 8>&-
    ) >> "$LOG_FILE" 2>&1 || true

    for _ in $(seq 1 15); do
      sleep 1
      if check_health "$port"; then
        RECOVERED_ANY=1
        log_msg "[OK] ${app_name} recuperado com sucesso na porta ${port}."
        return 0
      fi
    done

    log_msg "[ERRO] ${app_name} permaneceu indisponivel apos reload/restart."
    return 1
  } 9>>"$lock_file"
}

save_pm2_if_all_online() {
  local prod_dir="$1"
  local pm2_lock_file="$prod_dir/shared/pm2.lock"
  [ -d "$prod_dir/shared" ] || pm2_lock_file="$prod_dir/logs/self-heal-pm2.lock"

  local -a expected=()
  if [ -n "$(resolve_ecosystem_file "$prod_dir")" ] && [ -n "$(resolve_env_file "$prod_dir")" ]; then
    expected+=("presco-backend")
  fi
  if [ -n "$(resolve_ecosystem_file "$prod_dir/staging")" ] && [ -n "$(resolve_env_file "$prod_dir/staging")" ]; then
    expected+=("presco-backend-dev")
  fi
  [ "${#expected[@]}" -gt 0 ] || return 0

  {
    chmod 0660 "$pm2_lock_file" 2>/dev/null || true
    if ! flock -w 10 8; then
      return 0
    fi
    local jlist all_ok
    jlist="$(pm2 jlist 8>&- 9>&- 2>/dev/null || true)"
    [ -n "$jlist" ] || return 0
    if command -v node >/dev/null 2>&1; then
      all_ok="$(node -e '
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
      ' "${expected[@]}" <<< "$jlist" 2>/dev/null || echo "0")"
      if [ "$all_ok" = "1" ]; then
        pm2 save 8>&- 9>&- >> "$LOG_FILE" 2>&1 || true
      fi
    fi
  } 8>>"$pm2_lock_file"
}

EXIT_CODE=0

if [ -n "$(resolve_ecosystem_file "$PROJECT_DIR")" ] && [ -n "$(resolve_env_file "$PROJECT_DIR")" ]; then
  recover_app "presco-backend" "$PROJECT_DIR" "3333" "0" || EXIT_CODE=1
fi

STAGING_DIR="$PROJECT_DIR/staging"
if [ -n "$(resolve_ecosystem_file "$STAGING_DIR")" ] && [ -n "$(resolve_env_file "$STAGING_DIR")" ]; then
  recover_app "presco-backend-dev" "$STAGING_DIR" "3334" "1" || EXIT_CODE=1
fi

if [ "$RECOVERED_ANY" = "1" ] && [ "$EXIT_CODE" = "0" ] && command -v pm2 >/dev/null 2>&1; then
  save_pm2_if_all_online "$PROJECT_DIR"
fi

PM2_DIR="${PM2_HOME:-$HOME/.pm2}"
PM2_SOCK="$PM2_DIR/rpc.sock"
LOGROTATE_BIN="/usr/sbin/logrotate"
if [ ! -x "$LOGROTATE_BIN" ]; then
  LOGROTATE_BIN="$(command -v logrotate 2>/dev/null || true)"
fi
if [ -n "$LOGROTATE_BIN" ] && [ -x "$LOGROTATE_BIN" ] && [ -f "$PROJECT_DIR/deploy/logrotate.conf" ] && [ -S "$PM2_SOCK" ] && [ -w "$PM2_SOCK" ]; then
  "$LOGROTATE_BIN" -s "$PM2_DIR/logrotate.state" "$PROJECT_DIR/deploy/logrotate.conf" >> "$LOG_FILE" 2>&1 || true
fi

exit "$EXIT_CODE"
