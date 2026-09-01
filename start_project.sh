#!/bin/bash

# ==============================================================================
# start_project.sh - Presco Dev Environment Launcher
#
# Modes:
#   1. 100% Local NAT Mode (--local-nat / npm run dev:local):
#      Direct local network connection. Zero tunnel latency, maximum stability
#      and instant QR code scanning via Expo Go on the same Wi-Fi.
#      Usage: ./start_project.sh --local-nat
#
#   2. Tunneling Mode (--tunnel / npm run dev:tunnel):
#      Uses cloud tunnel for API and native Expo tunnel for mobile devices
#      across restricted/school/mobile data networks.
#      Usage: ./start_project.sh --tunnel
# ==============================================================================

# ------------------------------------------------------------------------------
# 0. Parse Command Line Arguments
# ------------------------------------------------------------------------------
LOCAL_NAT_MODE=false
NGROK_MODE=false
SHOW_CHECK_ONLY=false
CUSTOM_URL="https://premises-body-pogo.ngrok-free.dev"

for arg in "$@"; do
  case "$arg" in
    --local-nat|--local|--nat|-l)
      LOCAL_NAT_MODE=true
      NGROK_MODE=false
      shift
      ;;
    --ngrok|-n)
      NGROK_MODE=true
      LOCAL_NAT_MODE=false
      shift
      ;;
    --url=*)
      CUSTOM_URL="${arg#*=}"
      NGROK_MODE=true
      LOCAL_NAT_MODE=false
      shift
      ;;
    --tunnel|-t)
      LOCAL_NAT_MODE=false
      NGROK_MODE=false
      shift
      ;;
    --check|--verify|-c)
      SHOW_CHECK_ONLY=true
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
      echo "  --ngrok, -n                       Run with dedicated Ngrok tunnel (using $CUSTOM_URL)"
      echo "  --url=https://...                 Specify custom Ngrok URL"
      echo "  --tunnel, -t                      Run in dynamic Cloud Tunnel mode"
      echo "  --check, --verify, -c             Run Network & Services Diagnostic Agent only"
      echo "  --help, -h                        Show this help message"
      echo ""
      echo "NPM Shortcuts:"
      echo "  npm run dev          -> Default dynamic tunneling mode"
      echo "  npm run dev:ngrok    -> Dedicated Ngrok tunnel mode with custom domain"
      echo "  npm run dev:local    -> 100% Local NAT mode (Direct Wi-Fi / Hotspot)"
      echo "  npm run dev:check    -> Run diagnostic verification agent"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run diagnostic agent only if requested
if [ "$SHOW_CHECK_ONLY" = true ]; then
  npx tsx "$SCRIPT_DIR/scripts/verify_connection.ts"
  exit $?
fi

echo "========================================================"
if [ "$LOCAL_NAT_MODE" = true ]; then
  echo "⚡ MODE: 100% LOCAL NETWORK (NAT) - Direct Home LAN"
else
  echo "🌐 MODE: TUNNELING - Cloud API Tunnel + Native Expo Tunnel"
fi
echo "========================================================"

echo "🔍 Verifying database and cache services..."

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

const redis = parseUrl(env.REDIS_URL, "127.0.0.1", 6379);
const db = parseUrl(env.DATABASE_URL, "127.0.0.1", 5432);
const serverPort = env.SERVER_PORT || "3333";

console.log(`${db.host} ${db.port} ${redis.host} ${redis.port} ${serverPort}`);
' 2>/dev/null)

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-5432}
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
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
      return 1
    fi
    sleep 1
    ((attempt++))
    echo -n "."
  done
  echo " OK!"
  return 0
}

# 1. Verify Database (PostgreSQL) and Redis
if ! check_port "$DB_HOST" "$DB_PORT" "PostgreSQL"; then
  echo "⚠️ PostgreSQL is offline. Attempting to start service..."
  if [ -f "$SCRIPT_DIR/reload_services.sh" ]; then
    bash "$SCRIPT_DIR/reload_services.sh" auto
  fi
fi

if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
  echo "✅ Redis on $REDIS_HOST:$REDIS_PORT: OK!"
else
  echo "ℹ️ Redis is offline on $REDIS_HOST:$REDIS_PORT. Backend will run in In-Memory fallback mode."
fi

# 2. Cross-platform LAN IP Resolver
detect_lan_ip() {
  node -e '
    const os = require("os");
    if (process.env.LAN_IP) {
      console.log(process.env.LAN_IP);
      process.exit(0);
    }
    const ifaces = os.networkInterfaces();
    const candidates = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      for (const a of addrs || []) {
        if (a.family === "IPv4" && !a.internal && !a.address.startsWith("127.") && !a.address.startsWith("169.254.")) {
          const ip = a.address;
          let priority = 5;
          const lower = name.toLowerCase();
          if (ip.startsWith("100.")) {
            priority = 16; // Highest priority for Tailscale Mesh VPN
          } else if (ip.startsWith("172.20.10.") || ip.startsWith("192.168.43.") || ip.startsWith("192.168.3.") || ip.startsWith("192.168.2.")) {
            priority = 15;
          } else if (ip.startsWith("192.168.")) {
            priority = 12;
          } else if (ip.startsWith("172.")) {
            priority = 8;
          } else if (ip.startsWith("10.")) {
            priority = 4;
          }
          if ((lower.includes("docker") || lower.includes("veth") || lower.includes("br-")) && !ip.startsWith("100.")) {
            priority = 0;
          }
          candidates.push({ address: ip, priority });
        }
      }
    }
    candidates.sort((a, b) => b.priority - a.priority);
    console.log(candidates.length > 0 ? candidates[0].address : "127.0.0.1");
  ' 2>/dev/null || echo "127.0.0.1"
}

LAN_IP=$(detect_lan_ip)
echo "📍 Detected Local LAN IP: $LAN_IP"

# 3. Setup tmux session for background services
echo "Setting up tmux dashboard..."
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "dashboard"

# Pane 0 (Left): Backend Server with maximum logs
tmux send-keys -t dev:dashboard.0 "cd ./src/backend && DEBUG=* NODE_ENV=development npm run dev" C-m

# 4. Wait for backend to be ready on local port
check_port "127.0.0.1" "$SERVER_PORT" "Backend Server"

# 5. Configure Network Routing & Start Frontend
tmux split-window -h -p 50 -t dev:dashboard.0

if [ "$LOCAL_NAT_MODE" = true ]; then
  # ----------------------------------------------------------------------------
  # LOCAL NAT MODE: Direct LAN IP, no tunnels
  # ----------------------------------------------------------------------------
  BACKEND_URL="http://${LAN_IP}:${SERVER_PORT}"
  
  echo "🚀 Direct Backend API URL: $BACKEND_URL"
  echo "📱 Expo Bundler will serve over LAN directly (exp://$LAN_IP:8081)"
  echo "📲 Open Expo Go on your mobile device (connected to the same Wi-Fi) and scan the QR code!"

  # Run diagnostic agent for local mode
  npx tsx "$SCRIPT_DIR/scripts/verify_connection.ts" --local

  # Start Expo with LAN host and custom packager hostname
  tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL REACT_NATIVE_PACKAGER_HOSTNAME=$LAN_IP npm run start -- --lan --clear" C-m

elif [ "$NGROK_MODE" = true ]; then
  # ----------------------------------------------------------------------------
  # NGROK DEDICATED MODE: Custom Static/Dynamic Ngrok URL for Backend API
  # ----------------------------------------------------------------------------
  BACKEND_URL="$CUSTOM_URL"
  echo "🚀 Starting Ngrok tunnel for Backend API on Port $SERVER_PORT ($BACKEND_URL)..."
  tmux new-window -t dev -n "ngrok"
  tmux send-keys -t dev:ngrok "ngrok http $SERVER_PORT --url $BACKEND_URL" C-m
  sleep 2

  echo "✅ Active Backend Ngrok URL: $BACKEND_URL"
  npx tsx "$SCRIPT_DIR/scripts/verify_connection.ts" --tunnel --url="$BACKEND_URL"

  # Start Expo with native --tunnel flag and public API URL
  tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL npm run start -- --tunnel --clear" C-m

else
  # ----------------------------------------------------------------------------
  # TUNNELING MODE: Dedicated Cloud Tunnel Agent + Native Expo Tunnel
  # ----------------------------------------------------------------------------
  echo "Starting cloud tunnel agent for Backend API (Port $SERVER_PORT)..."
  rm -f "$SCRIPT_DIR/.tunnel_url"
  tmux new-window -t dev -n "tunnel"
  
  tmux send-keys -t dev:tunnel "cd '$SCRIPT_DIR' && npx tsx ./scripts/start_api_tunnel.ts" C-m

  echo -n "Waiting for backend tunnel URL..."
  attempt=1
  BACKEND_URL=""
  while [ $attempt -le 20 ]; do
    if [ -s "$SCRIPT_DIR/.tunnel_url" ]; then
      BACKEND_URL=$(cat "$SCRIPT_DIR/.tunnel_url")
      if [ -n "$BACKEND_URL" ]; then
        echo " OK ($BACKEND_URL)"
        break
      fi
    fi
    sleep 1
    ((attempt++))
    echo -n "."
  done
  echo ""

  if [ -z "$BACKEND_URL" ]; then
    echo "⚠️ Tunnel agent took too long. Falling back to Local LAN: http://$LAN_IP:$SERVER_PORT"
    BACKEND_URL="http://$LAN_IP:$SERVER_PORT"
    TUNNEL_FLAG="--lan"
  else
    echo "✅ Verified Backend Tunnel URL: $BACKEND_URL"
    TUNNEL_FLAG="--tunnel"
  fi

  # Run diagnostic agent for tunnel mode
  npx tsx "$SCRIPT_DIR/scripts/verify_connection.ts" --tunnel --url="$BACKEND_URL"

  echo "💡 Tip: If Expo tunnel fails with 'remote gone away', run 'npm run dev:local' for 100% stable LAN Wi-Fi connection."

  # Start Expo with native --tunnel flag (powered by @expo/ngrok)
  tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL npm run start -- $TUNNEL_FLAG --clear" C-m
fi

# Select the frontend pane so the user can immediately see the QR code and interact with Expo
tmux select-window -t dev:dashboard
tmux select-pane -t dev:dashboard.1

# 6. Attach to tmux session to view all logs
echo "Attaching to tmux dashboard... (Press Ctrl+B then D to detach, or Ctrl+C in panes to stop)"
sleep 1
tmux attach-session -t dev

# When tmux session ends
echo "Shutting down servers..."
tmux kill-session -t dev 2>/dev/null
