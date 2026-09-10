#!/usr/bin/env bash
# Operações no servidor sem expor host/usuário/porta no repositório.
# Uso: bash scripts/remote.sh <status|logs|logs:stream|restart|crashlog|shell>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT/deploy/config.sh"

APP_NAME="${APP_NAME:-presco-backend}"

case "${1:-status}" in
  status)
    remote_exec "pm2 status $APP_NAME; curl -s --max-time 5 http://127.0.0.1:${SERVER_PORT:-3333}/health; echo"
    [ -n "${PUBLIC_URL:-}" ] && { echo "— público —"; curl -s -k --max-time 15 "$PUBLIC_URL/health"; echo; } ;;
  logs)        remote_exec "pm2 logs $APP_NAME --lines ${2:-60} --nostream" ;;
  logs:stream) remote_exec "pm2 logs $APP_NAME --lines ${2:-60}" ;;
  restart)     remote_exec "pm2 restart $APP_NAME --update-env" ;;
  crashlog)    remote_exec "cat '$REMOTE_TARGET_DIR/logs/crash.log' 2>/dev/null || cat '$REMOTE_TARGET_DIR/logs/backend-error.log' 2>/dev/null || echo 'sem logs de falha'" ;;
  shell)       ssh -t "${SSH_OPTS[@]}" "$REMOTE" "cd '$REMOTE_TARGET_DIR' && exec \$SHELL -l" ;;
  *) echo "Uso: bash scripts/remote.sh <status|logs|logs:stream|restart|crashlog|shell>"; exit 1 ;;
esac
