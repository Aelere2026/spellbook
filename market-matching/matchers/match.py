import re
from dataclasses import dataclass
from datetime import timedelta

from normalizers.models import NormalizedMarket
from matchers.utils import canon, fuzzy_score
from matchers.bm25 import bm25_candidates


@dataclass
class MatchResult:
    kalshi: NormalizedMarket
    polymarket: NormalizedMarket
    score: float  # 0–100, average of token_set_ratio, token_sort_ratio, and partial_ratio


# Titles starting with open-ended question words indicate a multi-choice
# sub-market (e.g. Kalshi "Who will win?" events where each candidate leg
# shares the event question as its title rather than a binary question).
_OPEN_QUESTION = re.compile(r'^(who|what|which|how|when|where)\b', re.IGNORECASE)


def is_binary(m: NormalizedMarket) -> bool:
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


def find_matches(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_score: float = 83.0,
    max_time_delta: timedelta = timedelta(days=14),
    score_cache: dict[tuple[str, str], float] | None = None,
    bm25_top_k: int = 20,
) -> tuple[list[MatchResult], dict[tuple[str, str], float]]:
    """Return scored (kalshi, polymarket) pairs that likely describe the same event.

    Pipeline:
      1. Drop any non-binary (non Yes/No) market on either side.
      2. BM25 candidate generation: build an index over Polymarket titles,
         query with each Kalshi title, retrieve top bm25_top_k candidates
         with at least one shared token.
      3. Time-gate: discard pairs whose resolution dates differ by more than
         max_time_delta (applied as a post-filter so BM25 handles all recall).
      4. Score each unique candidate pair with (token_set_ratio + token_sort_ratio
         + partial_ratio) / 3 on canonicalized titles. Cached scores are reused
         for pairs where both market fingerprints are unchanged since last run.
      5. Keep pairs at or above min_score, sorted best-first.
      6. Greedy 1-to-1 assignment: each market appears in at most one match.
    """
    eligible = [k for k in kalshi if is_binary(k)]
    poly_binary = [p for p in polymarket if is_binary(p)]

    # Candidate generation via BM25
    raw_pairs = bm25_candidates(eligible, poly_binary, top_k=bm25_top_k)

    # Dedup and time post-filter
    seen: set[tuple[str, str]] = set()
    candidates: list[tuple[NormalizedMarket, NormalizedMarket, tuple[str, str]]] = []
    for k, p in raw_pairs:
        key = (k.platform_id, p.platform_id)
        if key in seen:
            continue
        seen.add(key)
        k_date = k.resolution_date or k.close_time
        p_date = p.resolution_date or p.close_time
        if k_date and p_date and abs(k_date - p_date) > max_time_delta:
            continue
        candidates.append((k, p, key))

    # Score candidates, using cache where available
    all_scores: dict[tuple[str, str], float] = {}
    results: list[MatchResult] = []
    for k, p, key in candidates:
        cached = score_cache.get(key) if score_cache is not None else None
        score = cached if cached is not None else fuzzy_score(canon(k.title), canon(p.title))
        all_scores[key] = score
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

    return one_to_one, all_scores
