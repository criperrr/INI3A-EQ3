#!/bin/bash

# ==============================================================================
# start_project.sh - Presco Dev Environment Launcher
#
# Modes:
#   1. Tunneling Mode (Default):
#      Uses localtunnel for school or networks with client isolation.
#      Usage: ./start_project.sh
#
#   2. 100% Local NAT Mode (--local-nat):
#      Direct local network connection. Zero tunnel latency, maximum stability
#      and instant QR code scanning via Expo Go on the same Wi-Fi.
#      Usage: ./start_project.sh --local-nat
# ==============================================================================

# ------------------------------------------------------------------------------
# 0. Parse Command Line Arguments
# ------------------------------------------------------------------------------
LOCAL_NAT_MODE=false

for arg in "$@"; do
  case "$arg" in
    --local-nat|--local|--nat|-l)
      LOCAL_NAT_MODE=true
      shift
      ;;
    --tunnel|-t)
      LOCAL_NAT_MODE=false
      shift
      ;;
    --help|-h)
      echo "Presco Dev Launcher"
      echo ""
      echo "Usage:"
      echo "  ./start_project.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local-nat, --local, --nat, -l   Run in 100% Local Network (NAT) mode (fastest for home/LAN)"
      echo "  --tunnel, -t                      Run in Tunneling mode via localtunnel (default, for school networks)"
      echo "  --help, -h                        Show this help message"
      echo ""
      echo "NPM Shortcuts:"
      echo "  npm run dev          -> Default tunneling mode"
      echo "  npm run dev:local    -> 100% Local NAT mode"
      exit 0
      ;;
  esac
done

echo "========================================================"
if [ "$LOCAL_NAT_MODE" = true ]; then
  echo "⚡ MODE: 100% LOCAL NETWORK (NAT) - Direct Home LAN"
else
  echo "🌐 MODE: TUNNELING (Localtunnel) - School / Restricted"
fi
echo "========================================================"

echo "🔍 Verifying connections..."

# Parse backend config from src/backend/.env if available
read -r DB_HOST DB_PORT REDIS_HOST REDIS_PORT SERVER_PORT <<< $(node -e '
const fs = require("fs");
let env = {};
try {
  const content = fs.readFileSync("./src/backend/.env", "utf8");
  content.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("\x27") && val.endsWith("\x27"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
} catch(e) {}

const parseUrl = (u, defaultHost, defaultPort) => {
  try {
    if (!u) return { host: defaultHost, port: defaultPort };
    const cleanUrl = u.replace(/^postgresql:\/\//, "postgres://");
    const parsed = new URL(cleanUrl);
    return { host: parsed.hostname || defaultHost, port: parsed.port || defaultPort };
  } catch (e) {
    return { host: defaultHost, port: defaultPort };
  }
};

const redis = parseUrl(env.REDIS_URL, "localhost", 6379);
const db = parseUrl(env.DATABASE_URL, "localhost", 5432);
const serverPort = env.SERVER_PORT || "3333";

console.log(`${db.host} ${db.port} ${redis.host} ${redis.port} ${serverPort}`);
' 2>/dev/null)

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
SERVER_PORT=${SERVER_PORT:-3333}

# Function to check port
check_port() {
  local host=$1
  local port=$2
  local name=$3
  local max_attempts=30
  local attempt=1
  
  echo -n "Waiting for $name on $host:$port..."
  while ! nc -z "$host" "$port" 2>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
      echo " Timeout!"
      echo "❌ $name is not running on $host:$port."
      exit 1
    fi
    sleep 1
    ((attempt++))
    echo -n "."
  done
  echo " OK!"
}

# 1. Verify Database (PostgreSQL) and Redis
check_port "$DB_HOST" "$DB_PORT" "PostgreSQL"
if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
  echo "✅ Redis on $REDIS_HOST:$REDIS_PORT: OK!"
else
  echo "⚠️ Redis is offline on $REDIS_HOST:$REDIS_PORT. Backend will run in In-Memory fallback mode."
fi

# 2. Setup tmux session for background services
echo "Setting up tmux dashboard..."
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "dashboard"

# Pane 0 (Left): Backend Server with maximum logs
tmux send-keys -t dev:dashboard.0 "cd ./src/backend && DEBUG=* NODE_ENV=development npm run dev" C-m

# 3. Wait for backend to be ready
check_port "localhost" "$SERVER_PORT" "Backend Server"

# 4. Detect Local LAN IP (cross-platform: Linux, macOS, POSIX)
detect_lan_ip() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
  fi
  if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  if [ -z "$ip" ] && command -v ipconfig >/dev/null 2>&1; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr wlan0 2>/dev/null)
  fi
  if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
    ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
  fi
  echo "${ip:-localhost}"
}

LAN_IP=$(detect_lan_ip)
echo "📍 Detected LAN IP: $LAN_IP"

# 5. Configure Network Routing & Start Frontend
tmux split-window -h -p 50 -t dev:dashboard.0

if [ "$LOCAL_NAT_MODE" = true ]; then
  # ----------------------------------------------------------------------------
  # LOCAL NAT MODE: Direct LAN IP, no localtunnel
  # ----------------------------------------------------------------------------
  BACKEND_URL="http://${LAN_IP}:${SERVER_PORT}"
  
  echo "🚀 Direct Backend API URL: $BACKEND_URL"
  echo "📱 Expo Bundler will serve over LAN directly (exp://$LAN_IP:8081)"
  echo "📲 Open Expo Go on your mobile device (connected to the same Wi-Fi) and scan the QR code!"

  # Start Expo with LAN host and custom packager hostname
  tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL REACT_NATIVE_PACKAGER_HOSTNAME=$LAN_IP npm run start -- --lan --clear" C-m

else
  # ----------------------------------------------------------------------------
  # TUNNELING MODE: Start localtunnel for backend & frontend
  # ----------------------------------------------------------------------------
  echo "Starting tunnels for backend and frontend..."
  rm -f /tmp/backend_tunnel.log /tmp/frontend_tunnel.log
  tmux new-window -t dev -n "tunnel"
  tmux send-keys -t dev:tunnel "npx --yes localtunnel --port $SERVER_PORT --subdomain ini3a-eq3-api > /tmp/backend_tunnel.log & npx --yes localtunnel --port 8081 --subdomain ini3a-eq3-app > /tmp/frontend_tunnel.log & wait" C-m

  # Wait for tunnel URLs
  echo -n "Waiting for tunnel URLs..."
  attempt=1
  while ! grep -q "your url is:" /tmp/backend_tunnel.log 2>/dev/null || ! grep -q "your url is:" /tmp/frontend_tunnel.log 2>/dev/null; do
    if [ $attempt -ge 15 ]; then
      echo " Timeout!"
      echo "⚠️ Tunnel took too long. Falling back to local LAN IP: http://$LAN_IP:$SERVER_PORT"
      break
    fi
    sleep 1
    ((attempt++))
    echo -n "."
  done
  echo ""

  BACKEND_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.loca\.lt" /tmp/backend_tunnel.log | head -n 1)
  if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL="http://$LAN_IP:$SERVER_PORT"
  fi
  FRONTEND_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.loca\.lt" /tmp/frontend_tunnel.log | head -n 1)

  echo "✅ Backend API URL: $BACKEND_URL"
  if [ -n "$FRONTEND_URL" ]; then
    echo "✅ Frontend Tunnel URL: $FRONTEND_URL"
  fi

  # Start Expo configured for tunnel proxy
  tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL EXPO_PACKAGER_PROXY_URL=$FRONTEND_URL EXPO_DEBUG=true npm run start -- --clear" C-m
fi

# Select the frontend pane so the user can immediately see the QR code and interact with Expo
tmux select-window -t dev:dashboard
tmux select-pane -t dev:dashboard.1

# 6. Attach to tmux session to view all logs
echo "Attaching to tmux dashboard... (Press Ctrl+B then D to detach, or Ctrl+C in panes to stop)"
sleep 1
tmux attach-session -t dev

# When tmux session ends
echo "Desligando servidores..."
tmux kill-session -t dev 2>/dev/null
