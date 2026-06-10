#!/bin/bash
tmux new-session -d -s dev "cd /Users/criper/INI3A-EQ3/src/backend && npm run dev"
tmux split-window -h -t dev "cd /Users/criper/INI3A-EQ3/src/frontend && npm run start"
tmux attach-session -t dev
