#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERVAL=300  # seconds

cd "$SCRIPT_DIR"
source .venv/bin/activate

while true; do
    echo "[$(date -Iseconds)] Running..."
    python runner.py
    echo "[$(date -Iseconds)] Sleeping ${INTERVAL}s"
    sleep "$INTERVAL"
done
