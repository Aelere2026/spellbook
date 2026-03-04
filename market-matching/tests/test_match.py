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


# --- True positives ---

# Same question, different phrasing
k_fed   = market("kalshi",     "K-FED",  "Will the Fed cut rates in June 2026?")
p_fed   = market("polymarket", "P-FED",  "Will the Federal Reserve cut interest rates in June 2026?")

# Abbreviation difference ($100k vs $100,000)
k_btc   = market("kalshi",     "K-BTC",  "Will Bitcoin exceed $100,000 by end of 2026?")
p_btc   = market("polymarket", "P-BTC",  "Will Bitcoin exceed $100k by end of 2026?")

# Presidential nomination phrasing difference (the key regression case)
k_aoc   = market("kalshi",     "K-AOC",  "Will Alexandria Ocasio-Cortez be the Democratic Presidential nominee in 2028?",
                 close_time=datetime(2028, 11, 7, tzinfo=timezone.utc))
p_aoc   = market("polymarket", "P-AOC",  "Will Alexandria Ocasio-Cortez win the 2028 Democratic presidential nomination?",
                 close_time=datetime(2028, 11, 7, tzinfo=timezone.utc))

# --- False positives that must be rejected ---

# Same candidate, but nomination vs general election — different questions
p_aoc_election = market("polymarket", "P-AOC-EL",
                         "Will Alexandria Ocasio-Cortez win the 2028 US Presidential Election?",
                         close_time=datetime(2028, 11, 7, tzinfo=timezone.utc))

# Different candidates who share a last name
k_phil  = market("kalshi",     "K-PHIL", "Will Phil Murphy be the Democratic Presidential nominee in 2028?",
                 close_time=datetime(2028, 11, 7, tzinfo=timezone.utc))
p_chris = market("polymarket", "P-CHRIS","Will Chris Murphy win the 2028 Democratic presidential nomination?",
                 close_time=datetime(2028, 11, 7, tzinfo=timezone.utc))

# --- Other pipeline filters ---

# Completely different topics
k_other = market("kalshi",     "K-OTHER",  "Will the S&P 500 close above 6000 in June 2026?")
p_other = market("polymarket", "P-OTHER",  "Will Argentina win the 2026 World Cup?")

# MVE market — excluded regardless of title
k_mve   = market("kalshi",     "K-MVE",    "Will the Fed cut rates in June 2026?", is_mve=True)

# Outside time window
k_late  = market("kalshi",     "K-LATE",   "Will the Fed cut rates in June 2026?",
                 close_time=T + timedelta(days=20))


# Strong phrasing match → included
results = find_matches([k_fed], [p_fed])
assert len(results) == 1, f"expected fed match, got {len(results)}"
assert results[0].score >= 82.0

# Abbreviation match
results = find_matches([k_btc], [p_btc])
assert len(results) == 1, f"expected btc match, got {len(results)}"
assert results[0].score >= 82.0

# Nomination phrasing match → included
results = find_matches([k_aoc], [p_aoc])
assert len(results) == 1, f"expected nomination match, got {len(results)}"

# Same candidate, nomination vs general election → excluded
results = find_matches([k_aoc], [p_aoc_election])
assert len(results) == 0, "nomination vs election should not match"

# Different candidates sharing a last name → excluded
results = find_matches([k_phil], [p_chris])
assert len(results) == 0, "different candidates (Phil vs Chris Murphy) should not match"

# Unrelated topics → excluded
results = find_matches([k_other], [p_other])
assert len(results) == 0, "unrelated topics should not match"

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
