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
tmux kill-session -t dev 2>/dev/null
tmux new-session -d -s dev -n "backend"
tmux send-keys -t dev:backend "cd ./src/backend && npm run dev" C-m

# 3. Wait for backend to be ready
check_port 3333 "Backend Server"

# 4. Start tunnel for backend
echo "Starting tunnel for backend..."
rm -f /tmp/backend_tunnel.log
tmux new-window -t dev -n "tunnel"
tmux send-keys -t dev:tunnel "npx --yes localtunnel --port 3333 --subdomain ini3a-eq3-api | tee /tmp/backend_tunnel.log" C-m

# Wait for tunnel URL
echo -n "Waiting for tunnel URL..."
attempt=1
while ! grep -q "your url is:" /tmp/backend_tunnel.log 2>/dev/null; do
  if [ $attempt -ge 15 ]; then
    echo " Timeout!"
    echo "❌ Could not get tunnel URL."
    break
  fi
  sleep 1
  ((attempt++))
  echo -n "."
done
echo ""

BACKEND_URL=$(grep -o "https://.*" /tmp/backend_tunnel.log || echo "http://localhost:3333")
echo "✅ Backend Tunnel URL: $BACKEND_URL"

# 5. Start frontend IN FOREGROUND (so you see the QR code directly!)
echo "Starting frontend..."
echo "💡 (Para ver os logs do backend, abra outro terminal e digite: tmux attach -t dev)"
echo "--------------------------------------------------------"
cd ./src/frontend
EXPO_PUBLIC_API_URL=$BACKEND_URL npm run start -- --tunnel

# When frontend is closed (Ctrl+C), kill the background tmux session
echo "Desligando servidores..."
tmux kill-session -t dev 2>/dev/null
