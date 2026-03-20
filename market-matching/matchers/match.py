import itertools
import re
from dataclasses import dataclass
from datetime import timedelta


from normalizers.models import NormalizedMarket
from matchers.utils import canon, fuzzy_score
from matchers.gate import close_time_gate
from matchers.event import event_candidates


@dataclass
class MatchResult:
    kalshi: NormalizedMarket
    polymarket: NormalizedMarket
    score: float  # 0–100, average of token_set_ratio, token_sort_ratio, and partial_ratio


# Titles starting with open-ended question words indicate a multi-choice
# sub-market (e.g. Kalshi "Who will win?" events where each candidate leg
# shares the event question as its title rather than a binary question).
_OPEN_QUESTION = re.compile(r'^(who|what|which|how|when|where)\b', re.IGNORECASE)


def _is_binary(m: NormalizedMarket) -> bool:
    """True iff the market is a genuine Yes/No binary question.

    Rejects:
      - markets with non-Yes/No outcomes (multi-choice or missing)
      - Kalshi sub-legs whose title is an open question (Who/What/Which/…),
        indicating a multi-choice event where each option is a binary leg

    Note: Polymarket negRisk markets are NOT filtered here — Polymarket uses
    negRisk for ~94% of its markets including valid nomination matches.
    """
    if _OPEN_QUESTION.match(m.title):
        return False
    return {x.lower() for x in m.outcomes} == {"yes", "no"}


def _score(a: str, b: str) -> float:
    """fuzzy_score on canonicalized titles."""
    return fuzzy_score(canon(a), canon(b))


def find_matches(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_score: float = 83.0,
    max_time_delta: timedelta = timedelta(days=14),
    min_event_score: float = 70.0,
) -> list[MatchResult]:
    """Return scored (kalshi, polymarket) pairs that likely describe the same event.

    Pipeline:
      1. Drop Kalshi MVE markets and any non-binary (non Yes/No) market on either side.
      2. Event-title blocking: group by event_title, fuzzy-match event groups
         (threshold min_event_score), collect all within-group (k, p) pairs.
      3. Time-gate fallback: for Kalshi markets not covered by event matching,
         use ±max_time_delta against all Polymarket markets.
      4. Score each unique candidate pair with (token_set_ratio + partial_ratio) / 2
         on canonicalized titles.
      5. Keep pairs at or above min_score, sorted best-first.
    """
    eligible = [k for k in kalshi if not k.is_mve and _is_binary(k)]
    poly_binary = [p for p in polymarket if _is_binary(p)]

    # Layer 1: event-title blocking
    ev_pairs = event_candidates(eligible, poly_binary, min_event_score)

    # Layer 2: time-gate fallback for all eligible Kalshi markets.
    # Running on all eligible (not just ungrouped) ensures that a false-positive
    # event match at the 70.0 threshold doesn't permanently suppress a market's
    # second chance. The seen set below prevents any pair from being scored twice.
    time_pairs = close_time_gate(eligible, poly_binary, max_time_delta)

    # Score all unique (k, p) candidates
    seen: set[tuple[str, str]] = set()
    results: list[MatchResult] = []

    for k, p in itertools.chain(ev_pairs, time_pairs):
        key = (k.platform_id, p.platform_id)
        if key in seen:
            continue
        seen.add(key)
        k_date = k.resolution_date or k.close_time
        p_date = p.resolution_date or p.close_time
        if (k_date and p_date and abs(k_date - p_date) > max_time_delta):
            continue
        score = _score(k.title, p.title)
        if score >= min_score:
            results.append(MatchResult(k, p, round(score, 1)))

    results.sort(key=lambda r: r.score, reverse=True)

    # Greedy 1-to-1 assignment: iterate best-first, keep a match only if
    # neither market has already been claimed.  O(n) after the sort.
    used_k: set[str] = set()
    used_p: set[str] = set()
    one_to_one: list[MatchResult] = []
    for r in results:
        if r.kalshi.platform_id not in used_k and r.polymarket.platform_id not in used_p:
            one_to_one.append(r)
            used_k.add(r.kalshi.platform_id)
            used_p.add(r.polymarket.platform_id)

    return one_to_one
