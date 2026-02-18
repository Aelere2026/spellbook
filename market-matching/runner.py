import time
from datetime import datetime

from polymarket import pull_polymarket
from kalshi import pull_kalshi

INTERVAL_SECONDS = 60 * 60  # 1 hour

def run_once():
    print("\n===================================================")
    print("Run at:", datetime.now().isoformat())
    print("===================================================")

    try:
        pull_polymarket(limit=5)
    except Exception as e:
        print("\n[Polymarket] Error:", repr(e))

    try:
        pull_kalshi(limit=5)
    except Exception as e:
        print("\n[Kalshi] Error:", repr(e))

def main():
    while True:
        run_once()
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
