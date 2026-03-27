from datetime import datetime, timedelta, timezone
from normalizers.models import NormalizedMarket
from matchers.match import find_matches, MatchResult
from matchers.utils import canon, fuzzy_score
from matchers.event import event_candidates

T = datetime(2026, 6, 1, tzinfo=timezone.utc)


def market(
    platform: str, pid: str, title: str,
    close_time=T, event_title=None, resolution_date=None,
) -> NormalizedMarket:
    return NormalizedMarket(
        platform=platform,
        platform_id=pid,
        title=title,
        description="",
        close_time=close_time,
        resolution_date=resolution_date,
        outcomes=["Yes", "No"],
        event_title=event_title,
        series_title=None,
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

# --- Canonicalization: different verb forms / number formats ---

# championship vs champion
k_nba   = market("kalshi",     "K-NBA",
                  "Will the Golden State Warriors win the NBA Championship in 2026?",
                  close_time=datetime(2026, 6, 20, tzinfo=timezone.utc))
p_nba   = market("polymarket", "P-NBA",
                  "Will the Golden State Warriors be NBA champion in 2026?",
                  close_time=datetime(2026, 6, 20, tzinfo=timezone.utc))

# number format: $100k vs $100,000 with different verb (hit vs reach)
k_num   = market("kalshi",     "K-NUM",  "Will Bitcoin hit $100,000 by end of 2026?")
p_num   = market("polymarket", "P-NUM",  "Will Bitcoin reach $100k by end of 2026?")

# --- Other pipeline filters ---

# Completely different topics
k_other = market("kalshi",     "K-OTHER",  "Will the S&P 500 close above 6000 in June 2026?")
p_other = market("polymarket", "P-OTHER",  "Will Argentina win the 2026 World Cup?")

# Outside time window (no resolution_date set → falls back to close_time)
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

# Outside time window excluded
results = find_matches([k_late], [p_fed])
assert len(results) == 0, "market outside time window must be excluded"

# Results sorted best-first
results = find_matches([k_fed, k_btc], [p_fed, p_btc])
assert len(results) == 2
assert results[0].score >= results[1].score

# championship/champion normalization → included
results = find_matches([k_nba], [p_nba])
assert len(results) == 1, f"expected championship/champion match, got {len(results)}"
assert results[0].score >= 82.0

# number format normalization ($100,000 vs $100k) with different verb → included
results = find_matches([k_num], [p_num])
assert len(results) == 1, f"expected number-format match, got {len(results)}"
assert results[0].score >= 82.0

# --- Event-level blocking ---

LATE = T + timedelta(days=30)  # far-apart close_times

# Event-matched pair: close_times are 30 days apart but resolution_dates are within 1 day.
# Proves the gate compares resolution_date, not close_time.
k_ev = market("kalshi",     "K-EV", "Will candidate X win the primary?",
               close_time=T,    event_title="2028 Democratic Primary",
               resolution_date=T)
p_ev = market("polymarket", "P-EV", "Will candidate X win the 2028 Democratic primary?",
               close_time=LATE, event_title="2028 Democratic Election Primary",
               resolution_date=T + timedelta(hours=12))

results = find_matches([k_ev], [p_ev])
assert len(results) == 1, "event-matched pair with close resolution_dates should match"

# Event-matched pair where resolution_dates are also far apart → excluded.
# Shared event title is not enough; the markets must actually resolve together.
k_ev_far = market("kalshi",     "K-EV-FAR", "Will candidate X win the primary?",
                   close_time=T,    event_title="2028 Democratic Primary",
                   resolution_date=T)
p_ev_far = market("polymarket", "P-EV-FAR", "Will candidate X win the 2028 Democratic primary?",
                   close_time=LATE, event_title="2028 Democratic Election Primary",
                   resolution_date=LATE)

results = find_matches([k_ev_far], [p_ev_far])
assert len(results) == 0, "event-matched pair with far resolution_dates must be excluded"

# No event title on either side → falls back to time gate (original behavior)
k_no_ev = market("kalshi",     "K-NO-EV", "Will the Fed cut rates in June 2026?")
p_no_ev = market("polymarket", "P-NO-EV", "Will the Federal Reserve cut interest rates in June 2026?")
results = find_matches([k_no_ev], [p_no_ev])
assert len(results) == 1, "no-event markets should still match via time gate"

# Non-matching event titles → falls through to time gate; outside window → excluded
k_mismatch = market("kalshi",     "K-MIS", "Will candidate X win the primary?",
                     close_time=T,    event_title="Completely Unrelated Kalshi Event ZYXWV")
p_mismatch  = market("polymarket", "P-MIS", "Will candidate X win the 2028 Democratic primary?",
                     close_time=LATE, event_title="2028 Democratic Election Primary")
results = find_matches([k_mismatch], [p_mismatch])
assert len(results) == 0, "non-matching event + outside time window → excluded"

# event_candidates unit test
pairs = event_candidates([k_ev], [p_ev], min_event_score=70.0)
assert len(pairs) == 1
assert pairs[0] == (k_ev, p_ev)

# event titles below threshold → no pairs
pairs = event_candidates([k_mismatch], [p_mismatch], min_event_score=70.0)
assert len(pairs) == 0

# --- _canon unit tests ---

assert canon("Will Bitcoin exceed $100,000 by 2026?") == "will bitcoin exceed $100000 by 2026?"
assert canon("Will Bitcoin exceed $100k by 2026?")    == "will bitcoin exceed $100000 by 2026?"
assert canon("Will Bitcoin exceed $1.5k by 2026?")    == "will bitcoin exceed $1500 by 2026?"
assert canon("Will X win the NBA Championship?")      == "will x win the nba champion?"
assert canon("Will X be NBA champion?")               == "will x be nba champion?"
assert canon("Will Team A beat Team B?")              == "will team a beat team b?"
assert canon("Will Team A beats Team B?")             == "will team a beat team b?"
assert canon("Will unemployment exceed 5%?")          == "will unemployment exceed 5%?"
assert canon("Will unemployment exceeded 5%?")        == "will unemployment exceed 5%?"
assert canon("Will the bill pass?")                   == "will the bill pass?"
assert canon("Will the bill passes?")                 == "will the bill pass?"
assert canon("Will they reach $1,500?")               == "will they reach $1500?"

# --- fuzzy_score LRU cache ---

fuzzy_score.cache_clear()
a, b = "will the fed cut rates in june 2026", "will the federal reserve cut interest rates in june 2026"
fuzzy_score(a, b)
assert fuzzy_score.cache_info().hits == 0, "first call should be a miss"
fuzzy_score(a, b)
assert fuzzy_score.cache_info().hits == 1, "second call with same args should be a cache hit"

print("All tests passed.")
