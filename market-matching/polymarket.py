import requests

BASE = "https://gamma-api.polymarket.com"

params = {"active": True, "closed": False, "limit": 5}
r = requests.get(f"{BASE}/markets", params=params, timeout=30)
r.raise_for_status()
markets = r.json()

for m in markets[:5]:
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
