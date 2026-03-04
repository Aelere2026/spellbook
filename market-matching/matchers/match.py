from dataclasses import dataclass
from datetime import timedelta

from rapidfuzz import fuzz

from normalizers.models import NormalizedMarket
from matchers.gate import close_time_gate


@dataclass
class MatchResult:
    kalshi: NormalizedMarket
    polymarket: NormalizedMarket
    score: float  # 0–100, average of token_set_ratio and partial_ratio


def _score(a: str, b: str) -> float:
    """Average of token_set_ratio and partial_ratio on lowercased titles.

    token_set_ratio handles word-order and rephrasing ("nominee" vs "nomination").
    partial_ratio penalises topic divergence ("nomination" vs "election").
    Averaging the two catches phrasing variations while rejecting questions that
    merely share a candidate name but resolve on different events.
    """
    a, b = a.lower(), b.lower()
    return (fuzz.token_set_ratio(a, b) + fuzz.partial_ratio(a, b)) / 2


def find_matches(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_score: float = 82.0,
    max_time_delta: timedelta = timedelta(days=14),
) -> list[MatchResult]:
    """Return scored (kalshi, polymarket) pairs that likely describe the same event.

    Pipeline:
      1. Drop Kalshi MVE markets (parlays, no Polymarket equivalent).
      2. Close-time gate: only consider pairs within max_time_delta.
      3. Combined title score (token_set_ratio + partial_ratio) / 2.
      4. Keep pairs at or above min_score, sorted best-first.
    """
    eligible = [k for k in kalshi if not k.is_mve]
    candidates = close_time_gate(eligible, polymarket, max_time_delta)

    results = []
    for k, p in candidates:
        score = _score(k.title, p.title)
        if score >= min_score:
            results.append(MatchResult(k, p, round(score, 1)))

    return sorted(results, key=lambda r: r.score, reverse=True)
