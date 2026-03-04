import requests

BASE = "https://api.elections.kalshi.com/trade-api/v2"
PAGE_LIMIT = 200  # API maximum per request


def pull_kalshi(limit: int = 1000) -> list[dict]:
    """Fetch open Kalshi markets via the events endpoint (non-MVE markets only).

    The /markets endpoint returns almost exclusively sports MVE parlays.
    The /events endpoint with with_nested_markets=true returns the matchable
    binary markets (politics, economics, etc.).

    Each returned market dict is enriched with 'event_title' from its parent event.
    limit is the target number of events to fetch (paginated, max 200/page).
    """
    markets = []
    cursor = None
    events_fetched = 0

    while events_fetched < limit:
        params = {
            "status": "open",
            "limit": min(PAGE_LIMIT, limit - events_fetched),
            "with_nested_markets": "true",
        }
        if cursor:
            params["cursor"] = cursor

        r = requests.get(f"{BASE}/events", params=params, timeout=30)
        r.raise_for_status()
        data = r.json()

        events = data.get("events", [])
        for event in events:
            event_title = event.get("title")
            for m in event.get("markets", []):
                m["event_title"] = event_title
                markets.append(m)

        events_fetched += len(events)
        cursor = data.get("cursor")
        if not cursor or not events:
            break

    return markets
