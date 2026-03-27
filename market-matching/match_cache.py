"""Persistent score cache for incremental market matching.

On each run, fingerprints of all fetched markets are compared against the
previous run. Candidate pairs where both sides are unchanged reuse their
cached score instead of re-running fuzzy matching. New or changed markets
are always re-scored from scratch.

Cache is stored as a JSON file (match_cache.json by default).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from normalizers.models import NormalizedMarket
from matchers.match import MatchResult

CACHE_PATH = Path("match_cache.json")


def fingerprint(m: NormalizedMarket) -> str:
    """Hash of the fields that affect matching: title, resolution_date, close_time."""
    raw = f"{m.title}|{m.resolution_date}|{m.close_time}"
    return hashlib.md5(raw.encode()).hexdigest()


def load_cache(path: Path = CACHE_PATH) -> tuple[
    dict[str, str],                  # kalshi  platform_id -> fingerprint
    dict[str, str],                  # poly    platform_id -> fingerprint
    dict[tuple[str, str], float],    # (k_id, p_id) -> score
]:
    """Load the previous run's fingerprints and match scores.

    Returns empty dicts if the cache file is absent or unreadable.
    """
    if not path.exists():
        return {}, {}, {}
    try:
        data = json.loads(path.read_text())
        scores: dict[tuple[str, str], float] = {
            (k_id, p_id): score
            for key, score in data.get("scores", {}).items()
            for k_id, p_id in [key.split("|", 1)]
        }
        return data.get("kalshi", {}), data.get("polymarket", {}), scores
    except Exception:
        return {}, {}, {}


def save_cache(
    path: Path,
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    matches: list[MatchResult],
) -> None:
    """Persist the current run's fingerprints and match scores to disk."""
    data = {
        "kalshi":     {m.platform_id: fingerprint(m) for m in kalshi},
        "polymarket": {m.platform_id: fingerprint(m) for m in polymarket},
        "scores":     {
            f"{r.kalshi.platform_id}|{r.polymarket.platform_id}": r.score
            for r in matches
        },
    }
    path.write_text(json.dumps(data))


def build_score_cache(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    old_k_fps: dict[str, str],
    old_p_fps: dict[str, str],
    pair_scores: dict[tuple[str, str], float],
) -> dict[tuple[str, str], float]:
    """Return scores that can safely be reused this run.

    A cached score is valid only if both markets' fingerprints are unchanged
    since the last run. Changed or new markets are excluded so they are always
    re-scored.
    """
    cur_k_fps = {m.platform_id: fingerprint(m) for m in kalshi}
    cur_p_fps = {m.platform_id: fingerprint(m) for m in polymarket}

    return {
        (k_id, p_id): score
        for (k_id, p_id), score in pair_scores.items()
        if cur_k_fps.get(k_id) == old_k_fps.get(k_id)
        and cur_p_fps.get(p_id) == old_p_fps.get(p_id)
    }
