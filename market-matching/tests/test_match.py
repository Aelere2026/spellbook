from datetime import datetime, timedelta, timezone
from normalizers.models import NormalizedMarket
from matchers.match import find_matches, MatchResult

T = datetime(2026, 6, 1, tzinfo=timezone.utc)


def market(platform: str, pid: str, title: str, close_time=T, is_mve=False) -> NormalizedMarket:
    return NormalizedMarket(
        platform=platform,
        platform_id=pid,
        title=title,
        description="",
        close_time=close_time,
        outcomes=["Yes", "No"],
        event_title=None,
        series_title=None,
        is_mve=is_mve,
    )


# --- Test data ---

# Clear match: same question, different phrasing
k_fed   = market("kalshi",     "K-FED",     "Will the Fed cut rates in June 2026?")
p_fed   = market("polymarket", "P-FED",     "Will the Federal Reserve cut interest rates in June 2026?")

# Clear match: minimal wording difference
k_btc   = market("kalshi",     "K-BTC",     "Will Bitcoin exceed $100,000 by end of 2026?")
p_btc   = market("polymarket", "P-BTC",     "Will Bitcoin exceed $100k by end of 2026?")

# Non-match: completely different topics, same time window
k_other = market("kalshi",     "K-OTHER",   "Will the S&P 500 close above 6000 in June 2026?")
p_other = market("polymarket", "P-OTHER",   "Will Argentina win the 2026 World Cup?")

# MVE market — must be excluded regardless of title or timing
k_mve   = market("kalshi",     "K-MVE",     "Will the Fed cut rates in June 2026?", is_mve=True)

# Outside time window — must be excluded
k_late  = market("kalshi",     "K-LATE",    "Will the Fed cut rates in June 2026?",
                 close_time=T + timedelta(days=10))


# Strong title match → result returned
results = find_matches([k_fed], [p_fed])
assert len(results) == 1, f"expected 1 result, got {len(results)}"
assert results[0].kalshi is k_fed
assert results[0].polymarket is p_fed
assert results[0].score >= 75.0

# Abbreviation match (100k vs $100,000)
results = find_matches([k_btc], [p_btc])
assert len(results) == 1, f"expected BTC match, got {len(results)}"
assert results[0].score >= 75.0

# Unrelated topics → no match
results = find_matches([k_other], [p_other])
assert len(results) == 0, f"unrelated topics should not match"

# MVE market excluded even when title matches
results = find_matches([k_mve], [p_fed])
assert len(results) == 0, "MVE market must be excluded"

# Outside time window excluded
results = find_matches([k_late], [p_fed])
assert len(results) == 0, "market outside time window must be excluded"

# Results sorted best-first
results = find_matches([k_fed, k_btc], [p_fed, p_btc])
assert len(results) == 2
assert results[0].score >= results[1].score

print("All tests passed.")
