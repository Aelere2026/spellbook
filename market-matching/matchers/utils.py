import re
from functools import lru_cache

from rapidfuzz import fuzz

_NUM_K   = re.compile(r'\$(\d+(?:\.\d+)?)k\b', re.IGNORECASE)  # $100k → $100000
_NUM_COM = re.compile(r'\d{1,3}(?:,\d{3})+')                    # 1,000,000 → 1000000

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


@lru_cache(maxsize=8192)
def canon(title: str) -> str:
    """Return a canonicalized title for fuzzy scoring.

    Transforms (applied in order):
      - lowercase
      - number abbreviations: $1.5k → $1500, $100,000 → $100000
      - verb/noun inflections: wins/winning/winner → win, etc.

    The original NormalizedMarket.title is never mutated; canon() is called
    only at scoring/grouping time.
    """
    t = title.lower().strip()
    t = _NUM_K.sub(lambda m: f'${int(float(m.group(1)) * 1000)}', t)
    t = _NUM_COM.sub(lambda m: m.group(0).replace(',', ''), t)
    for pat, rep in _SYNONYMS:
        t = pat.sub(rep, t)
    return t


def fuzzy_score(a: str, b: str) -> float:
    """Blended fuzzy score on already-canonicalized strings.

    Averages three metrics:
      - token_set_ratio:  handles word-order and subset differences well, but is
                          too lenient when titles share a long boilerplate template
                          yet differ in the discriminating tokens (e.g. a threshold
                          question vs a "most seats" question in the same election).
      - token_sort_ratio: sorts tokens before comparing, so it still tolerates
                          word-order variation but keeps ALL tokens in the
                          comparison — penalizing titles that differ in key words.
      - partial_ratio:    substring match; catches cases where one title is a
                          shorter restatement of the other.

    Using all three together rewards genuine paraphrases while down-scoring pairs
    that only share a common template (e.g. "…2026 Colombian Chamber election").
    """
    tset  = fuzz.token_set_ratio(a, b)
    tsort = fuzz.token_sort_ratio(a, b)
    part  = fuzz.partial_ratio(a, b)
    return (tset + tsort + part) / 3
