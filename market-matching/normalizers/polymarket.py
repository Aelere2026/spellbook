from datetime import datetime, timezone
from models import NormalizedMarket
import json

def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def normalize_polymarket(m: dict) -> NormalizedMarket:
    event  = (m.get("events") or [{}])[0]
    series = (event.get("series") or [{}])[0]

    # Outcomes: stored as JSON string "[\"Yes\", \"No\"]"
    raw_outcomes = m.get("outcomes", "[]")
    outcomes = json.loads(raw_outcomes) if isinstance(raw_outcomes, str) else raw_outcomes

    return NormalizedMarket(
        platform     = "polymarket",
        platform_id  = m["conditionId"],
        title        = m.get("question", ""),
        description  = m.get("description", ""),
        close_time   = parse_dt(m.get("endDate")),
        outcomes     = outcomes,
        event_title  = event.get("title"),
        series_title = series.get("title"),
        raw          = m,
    )