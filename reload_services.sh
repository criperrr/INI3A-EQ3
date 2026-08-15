#!/usr/bin/env bash

# ==============================================================================
# reload_services.sh - Auto-reconnect & Service Restarter for INI3A-EQ3 (Presco)
#
# Usage:
#   ./reload_services.sh          # Auto-check & revive any down services
#   ./reload_services.sh --restart # Force restart PostgreSQL & Redis
#   ./reload_services.sh --status  # Check status only (no changes)
#   ./reload_services.sh --migrate # Run migrations after connection check
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:-auto}"

echo -e "${BOLD}${CYAN}🔄 [Presco Services Manager]${NC} Action: ${BOLD}${ACTION}${NC}\n"

# ------------------------------------------------------------------------------
# 1. Helper Functions
# ------------------------------------------------------------------------------

is_pg_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -q -h localhost -p 5432
    return $?
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost 5432
    return $?
  fi
  return 1
}

is_redis_ready() {
  if command -v redis-cli >/dev/null 2>&1; then
    local res
    res=$(redis-cli ping 2>/dev/null || echo "")
    [ "$res" = "PONG" ]
    return $?
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost 6379
    return $?
  fi
  return 1
}

detect_pg_brew_service() {
  if command -v brew >/dev/null 2>&1; then
    for s in postgresql@18 postgresql@17 postgresql@16 postgresql@15 postgresql; do
      if brew services list 2>/dev/null | grep -q "$s"; then
        echo "$s"
        return 0
      fi
    done
  fi
  echo "postgresql@18"
}

restart_pg() {
  echo -e "${YELLOW}⚡ Restarting PostgreSQL service...${NC}"
  if command -v brew >/dev/null 2>&1; then
    local pg_svc
    pg_svc=$(detect_pg_brew_service)
    brew services restart "$pg_svc" || brew services start "$pg_svc"
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl restart postgresql || sudo service postgresql restart
  else
    echo -e "${RED}⚠️ No service manager found (brew/systemctl). Please restart PostgreSQL manually.${NC}"
  fi
}

restart_redis() {
  echo -e "${YELLOW}⚡ Restarting Redis service...${NC}"
  if command -v brew >/dev/null 2>&1; then
    brew services restart redis || brew services start redis
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl restart redis-server || sudo service redis restart
  else
    echo -e "${RED}⚠️ No service manager found (brew/systemctl). Please restart Redis manually.${NC}"
  fi
}

wait_for_services() {
  local max_attempts=20
  local attempt=1

  echo -ne "${CYAN}⏳ Waiting for PostgreSQL on port 5432...${NC}"
  while ! is_pg_ready; do
    if [ $attempt -ge $max_attempts ]; then
      echo -e " ${RED}Timeout!${NC}"
      echo -e "${RED}❌ PostgreSQL is still not accepting connections.${NC}"
      break
    fi
    sleep 1
    ((attempt++))
    echo -ne "."
  done
  if is_pg_ready; then
    echo -e " ${GREEN}OK!${NC}"
  fi

  attempt=1
  echo -ne "${CYAN}⏳ Waiting for Redis on port 6379...${NC}"
  while ! is_redis_ready; do
    if [ $attempt -ge $max_attempts ]; then
      echo -e " ${RED}Timeout!${NC}"
      echo -e "${RED}❌ Redis is still not accepting connections.${NC}"
      break
    fi
    sleep 1
    ((attempt++))
    echo -ne "."
  done
  if is_redis_ready; then
    echo -e " ${GREEN}OK!${NC}"
  fi
}

show_status() {
  echo -e "${BOLD}📊 Services Status:${NC}"
  if is_pg_ready; then
    echo -e "  ✅ PostgreSQL (Port 5432): ${GREEN}RUNNING & ACCEPTING CONNECTIONS${NC}"
  else
    echo -e "  ❌ PostgreSQL (Port 5432): ${RED}NOT RESPONDING${NC}"
  fi

  if is_redis_ready; then
    echo -e "  ✅ Redis (Port 6379):      ${GREEN}RUNNING & PONG${NC}"
  else
    echo -e "  ❌ Redis (Port 6379):      ${RED}NOT RESPONDING${NC}"
  fi

  if nc -z localhost 3333 2>/dev/null; then
    echo -e "  ✅ Backend (Port 3333):    ${GREEN}ONLINE${NC}"
    if command -v curl >/dev/null 2>&1; then
      local health_resp
      health_resp=$(curl -s http://localhost:3333/health 2>/dev/null || echo "")
      if [ -n "$health_resp" ]; then
        echo -e "     ↳ Health API: ${CYAN}$health_resp${NC}"
      fi
    fi
  else
    echo -e "  ⚠️ Backend (Port 3333):    ${YELLOW}OFFLINE / IDLE${NC}"
  fi
}

# ------------------------------------------------------------------------------
# 2. Main Logic Execution
# ------------------------------------------------------------------------------

case "$ACTION" in
  --status|status|-s)
    show_status
    exit 0
    ;;

  --restart|restart|-r)
    restart_pg
    restart_redis
    wait_for_services
    ;;

  --migrate|migrate|-m)
    if ! is_pg_ready; then
      restart_pg
      wait_for_services
    fi
    echo -e "\n${CYAN}📦 Running Drizzle migrations...${NC}"
    (cd "$SCRIPT_DIR/src/backend" && npm run db:migrate)
    ;;

  *) # auto
    pg_ok=true
    redis_ok=true

    if ! is_pg_ready; then
      echo -e "${YELLOW}⚠️ PostgreSQL is not responding.${NC}"
      pg_ok=false
      restart_pg
    fi

    if ! is_redis_ready; then
      echo -e "${YELLOW}⚠️ Redis is not responding.${NC}"
      redis_ok=false
      restart_redis
    fi

    if [ "$pg_ok" = false ] || [ "$redis_ok" = false ]; then
      wait_for_services
    else
      echo -e "${GREEN}✅ Both PostgreSQL and Redis are active!${NC}"
    fi
    ;;
esac

# ------------------------------------------------------------------------------
# 3. Connection Verification & Tmux Notification
# ------------------------------------------------------------------------------

echo -e "\n${BOLD}🔍 Running Connection Verification...${NC}"
(cd "$SCRIPT_DIR/src/backend" && npm run db:check)

# If tmux dev session is running, notify or nudge backend
if command -v tmux >/dev/null 2>&1 && tmux has-session -t dev 2>/dev/null; then
  echo -e "\n${CYAN}ℹ️ Tmux session 'dev' detected. Re-syncing backend...${NC}"
  touch "$SCRIPT_DIR/src/backend/src/server.ts"
  echo -e "${GREEN}✅ Backend trigger sent.${NC}"
fi

echo -e "\n${BOLD}${GREEN}✨ Done! Database and Redis are ready.${NC}\n"
