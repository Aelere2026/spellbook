import math
import re

from normalizers.models import NormalizedMarket
from matchers.utils import canon


def _tokenize(title: str) -> list[str]:
    return re.findall(r'\w+', canon(title))


def bm25_candidates(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    top_k: int = 20,
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return (kalshi, polymarket) candidate pairs via inverted-index retrieval.

    Builds an inverted index over canonicalized Polymarket titles, then for
    each Kalshi market scores candidates by IDF-weighted token overlap and
    returns the top_k highest-scoring Polymarket markets.

    Tokens appearing in more than 30% of the corpus are treated as stop words
    and excluded from both the index and queries — they have near-zero IDF and
    would otherwise cause expensive postings-list scans without helping recall.
    """
    if not kalshi or not polymarket:
        return []

    n = len(polymarket)
    stop_threshold = n * 0.30

    # Build inverted index: token -> list of poly indices
    corpus_tokens: list[set[str]] = []
    raw_index: dict[str, list[int]] = {}
    for i, p in enumerate(polymarket):
        tokens = set(_tokenize(p.title))
        corpus_tokens.append(tokens)
        for token in tokens:
            raw_index.setdefault(token, []).append(i)

    # Drop stop-word tokens and precompute IDF for the rest
    index: dict[str, list[int]] = {}
    idf: dict[str, float] = {}
    for token, postings in raw_index.items():
        df = len(postings)
        if df <= stop_threshold:
            index[token] = postings
            idf[token] = math.log((n - df + 0.5) / (df + 0.5) + 1)

    results: list[tuple[NormalizedMarket, NormalizedMarket]] = []
    for k in kalshi:
        query_tokens = [t for t in _tokenize(k.title) if t in index]
        if not query_tokens:
            continue

        scores: dict[int, float] = {}
        for token in query_tokens:
            w = idf[token]
            for p_idx in index[token]:
                scores[p_idx] = scores.get(p_idx, 0.0) + w

        top = sorted(scores, key=scores.__getitem__, reverse=True)[:top_k]
        for i in top:
            results.append((k, polymarket[i]))

    return results
