import re
from dataclasses import dataclass
from datetime import timedelta

from rapidfuzz import fuzz

from normalizers.models import NormalizedMarket
from matchers.gate import close_time_gate

# ---------------------------------------------------------------------------
# Title canonicalization
# ---------------------------------------------------------------------------

_NUM_K   = re.compile(r'\$(\d+(?:\.\d+)?)k\b', re.IGNORECASE)  # $100k → $100000
_NUM_COM = re.compile(r'\d{1,3}(?:,\d{3})+')                    # 1,000,000 → 1000000

# Each tuple: (compiled pattern, canonical replacement).
# Normalize inflected forms so the fuzzy scorer works on stems.
# Deliberately excludes nominee/nomination — collapsing them inflates
# token_set_ratio for same-surname different-candidate pairs.
_SYNONYMS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bwins?\b|\bwinning\b|\bwinner\b'),        'win'),
    (re.compile(r'\bbeats?\b|\bbeaten\b|\bbeating\b'),       'beat'),
    (re.compile(r'\bexceeds?\b|\bexceeded\b|\bexceeding\b'), 'exceed'),
    (re.compile(r'\bpasses?\b|\bpassed\b|\bpassing\b'),      'pass'),
    (re.compile(r'\breaches?\b|\breached\b|\breaching\b'),   'reach'),
    (re.compile(r'\bchampionship\b'),                        'champion'),
]


def _canon(title: str) -> str:
    """Return a canonicalized title for fuzzy scoring.

    Transforms (applied in order):
      - lowercase
      - number abbreviations: $1.5k → $1500, $100,000 → $100000
      - verb/noun inflections: wins/winning/winner → win, etc.

    NormalizedMarket.title is never mutated; _canon() is called only inside
    _score() so the original text is preserved for display.
    """
    t = title.lower().strip()
    t = _NUM_K.sub(lambda m: f'${int(float(m.group(1)) * 1000)}', t)
    t = _NUM_COM.sub(lambda m: m.group(0).replace(',', ''), t)
    for pat, rep in _SYNONYMS:
        t = pat.sub(rep, t)
    return t


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

@dataclass
class MatchResult:
    kalshi: NormalizedMarket
    polymarket: NormalizedMarket
    score: float  # 0–100, average of token_set_ratio and partial_ratio


def _score(a: str, b: str) -> float:
    """Average of token_set_ratio and partial_ratio on canonicalized titles.

    token_set_ratio handles word-order and rephrasing ("nominee" vs "nomination").
    partial_ratio penalises topic divergence ("nomination" vs "election").
    Both run on _canon() output so verb inflections and number formats
    don't artificially deflate scores.
    """
    a, b = _canon(a), _canon(b)
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
      3. Combined title score (token_set_ratio + partial_ratio) / 2 on _canon() output.
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
