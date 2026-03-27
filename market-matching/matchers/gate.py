from bisect import bisect_left, bisect_right
from datetime import timedelta
from rapidfuzz import fuzz
from normalizers.models import NormalizedMarket
from matchers.utils import canon


def _res(m: NormalizedMarket):
    """Resolution date for gating; falls back to close_time if not set."""
    return m.resolution_date or m.close_time


def close_time_gate(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    max_delta: timedelta = timedelta(days=3),
    top_k: int | None = None,
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return (kalshi, polymarket) pairs whose resolution dates are within max_delta.

    Uses resolution_date in preference to close_time — on Kalshi these differ
    (close_time = trading stop, resolution_date = event settlement).
    Pairs where either market has no resolution date (and no close_time) are excluded.
    Polymarket list is sorted once; each kalshi market binary-searches the window.
    O(m log m + n log m + output) vs O(n*m) brute force.

    If top_k is set, candidates within the time window are pre-filtered: each
    Kalshi market keeps only its top_k Polymarket candidates ranked by a cheap
    token_sort_ratio pre-score. This cuts the output from O(n * window_size) to
    O(n * top_k), reducing the number of pairs that reach full fuzzy scoring.
    """
    pm_with_date = [(p, _res(p)) for p in polymarket if _res(p) is not None]
    pm_sorted = sorted(pm_with_date, key=lambda x: x[1])
    pm_markets = [p for p, _ in pm_sorted]
    pm_dates   = [d for _, d in pm_sorted]

    results = []
    for k in kalshi:
        k_date = _res(k)
        if k_date is None:
            continue
        lo = bisect_left(pm_dates, k_date - max_delta)
        hi = bisect_right(pm_dates, k_date + max_delta)
        candidates = pm_markets[lo:hi]

        if top_k is not None and len(candidates) > top_k:
            k_canon = canon(k.title)
            candidates = sorted(
                candidates,
                key=lambda p: fuzz.token_sort_ratio(k_canon, canon(p.title)),
                reverse=True,
            )[:top_k]

        for p in candidates:
            results.append((k, p))
    return results
