from dataclasses import dataclass
from datetime import timedelta

from rapidfuzz import fuzz

from normalizers.models import NormalizedMarket
from matchers.gate import close_time_gate


@dataclass
class MatchResult:
    kalshi: NormalizedMarket
    polymarket: NormalizedMarket
    score: float  # 0–100


def find_matches(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_score: float = 75.0,
    max_time_delta: timedelta = timedelta(days=3),
) -> list[MatchResult]:
    """Return scored (kalshi, polymarket) pairs that likely describe the same event.

    Pipeline:
      1. Drop Kalshi MVE markets (parlays, no Polymarket equivalent).
      2. Close-time gate: only consider pairs within max_time_delta.
      3. token_set_ratio on titles: handles word-order and phrasing differences.
      4. Keep pairs at or above min_score, sorted best-first.
    """
    eligible = [k for k in kalshi if not k.is_mve]
    candidates = close_time_gate(eligible, polymarket, max_time_delta)

    results = []
    for k, p in candidates:
        score = fuzz.token_set_ratio(k.title, p.title)
        if score >= min_score:
            results.append(MatchResult(k, p, float(score)))

    return sorted(results, key=lambda r: r.score, reverse=True)
