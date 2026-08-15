#!/bin/bash

echo "🔍 Verifying connections..."

# Function to check port
check_port() {
  local port=$1
  local name=$2
  local max_attempts=30
  local attempt=1
  
  echo -n "Waiting for $name on port $port..."
  while ! nc -z localhost $port; do
    if [ $attempt -ge $max_attempts ]; then
      echo " Timeout!"
      echo "❌ $name is not running on port $port."
      exit 1
    fi
    sleep 1
    ((attempt++))
    echo -n "."
  done
  echo " OK!"
}

# 1. Verify Database (PostgreSQL) and Redis
bash ./reload_services.sh

# 2. Setup tmux session for background services
echo "Setting up tmux dashboard..."
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "dashboard"

# Pane 0 (Left): Backend Server with maximum logs
tmux send-keys -t dev:dashboard.0 "cd ./src/backend && DEBUG=* NODE_ENV=development npm run dev" C-m

# 3. Wait for backend to be ready
check_port 3333 "Backend Server"

# 4. Detect LAN IP and start tunnels for backend and frontend in a hidden background window
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo "🌐 Local LAN IP: $LAN_IP"

echo "Starting tunnels for backend and frontend..."
rm -f /tmp/backend_tunnel.log /tmp/frontend_tunnel.log
tmux new-window -t dev -n "tunnel"
tmux send-keys -t dev:tunnel "while true; do npx --yes localtunnel --port 3333 --subdomain ini3a-eq3-api > /tmp/backend_tunnel.log 2>&1; sleep 2; done & while true; do npx --yes localtunnel --port 8081 --subdomain ini3a-eq3-app > /tmp/frontend_tunnel.log 2>&1; sleep 2; done & wait" C-m

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
