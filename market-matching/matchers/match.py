import re
from dataclasses import dataclass
from datetime import timedelta
from typing import Callable

from normalizers.models import NormalizedMarket
from matchers.utils import canon, fuzzy_score
from matchers.idf_retrieval import idf_candidates


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


_TITLE_YEAR = re.compile(r'\b(20\d{2})\b')


def _year_mismatch(k: NormalizedMarket, p: NormalizedMarket) -> bool:
    """Return True if the known resolution date is incompatible with a year
    stated explicitly in the other side's title.

    Handles the case where one platform omits a close date but the title
    says e.g. "in 2026" while the other side's market closes in 2029 (a
    different election cycle).  A tolerance of ±1 year is allowed so that
    a 2026-election market resolving in January 2027 is not rejected.

    Only fires when exactly one side is missing a date AND the other side's
    title contains an explicit year — if both dates are present the time
    gate already handles cycle mismatches.
    """
    k_date = k.resolution_date or k.close_time
    p_date = p.resolution_date or p.close_time
    if k_date and p_date:
        return False  # time gate handles this

    if k_date and not p_date:
        p_years = {int(y) for y in _TITLE_YEAR.findall(p.title)}
        return bool(p_years and not any(abs(k_date.year - y) <= 1 for y in p_years))

    if p_date and not k_date:
        k_years = {int(y) for y in _TITLE_YEAR.findall(k.title)}
        return bool(k_years and not any(abs(p_date.year - y) <= 1 for y in k_years))

    return False


_KALSHI_THRESHOLD = re.compile(r'(\d+(?:\.\d+)?)\+')
_POLY_THRESHOLD   = re.compile(r'[Oo]/[Uu]\s+(\d+(?:\.\d+)?)')


def _prop_threshold_mismatch(k: NormalizedMarket, p: NormalizedMarket) -> bool:
    """Return True if both titles contain a numeric prop threshold.

    Kalshi prop format:  "Player: N+ stat"   (e.g. "15+ points")
    Polymarket format:   "Player: Stat O/U X" (e.g. "Points O/U 12.5")

    Even when thresholds are close, the contracts resolve differently at the
    boundary (e.g. Kalshi "6+" resolves Yes on exactly 6 assists; Polymarket
    "O/U 6.5" resolves No). For a trading bot, any threshold divergence is
    unacceptable, so all prop pairs are rejected.
    """
    k_match = _KALSHI_THRESHOLD.search(k.title)
    p_match = _POLY_THRESHOLD.search(p.title)
    return bool(k_match and p_match)


_FUNCTION_WORDS = frozenset({
    # Grammatical function words
    'will', 'that', 'this', 'from', 'with', 'have', 'them', 'they',
    'were', 'been', 'than', 'also', 'over', 'under', 'their', 'each',
    'both', 'such', 'very', 'some', 'when', 'into', 'upon', 'within',
    'about', 'after', 'before', 'between', 'would', 'could', 'should',
    'does', 'done', 'being', 'while', 'where', 'which', 'these', 'those',
    # Domain-common prediction-market words — appear across many markets
    # regardless of entity, so they carry no entity-discriminating signal.
    # Sports
    'finish', 'season', 'round', 'match', 'game', 'place', 'title',
    'final', 'stage', 'seat', 'least', 'most', 'next', 'last', 'first',
    # Tech / crypto
    'launch', 'token', 'chain', 'network', 'protocol',
    # Financial / general
    'price', 'value', 'level', 'index', 'trade', 'market',
})


def _specific_tokens(title: str) -> frozenset[str]:
    return frozenset(
        t for t in re.findall(r'\w+', canon(title))
        if len(t) >= 4
        and t not in _FUNCTION_WORDS
        and not (t.isdigit() and len(t) == 4)
    )


def _entity_mismatch(k: NormalizedMarket, p: NormalizedMarket) -> bool:
    """Return True if the two titles share no specific tokens and each has its own.

    A "specific token" is a word that is ≥4 chars, not a function word, and not
    a 4-digit year.  If the titles have ZERO specific tokens in common AND each
    side has at least one exclusive specific token, the markets almost certainly
    refer to different entities (e.g. OpenSea vs OpenAI, Paris vs Lazio).

    Requiring zero overlap (not just mutual exclusivity) avoids false rejections
    on valid pairs where platforms phrase the same event differently — as long as
    they share even one meaningful word they are allowed through.

    Prefix overlap is allowed so "trump" and "trumps" don't trigger a mismatch.
    """
    k_spec = _specific_tokens(k.title)
    p_spec = _specific_tokens(p.title)
    if k_spec & p_spec:         # at least one token in common → same entity
        return False
    k_excl = k_spec - p_spec
    p_excl = p_spec - k_spec
    if not k_excl or not p_excl:
        return False
    for kt in k_excl:
        for pt in p_excl:
            if kt.startswith(pt) or pt.startswith(kt):
                return False
    return True


def find_matches(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_score: float = 83.0,
    max_time_delta: timedelta = timedelta(days=14),
    score_cache: dict[tuple[str, str], float] | None = None,
    idf_top_k: int = 20,
    match_verifier: Callable[[NormalizedMarket, NormalizedMarket, float], bool] | None = None,
) -> tuple[list[MatchResult], dict[tuple[str, str], float]]:
    """Return scored (kalshi, polymarket) pairs that likely describe the same event.

    Pipeline:
      1. Drop any non-binary (non Yes/No) market on either side.
      2. BM25 candidate generation: build an index over Polymarket titles,
         query with each Kalshi title, retrieve top idf_top_k candidates
         with at least one shared token.
      3. Time-gate: discard pairs whose resolution dates differ by more than
         max_time_delta (applied as a post-filter so BM25 handles all recall).
      4. Score each unique candidate pair with (token_set_ratio + token_sort_ratio
         + partial_ratio) / 3 on canonicalized titles. Cached scores are reused
         for pairs where both market fingerprints are unchanged since last run.
      5. Keep pairs at or above min_score that pass deterministic guards and,
         if supplied, the optional match_verifier.
      6. Greedy 1-to-1 assignment: each market appears in at most one match.
    """
    eligible = [k for k in kalshi if is_binary(k)]
    poly_binary = [p for p in polymarket if is_binary(p)]

    # Candidate generation via BM25
    raw_pairs = idf_candidates(eligible, poly_binary, top_k=idf_top_k)

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
        if (
            score >= min_score
            and not _year_mismatch(k, p)
            and not _prop_threshold_mismatch(k, p)
            and not _entity_mismatch(k, p)
            and (match_verifier is None or match_verifier(k, p, score))
        ):
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
