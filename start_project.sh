#!/bin/bash
tmux new-session -d -s dev "cd ./src/backend && npm run dev"
tmux split-window -h -t dev "cd ./src/frontend && npm run start"
tmux attach-session -t dev
