import requests

BASE = "https://gamma-api.polymarket.com"

params = {
    "active": True,
    "closed": False,
    "limit": 100
}

response = requests.get(f"{BASE}/markets", params=params, timeout=30)
response.raise_for_status()

markets = response.json()

for market in markets[:5]:
    print("\n---")
    print("Question:", market.get("question"))
    print("Market Slug:", market.get("slug"))
    print("Condition ID:", market.get("conditionId"))
    print("End Date:", market.get("endDate"))
    print("Category:", market.get("category"))
    print("Description:", market.get("description"))
