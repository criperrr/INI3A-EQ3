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
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# 2. Setup tmux session for background services
echo "Setting up tmux dashboard..."
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "dashboard"

# Pane 0 (Left): Backend Server with maximum logs
tmux send-keys -t dev:dashboard.0 "cd ./src/backend && DEBUG=* NODE_ENV=development npm run dev" C-m

# 3. Wait for backend to be ready
check_port 3333 "Backend Server"

# 4. Start tunnels for backend and frontend in a hidden background window
echo "Starting tunnels for backend and frontend..."
rm -f /tmp/backend_tunnel.log /tmp/frontend_tunnel.log
tmux new-window -t dev -n "tunnel"
tmux send-keys -t dev:tunnel "npx --yes localtunnel --port 3333 --subdomain ini3a-eq3-api > /tmp/backend_tunnel.log & npx --yes localtunnel --port 8081 --subdomain ini3a-eq3-app > /tmp/frontend_tunnel.log & wait" C-m

# Wait for tunnel URLs
echo -n "Waiting for tunnel URLs..."
attempt=1
while ! grep -q "your url is:" /tmp/backend_tunnel.log 2>/dev/null || ! grep -q "your url is:" /tmp/frontend_tunnel.log 2>/dev/null; do
  if [ $attempt -ge 15 ]; then
    echo " Timeout!"
    echo "❌ Could not get tunnel URLs."
    break
  fi
  sleep 1
  ((attempt++))
  echo -n "."
done
echo ""

BACKEND_URL=$(grep -o "https://.*" /tmp/backend_tunnel.log || echo "http://localhost:3333")
FRONTEND_URL=$(grep -o "https://.*" /tmp/frontend_tunnel.log || echo "")
echo "✅ Backend Tunnel URL: $BACKEND_URL"
echo "✅ Frontend Tunnel URL: $FRONTEND_URL"

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
