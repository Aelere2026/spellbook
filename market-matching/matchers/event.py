from normalizers.models import NormalizedMarket
from matchers.utils import canon, fuzzy_score


def event_candidates(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    min_event_score: float = 70.0,
    max_group_pairs: int = 400,
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return (kalshi, polymarket) pairs blocked by event-title similarity.

    Algorithm:
      1. Group each platform's markets by canonicalized event_title.
      2. For each Kalshi event group, find the best-scoring Polymarket event group.
      3. If best score >= min_event_score, emit all (k, p) market pairs within
         the two matched groups.

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

    p_event_keys = list(p_groups.keys())
    results: list[tuple[NormalizedMarket, NormalizedMarket]] = []

    for k_event, k_markets in k_groups.items():
        best_score, best_p_event = max(
            ((fuzzy_score(k_event, pe), pe) for pe in p_event_keys),
            key=lambda t: t[0],
        )
        if best_score >= min_event_score:
            p_markets = p_groups[best_p_event]
            # Cap the cross-product to avoid O(n²) explosion from large event groups
            # (e.g. 50-leg elections events). Truncate the larger side first.
            k_side = k_markets
            p_side = p_markets
            if len(k_side) * len(p_side) > max_group_pairs:
                cap = max(1, max_group_pairs // max(len(k_side), len(p_side)))
                if len(k_side) >= len(p_side):
                    k_side = k_side[:cap]
                else:
                    p_side = p_side[:cap]
            for k in k_side:
                for p in p_side:
                    results.append((k, p))

    return results
