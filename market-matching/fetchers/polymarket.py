import requests

BASE = "https://gamma-api.polymarket.com"
PAGE_LIMIT = 500  # API maximum per request


def pull_polymarket(limit: int = 0) -> list[dict]:
    """Fetch active Polymarket markets, paginating until exhausted.

    limit=0 (default) fetches all available markets.
    """
    markets: list[dict] = []
    offset = 0

    while True:
        page_size = PAGE_LIMIT if not limit else min(PAGE_LIMIT, limit - len(markets))
        params = {"active": True, "closed": False, "limit": page_size, "offset": offset}
        r = requests.get(f"{BASE}/markets", params=params, timeout=30)
        r.raise_for_status()
        page = r.json()
        markets.extend(page)

        if len(page) < page_size or (limit and len(markets) >= limit):
            break
        offset += len(page)

    return markets
