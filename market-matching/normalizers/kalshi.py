# normalizers/kalshi.py
from datetime import datetime, timezone
from .models import NormalizedMarket

def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def normalize_kalshi(m: dict) -> NormalizedMarket:
    title = m.get("title", "")

    # Outcomes for binary markets
    outcomes = ["Yes", "No"] if m.get("market_type") == "binary" else []

    # expected_expiration_time is when the event resolves (Kalshi-specific);
    # close_time is just when trading stops — different concept.
    resolution_date = parse_dt(
        m.get("expected_expiration_time") or m.get("expiration_time")
    )

    return NormalizedMarket(
        platform        = "kalshi",
        platform_id     = m["ticker"],
        title           = title,
        description     = m.get("rules_primary", "") or m.get("rules_secondary", ""),
        close_time      = parse_dt(m.get("close_time")),
        resolution_date = resolution_date,
        outcomes        = outcomes,
        event_title     = m.get("event_title"),
        series_title    = m.get("series_ticker"),
        raw             = m,
    )