#!/bin/bash
# Encerra qualquer sessão anterior com o nome dev
tmux kill-session -t dev 2>/dev/null

# 1. Inicia o servidor Backend (Node/Express na porta 3000) e o localtunnel em segundo plano
tmux new-session -d -s dev "cd ./src/backend && npm run dev"
tmux send-keys -t dev "npx -y localtunnel --port 3000 --subdomain ini3a-eq3-api > /dev/null 2>&1 &" C-m

# 2. Divide a tela em apenas 2 painéis (Lado esquerdo = Backend | Lado direito = Expo Frontend)
tmux split-window -h -t dev "cd ./src/frontend && npx expo start -c --tunnel"

# Foca automaticamente no painel do Expo
tmux select-pane -t dev:0.1

# Conecta na sessão do tmux
tmux attach-session -t dev
