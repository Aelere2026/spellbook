import numpy as np
from rapidfuzz import fuzz, process as fuzz_process
from normalizers.models import NormalizedMarket
from matchers.utils import canon


def event_candidates(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_event_score: float = 80.0,
    top_k: int | None = None,
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return (kalshi, polymarket) pairs blocked by event-title similarity.

    Algorithm:
      1. Group each platform's markets by canonicalized event_title.
      2. Score all K_e × P_e event key pairs in one cdist batch call (3 scorers
         averaged to match fuzzy_score), then find the best Polymarket group per
         Kalshi group via argmax — O(K_e * P_e) SIMD ops instead of Python calls.
      3. If best score >= min_event_score, emit market pairs within the two groups.
         If top_k is set, each Kalshi market keeps only its top_k Polymarket
         candidates (ranked by token_sort_ratio) instead of the full cross-product.

    Markets with no event_title on either side are skipped; find_matches uses
    close_time_gate as a fallback for them.
    """
    k_groups: dict[str, list[NormalizedMarket]] = {}
    for m in kalshi:
        if m.event_title:
            k_groups.setdefault(canon(m.event_title), []).append(m)

    p_groups: dict[str, list[NormalizedMarket]] = {}
    for m in polymarket:
        if m.event_title:
            p_groups.setdefault(canon(m.event_title), []).append(m)

    if not k_groups or not p_groups:
        return []

    k_event_keys = list(k_groups.keys())
    p_event_keys = list(p_groups.keys())

    # Batch score all K_e × P_e event key pairs — far faster than a Python loop
    tset  = fuzz_process.cdist(k_event_keys, p_event_keys, scorer=fuzz.token_set_ratio)
    tsort = fuzz_process.cdist(k_event_keys, p_event_keys, scorer=fuzz.token_sort_ratio)
    part  = fuzz_process.cdist(k_event_keys, p_event_keys, scorer=fuzz.partial_ratio)
    score_matrix = (tset.astype(float) + tsort.astype(float) + part.astype(float)) / 3

    results: list[tuple[NormalizedMarket, NormalizedMarket]] = []

    for i, k_event in enumerate(k_event_keys):
        j = int(np.argmax(score_matrix[i]))
        best_score = score_matrix[i, j]
        if best_score >= min_event_score:
            p_markets = p_groups[p_event_keys[j]]
            for k in k_groups[k_event]:
                if top_k is not None and len(p_markets) > top_k:
                    k_canon = canon(k.title)
                    filtered = sorted(
                        p_markets,
                        key=lambda p: fuzz.token_sort_ratio(k_canon, canon(p.title)),
                        reverse=True,
                    )[:top_k]
                else:
                    filtered = p_markets
                for p in filtered:
                    results.append((k, p))

    return results
