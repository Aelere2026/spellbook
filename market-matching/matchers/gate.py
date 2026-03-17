from bisect import bisect_left, bisect_right
from datetime import timedelta
from normalizers.models import NormalizedMarket


def _res(m: NormalizedMarket):
    """Resolution date for gating; falls back to close_time if not set."""
    return m.resolution_date or m.close_time


def close_time_gate(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    max_delta: timedelta = timedelta(days=3),
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return all (kalshi, polymarket) pairs whose resolution dates are within max_delta.

    Uses resolution_date in preference to close_time — on Kalshi these differ
    (close_time = trading stop, resolution_date = event settlement).
    Pairs where either market has no resolution date (and no close_time) are excluded.
    Polymarket list is sorted once; each kalshi market binary-searches the window.
    O(m log m + n log m + output) vs O(n*m) brute force.
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
        for p in pm_markets[lo:hi]:
            results.append((k, p))
    return results
