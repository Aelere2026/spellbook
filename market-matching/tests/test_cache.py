"""Tests for the incremental match cache (match_cache.py)."""
import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from normalizers.models import NormalizedMarket
from matchers.match import find_matches, MatchResult
from match_cache import fingerprint, load_cache, save_cache, build_score_cache

T = datetime(2026, 6, 1, tzinfo=timezone.utc)


def market(platform, pid, title, close_time=T, resolution_date=None):
    return NormalizedMarket(
        platform=platform,
        platform_id=pid,
        title=title,
        description="",
        close_time=close_time,
        resolution_date=resolution_date,
        outcomes=["Yes", "No"],
        event_title=None,
        series_title=None,
    )


k = market("kalshi",     "K1", "Will the Fed cut rates in June 2026?")
p = market("polymarket", "P1", "Will the Federal Reserve cut interest rates in June 2026?")


# --- fingerprint ---

def test_fingerprint_stable():
    assert fingerprint(k) == fingerprint(k)

def test_fingerprint_changes_on_title():
    k2 = market("kalshi", "K1", "Will the Fed raise rates in June 2026?")
    assert fingerprint(k) != fingerprint(k2)

def test_fingerprint_changes_on_date():
    k2 = market("kalshi", "K1", k.title, close_time=T + timedelta(days=1))
    assert fingerprint(k) != fingerprint(k2)


# --- load_cache / save_cache roundtrip ---

def test_cache_roundtrip():
    match = MatchResult(k, p, 91.5)
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    save_cache(path, [k], [p], [match])
    old_k_fps, old_p_fps, pair_scores = load_cache(path)
    assert old_k_fps["K1"] == fingerprint(k)
    assert old_p_fps["P1"] == fingerprint(p)
    assert pair_scores[("K1", "P1")] == 91.5

def test_load_cache_missing_file():
    old_k, old_p, scores = load_cache(Path("/tmp/nonexistent_cache_xyz.json"))
    assert old_k == {} and old_p == {} and scores == {}

def test_load_cache_corrupt_file():
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        f.write("not json{{{{")
        path = Path(f.name)
    old_k, old_p, scores = load_cache(path)
    assert old_k == {} and old_p == {} and scores == {}


# --- build_score_cache ---

def test_build_score_cache_unchanged():
    """Both markets unchanged → cached score available."""
    match = MatchResult(k, p, 91.5)
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    save_cache(path, [k], [p], [match])
    old_k_fps, old_p_fps, pair_scores = load_cache(path)
    score_cache = build_score_cache([k], [p], old_k_fps, old_p_fps, pair_scores)
    assert score_cache[("K1", "P1")] == 91.5

def test_build_score_cache_kalshi_changed():
    """Kalshi market changed → pair evicted from cache."""
    match = MatchResult(k, p, 91.5)
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    save_cache(path, [k], [p], [match])
    old_k_fps, old_p_fps, pair_scores = load_cache(path)
    k_changed = market("kalshi", "K1", "Will the Fed raise rates in June 2026?")
    score_cache = build_score_cache([k_changed], [p], old_k_fps, old_p_fps, pair_scores)
    assert ("K1", "P1") not in score_cache

def test_build_score_cache_poly_changed():
    """Polymarket market changed → pair evicted from cache."""
    match = MatchResult(k, p, 91.5)
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    save_cache(path, [k], [p], [match])
    old_k_fps, old_p_fps, pair_scores = load_cache(path)
    p_changed = market("polymarket", "P1", "Will the Fed hike rates in June 2026?")
    score_cache = build_score_cache([k], [p_changed], old_k_fps, old_p_fps, pair_scores)
    assert ("K1", "P1") not in score_cache


# --- score_cache integration with find_matches ---

def test_find_matches_uses_score_cache():
    """Cached score is used; fuzzy_score is not called for the pair."""
    from matchers.utils import fuzzy_score
    fuzzy_score.cache_clear()

    # Prime a score cache with the known pair at a score above threshold
    real_score = find_matches([k], [p])[0].score
    score_cache = {("K1", "P1"): real_score}

    fuzzy_score.cache_clear()
    results = find_matches([k], [p], score_cache=score_cache)
    assert len(results) == 1
    assert results[0].score == real_score
    # fuzzy_score was never called — cache should still be empty
    assert fuzzy_score.cache_info().currsize == 0

def test_find_matches_score_cache_below_threshold_excluded():
    """A cached score below min_score still causes the pair to be excluded."""
    score_cache = {("K1", "P1"): 50.0}
    results = find_matches([k], [p], score_cache=score_cache)
    assert len(results) == 0

def test_find_matches_no_cache_still_works():
    """find_matches without a score_cache behaves identically to before."""
    results = find_matches([k], [p])
    assert len(results) == 1
    assert results[0].score >= 82.0


print("All cache tests passed.")
