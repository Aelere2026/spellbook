#!/bin/bash
set -euo pipefail

DEFAULT_MODEL="qwen3:4b"
MODEL="${LLM_MODEL:-$DEFAULT_MODEL}"
OLLAMA_LOG="${OLLAMA_LOG:-$HOME/.ollama/spellbook-ollama.log}"

usage() {
    echo "Usage: $0 [--model MODEL]"
    echo ""
    echo "Installs Ollama if needed, starts the local Ollama server, and pulls"
    echo "the LLM model used by market-matching."
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --model)
            if [[ $# -lt 2 ]]; then
                usage
                exit 1
            fi
            MODEL="$2"
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

if [[ -z "$MODEL" ]]; then
    echo "Model name cannot be empty."
    usage
    exit 1
fi

log() {
    echo "[llm-install] $*"
}

require_curl() {
    if ! command -v curl >/dev/null 2>&1; then
        echo "curl is required to install Ollama. Please install curl, then rerun this script."
        exit 1
    fi
}

install_ollama() {
    if command -v ollama >/dev/null 2>&1; then
        log "Ollama is already installed."
        return
    fi

    require_curl

    if [[ "$(uname -s)" != "Linux" ]]; then
        echo "Ollama is not installed."
        echo "Install it from https://ollama.com/download, then rerun this script."
        exit 1
    fi

    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
}

start_ollama() {
    if ollama list >/dev/null 2>&1; then
        log "Ollama server is already running."
        return
    fi

    mkdir -p "$(dirname "$OLLAMA_LOG")"
    log "Starting Ollama server..."
    nohup ollama serve > "$OLLAMA_LOG" 2>&1 &

    for _ in {1..30}; do
        if ollama list >/dev/null 2>&1; then
            log "Ollama server is running."
            return
        fi
        sleep 1
    done

    echo "Ollama did not start within 30 seconds."
    echo "Log file: $OLLAMA_LOG"
    exit 1
}

pull_model() {
    if ollama list | awk 'NR > 1 {print $1}' | grep -qx "$MODEL"; then
        log "Model $MODEL is already installed."
        return
    fi

    log "Downloading model $MODEL. This can take several minutes..."
    ollama pull "$MODEL"
}

install_ollama
start_ollama
pull_model

log "Done. Start Spellbook with: ./start.sh --llm --llm-model $MODEL"
