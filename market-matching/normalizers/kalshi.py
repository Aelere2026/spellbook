# normalizers/kalshi.py
from datetime import datetime, timezone
from .models import NormalizedMarket

def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def normalize_kalshi(m: dict) -> NormalizedMarket:
    legs = m.get("mve_selected_legs") or []
    
    # For MVE (multi-leg) markets, build a cleaner title from yes_sub_title if present
    # For single markets, title is already clean
    title = m.get("title", "")
    
    # MVE titles are a csv blob — prefer the event_ticker as a stable ID
    if legs:
        # Summarize: "NBA Parlay: 24 legs (Feb 19-20 2026)"
        event_ticker = m.get("event_ticker", "")
        title = f"[MVE] {event_ticker} ({len(legs)} legs)"
    
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
        series_title    = m.get("mve_collection_ticker"),
        is_mve          = bool(legs),
        raw             = m,
    )