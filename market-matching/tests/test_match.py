from datetime import datetime, timedelta, timezone
from normalizers.models import NormalizedMarket
from matchers.match import (
    find_matches,
    MatchResult,
    _entity_mismatch,
    _prop_threshold_mismatch,
    _year_mismatch,
    is_binary,
)
import matchers.match as match_module
from matchers.idf_retrieval import idf_candidates
from matchers.utils import canon, fuzzy_score

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
results, _ = find_matches([k_fed], [p_fed])
assert len(results) == 1, f"expected fed match, got {len(results)}"
assert results[0].score >= 82.0

# Abbreviation match
results, _ = find_matches([k_btc], [p_btc])
assert len(results) == 1, f"expected btc match, got {len(results)}"
assert results[0].score >= 82.0

# Nomination phrasing match → included
results, _ = find_matches([k_aoc], [p_aoc])
assert len(results) == 1, f"expected nomination match, got {len(results)}"

# Same candidate, nomination vs general election → excluded
results, _ = find_matches([k_aoc], [p_aoc_election])
assert len(results) == 0, "nomination vs election should not match"

# Different candidates sharing a last name → excluded
results, _ = find_matches([k_phil], [p_chris])
assert len(results) == 0, "different candidates (Phil vs Chris Murphy) should not match"

# Unrelated topics → excluded
results, _ = find_matches([k_other], [p_other])
assert len(results) == 0, "unrelated topics should not match"

# Outside time window excluded
results, _ = find_matches([k_late], [p_fed])
assert len(results) == 0, "market outside time window must be excluded"

# Results sorted best-first
results, _ = find_matches([k_fed, k_btc], [p_fed, p_btc])
assert len(results) == 2
assert results[0].score >= results[1].score

# championship/champion normalization → included
results, _ = find_matches([k_nba], [p_nba])
assert len(results) == 1, f"expected championship/champion match, got {len(results)}"
assert results[0].score >= 82.0

# number format normalization ($100,000 vs $100k) with different verb → included
results, _ = find_matches([k_num], [p_num])
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

results, _ = find_matches([k_ev], [p_ev])
assert len(results) == 1, "event-matched pair with close resolution_dates should match"

# Event-matched pair where resolution_dates are also far apart → excluded.
# Shared event title is not enough; the markets must actually resolve together.
k_ev_far = market("kalshi",     "K-EV-FAR", "Will candidate X win the primary?",
                   close_time=T,    event_title="2028 Democratic Primary",
                   resolution_date=T)
p_ev_far = market("polymarket", "P-EV-FAR", "Will candidate X win the 2028 Democratic primary?",
                   close_time=LATE, event_title="2028 Democratic Election Primary",
                   resolution_date=LATE)

results, _ = find_matches([k_ev_far], [p_ev_far])
assert len(results) == 0, "event-matched pair with far resolution_dates must be excluded"

# No event title on either side → falls back to time gate (original behavior)
k_no_ev = market("kalshi",     "K-NO-EV", "Will the Fed cut rates in June 2026?")
p_no_ev = market("polymarket", "P-NO-EV", "Will the Federal Reserve cut interest rates in June 2026?")
results, _ = find_matches([k_no_ev], [p_no_ev])
assert len(results) == 1, "no-event markets should still match via time gate"

# Non-matching event titles → falls through to time gate; outside window → excluded
k_mismatch = market("kalshi",     "K-MIS", "Will candidate X win the primary?",
                     close_time=T,    event_title="Completely Unrelated Kalshi Event ZYXWV")
p_mismatch  = market("polymarket", "P-MIS", "Will candidate X win the 2028 Democratic primary?",
                     close_time=LATE, event_title="2028 Democratic Election Primary")
results, _ = find_matches([k_mismatch], [p_mismatch])
assert len(results) == 0, "non-matching event + outside time window → excluded"

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

# --- _year_mismatch unit tests ---

def _ym(platform_k, pid_k, title_k, close_k, platform_p, pid_p, title_p, close_p):
    k = market(platform_k, pid_k, title_k, close_time=close_k)
    p = market(platform_p, pid_p, title_p, close_time=close_p)
    return _year_mismatch(k, p)

Y2026 = datetime(2026, 6, 1, tzinfo=timezone.utc)
Y2027 = datetime(2027, 11, 3, tzinfo=timezone.utc)   # 2026-election Kalshi close
Y2029 = datetime(2029, 11, 7, tzinfo=timezone.utc)   # 2028-election Kalshi close

# Both dates present → guard defers to time gate, never fires
assert not _ym("kalshi", "K1", "Will Democrats win the Senate race in Oklahoma?", Y2029,
               "polymarket", "P1", "Will the Democrats win the Oklahoma Senate race in 2026?", Y2026), \
    "both dates present: guard should not fire (time gate owns this)"

# Kalshi 2028 cycle (closes 2029), Polymarket 2026 title, no Poly date → reject
assert _ym("kalshi", "K2", "Will Democrats win the Senate race in Oklahoma?", Y2029,
           "polymarket", "P2", "Will the Democrats win the Oklahoma Senate race in 2026?", None), \
    "2029 Kalshi vs 2026 Polymarket title with no Poly date should be rejected"

# Kalshi 2026 cycle (closes 2027), Polymarket 2026 title, no Poly date → allow (±1 tolerance)
assert not _ym("kalshi", "K3", "Will Democrats win the Senate race in Rhode Island?", Y2027,
               "polymarket", "P3", "Will the Democrats win the Rhode Island Senate race in 2026?", None), \
    "2027 Kalshi close vs 2026 Polymarket title should be allowed (within ±1 year)"

# No year in either title, one date missing → allow (nothing to compare)
assert not _ym("kalshi", "K4", "Will the Fed cut rates?", Y2027,
               "polymarket", "P4", "Will the Federal Reserve cut rates?", None), \
    "no year in title: guard should not fire"

# Polymarket date present, Kalshi title has incompatible explicit year → reject
assert _ym("kalshi", "K5", "Will the Democrats win the Oklahoma Senate race in 2026?", None,
           "polymarket", "P5", "Will Democrats win the Senate race in Oklahoma?", Y2029), \
    "2026 Kalshi title vs 2029 Polymarket date should be rejected"

# No date on either side → allow
assert not _ym("kalshi", "K6", "Will Democrats win the Senate race?", None,
               "polymarket", "P6", "Will Democrats win the Senate race?", None), \
    "missing dates on both sides should be allowed"

# Open-question titles are not binary Yes/No markets, even with Yes/No outcomes
assert not is_binary(market("kalshi", "K-WHO", "Who will win the 2028 election?"))

# Prop thresholds with different platform formats should be rejected
assert _prop_threshold_mismatch(
    market("kalshi", "K-PROP", "Stephen Curry: 6+ assists"),
    market("polymarket", "P-PROP", "Stephen Curry assists O/U 6.5"),
)

# Entity mismatch guard edge cases
assert not _entity_mismatch(
    market("kalshi", "K-SHARED", "Will OpenAI launch a new model?"),
    market("polymarket", "P-SHARED", "Will OpenAI release a new model?"),
)
assert not _entity_mismatch(
    market("kalshi", "K-PREFIX", "Will Trump win Florida?"),
    market("polymarket", "P-PREFIX", "Will Trumps campaign win Florida?"),
)
assert not _entity_mismatch(
    market("kalshi", "K-NO-SPEC", "Can it?"),
    market("polymarket", "P-NO-SPEC", "Will OpenAI pass?"),
)
assert not _entity_mismatch(
    market("kalshi", "K-PREFIX-ONLY", "Will Trump win?"),
    market("polymarket", "P-PREFIX-ONLY", "Will Trumps prevail?"),
)
assert _entity_mismatch(
    market("kalshi", "K-DIFF", "Will OpenSea launch a token?"),
    market("polymarket", "P-DIFF", "Will OpenAI launch a model?"),
)

# IDF retrieval guard branches
assert idf_candidates([], [p_fed]) == []
assert idf_candidates([k_fed], []) == []
assert idf_candidates(
    [market("kalshi", "K-NO-TOKENS", "zzzzunique")],
    [market("polymarket", "P-NO-TOKENS", "yyyyunique")],
) == []


def test_find_matches_deduplicates_candidate_pairs(monkeypatch):
    def duplicated_candidates(kalshi, polymarket, top_k=20):
        return [(kalshi[0], polymarket[0]), (kalshi[0], polymarket[0])]

    monkeypatch.setattr(match_module, "idf_candidates", duplicated_candidates)
    results, scores = find_matches([k_fed], [p_fed])

    assert len(results) == 1
    assert list(scores) == [("K-FED", "P-FED")]

# Symmetric: Polymarket has date, Kalshi title has explicit year, no Kalshi date
k_no_date = market("kalshi", "K5", "Will Democrats win the Senate race in 2026?", close_time=None)
p_has_date = market("polymarket", "P5", "Will the Democrats win the Senate race?",
                    close_time=Y2029)
assert _year_mismatch(k_no_date, p_has_date), \
    "symmetric: 2026 in Kalshi title vs 2029 Poly date should be rejected"

# end-to-end: 2028-cycle Kalshi matches excluded from find_matches
k_28 = market("kalshi", "K-28", "Will Democrats win the Senate race in Oklahoma?",
              close_time=Y2029)
p_26 = market("polymarket", "P-26", "Will the Democrats win the Oklahoma Senate race in 2026?",
              close_time=None)
results, _ = find_matches([k_28], [p_26])
assert len(results) == 0, "2028-cycle Kalshi must not match 2026 Polymarket with no date"

# end-to-end: 2026-cycle Kalshi still matches when Polymarket has no date
k_26 = market("kalshi", "K-26", "Will Democrats win the Senate race in Rhode Island?",
              close_time=Y2027)
p_26_ri = market("polymarket", "P-26-RI", "Will the Democrats win the Rhode Island Senate race in 2026?",
                 close_time=None)
results, _ = find_matches([k_26], [p_26_ri])
assert len(results) == 1, "2026-cycle Kalshi should still match 2026 Polymarket with no date"

print("All tests passed.")
