import requests

def pull_polymarket(limit: int = 5):
    BASE = "https://gamma-api.polymarket.com"

    params = {"active": True, "closed": False, "limit": limit}
    r = requests.get(f"{BASE}/markets", params=params, timeout=30)
    r.raise_for_status()
    markets = r.json()

    print("\n==================== Polymarket ====================")
    for m in markets[:limit]:
        event = (m.get("events") or [{}])[0]
        series = (event.get("series") or [{}])[0]

        print("\n---")
        print("Question:", m.get("question"))
        print("Condition ID:", m.get("conditionId"))
        print("End Date:", m.get("endDate"))
        print("Slug:", m.get("slug"))
        print("Event Title:", event.get("title"))
        print("Series Title:", series.get("title"))
        print("Description:", (m.get("description") or "")[:250], "...")
