import re

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
    """(token_set_ratio + partial_ratio) / 2 on already-canonicalized strings."""
    return (fuzz.token_set_ratio(a, b) + fuzz.partial_ratio(a, b)) / 2
