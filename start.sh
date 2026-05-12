#!/bin/bash
set -euo pipefail

SESSION="spellbook"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USE_LLM=0
LLM_MODEL="${LLM_MODEL:-qwen3:4b}"
LLM_MAX_REVIEWS="${LLM_MAX_REVIEWS:-}"
LLM_REVIEW_MIN_SCORE="${LLM_REVIEW_MIN_SCORE:-85.0}"
LLM_AUTO_ACCEPT_SCORE="${LLM_AUTO_ACCEPT_SCORE:-92.0}"
LLM_PROGRESS_INTERVAL="${LLM_PROGRESS_INTERVAL:-25}"

usage() {
    echo "Usage: $0 [--llm] [--llm-model MODEL]"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --llm)
            USE_LLM=1
            shift
            ;;
        --llm-model)
            if [[ $# -lt 2 ]]; then
                usage
                exit 1
            fi
            LLM_MODEL="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage
            exit 1
            ;;
    esac
done

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux attach -t "$SESSION"
    exit 0
fi

tmux new-session -d -s "$SESSION" -n "market-matching"
if [[ "$USE_LLM" -eq 1 ]]; then
    tmux send-keys -t "$SESSION:0" "if ! command -v ollama >/dev/null 2>&1; then echo '[ollama] command not found'; exit 1; fi; until ollama list >/dev/null 2>&1; do echo '[ollama] waiting for local server...'; sleep 2; done; cd '$SCRIPT_DIR/market-matching' && LLM_VERIFY_ENABLED=1 LLM_MODEL='$LLM_MODEL' LLM_MAX_REVIEWS='$LLM_MAX_REVIEWS' LLM_REVIEW_MIN_SCORE='$LLM_REVIEW_MIN_SCORE' LLM_AUTO_ACCEPT_SCORE='$LLM_AUTO_ACCEPT_SCORE' LLM_PROGRESS_INTERVAL='$LLM_PROGRESS_INTERVAL' bash run_loop.sh" Enter
else
    tmux send-keys -t "$SESSION:0" "cd '$SCRIPT_DIR/market-matching' && bash run_loop.sh" Enter
fi

tmux new-window -t "$SESSION" -n "dashboard"
tmux send-keys -t "$SESSION:1" "cd '$SCRIPT_DIR/dashboard' && npm run dev" Enter

tmux new-window -t "$SESSION" -n "trading"
tmux send-keys -t "$SESSION:2" "cd '$SCRIPT_DIR/trading' && npm run dev" Enter

if [[ "$USE_LLM" -eq 1 ]]; then
    tmux new-window -t "$SESSION" -n "ollama"
    tmux send-keys -t "$SESSION:3" "if ! command -v ollama >/dev/null 2>&1; then echo '[ollama] command not found'; exit 1; fi; ollama list >/dev/null 2>&1 || ollama serve" Enter
fi

tmux attach -t "$SESSION"
