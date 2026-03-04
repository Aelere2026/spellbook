import requests

BASE = "https://gamma-api.polymarket.com"


def pull_polymarket(limit: int = 500) -> list[dict]:
    params = {"active": True, "closed": False, "limit": limit}
    r = requests.get(f"{BASE}/markets", params=params, timeout=30)
    r.raise_for_status()
    return r.json()
