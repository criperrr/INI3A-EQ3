#!/bin/bash

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
check_port "$REDIS_HOST" "$REDIS_PORT" "Redis"

# 2. Setup tmux session for background services
echo "Setting up tmux dashboard..."
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "dashboard"

# Pane 0 (Left): Backend Server with maximum logs
tmux send-keys -t dev:dashboard.0 "cd ./src/backend && DEBUG=* NODE_ENV=development npm run dev" C-m

# 3. Wait for backend to be ready
check_port "localhost" "$SERVER_PORT" "Backend Server"

# 4. Detect LAN IP and start tunnels for backend and frontend in a hidden background window
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo "🌐 Local LAN IP: $LAN_IP"

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
    echo "⚠️ Tunnel took too long. Falling back to local LAN IP: http://$LAN_IP:3333"
    break
  fi
  sleep 1
  ((attempt++))
  echo -n "."
done
echo ""

BACKEND_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.loca\.lt" /tmp/backend_tunnel.log | head -n 1)
if [ -z "$BACKEND_URL" ]; then
  BACKEND_URL="http://$LAN_IP:3333"
fi
FRONTEND_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.loca\.lt" /tmp/frontend_tunnel.log | head -n 1)

echo "✅ Backend API URL: $BACKEND_URL (LAN fallback: http://$LAN_IP:3333)"
if [ -n "$FRONTEND_URL" ]; then
  echo "✅ Frontend Tunnel URL: $FRONTEND_URL"
fi

# 5. Start frontend in a right pane with maximum logs
echo "Starting frontend..."
tmux split-window -h -p 50 -t dev:dashboard.0
tmux send-keys -t dev:dashboard.1 "cd ./src/frontend && EXPO_PUBLIC_API_URL=$BACKEND_URL EXPO_PACKAGER_PROXY_URL=$FRONTEND_URL EXPO_DEBUG=true npm run start -- --clear" C-m

# Select the frontend pane so the user can interact with Expo (e.g. press 'w' or 'i')
tmux select-window -t dev:dashboard
tmux select-pane -t dev:dashboard.1

# 6. Attach to tmux session to view all logs
echo "Attaching to tmux dashboard... (Press Ctrl+B then D to detach, or Ctrl+C in panes to stop)"
sleep 1
tmux attach-session -t dev

# When tmux session ends
echo "Desligando servidores..."
tmux kill-session -t dev 2>/dev/null
