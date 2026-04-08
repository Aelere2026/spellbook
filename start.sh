#!/bin/bash
SESSION="spellbook"

tmux new-session -d -s $SESSION -n "market-matching"
tmux send-keys -t $SESSION:0 "cd market-matching && bash run_loop.sh" Enter

tmux new-window -t $SESSION -n "dashboard"
tmux send-keys -t $SESSION:1 "cd dashboard && npm run dev" Enter

tmux new-window -t $SESSION -n "detector"
tmux send-keys -t $SESSION:2 "cd trading && npm run detector" Enter

tmux new-window -t $SESSION -n "trading"
tmux send-keys -t $SESSION:3 "cd trading && npm run dev" Enter

tmux attach -t $SESSION
