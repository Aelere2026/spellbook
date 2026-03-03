import requests

def pull_kalshi(limit: int = 5):
    BASE = "https://api.elections.kalshi.com/trade-api/v2"

    params = {"status": "open", "limit": limit}
    r = requests.get(f"{BASE}/markets", params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    markets = data.get("markets", [])

    print("\n====================== Kalshi ======================")
    for m in markets[:limit]:
        print("\n---")
        print("Title:", m.get("title"))
        print("Ticker:", m.get("ticker"))
        print("Event Ticker:", m.get("event_ticker"))
        print("Close Time:", m.get("close_time"))
        print("Expiration Time:", m.get("expiration_time"))

        legs = m.get("mve_selected_legs") or []
        if legs:
            print(f"Legs ({len(legs)}):")
            for leg in legs[:5]:
                print("  -", leg.get("market_ticker"), "| side:", leg.get("side"))
            if len(legs) > 5:
                print("  ...")
