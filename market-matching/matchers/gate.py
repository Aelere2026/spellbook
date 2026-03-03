from bisect import bisect_left, bisect_right
from datetime import timedelta
from normalizers.models import NormalizedMarket


def close_time_gate(
    kalshi: list[NormalizedMarket],
    polymarket: list[NormalizedMarket],
    max_delta: timedelta = timedelta(days=3),
) -> list[tuple[NormalizedMarket, NormalizedMarket]]:
    """Return all (kalshi, polymarket) pairs whose close times are within max_delta.

    Pairs where either market has no close_time are excluded.
    Polymarket list is sorted once; each kalshi market binary-searches the window.
    O(m log m + n log m + output) vs O(n*m) brute force.
    """
    pm_sorted = sorted(
        (p for p in polymarket if p.close_time is not None),
        key=lambda p: p.close_time,
    )
    pm_times = [p.close_time for p in pm_sorted]

    results = []
    for k in kalshi:
        if k.close_time is None:
            continue
        lo = bisect_left(pm_times, k.close_time - max_delta)
        hi = bisect_right(pm_times, k.close_time + max_delta)
        for p in pm_sorted[lo:hi]:
            results.append((k, p))
    return results
