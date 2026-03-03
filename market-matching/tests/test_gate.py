from datetime import datetime, timedelta, timezone
from normalizers.models import NormalizedMarket
from matchers.gate import close_time_gate


def market(platform: str, platform_id: str, close_time: datetime | None) -> NormalizedMarket:
    return NormalizedMarket(
        platform=platform,
        platform_id=platform_id,
        title="",
        description="",
        close_time=close_time,
        outcomes=[],
        event_title=None,
        series_title=None,
    )


T = datetime(2026, 1, 1, tzinfo=timezone.utc)
DAY = timedelta(days=1)

k_same   = market("kalshi",     "K1", T)
k_close  = market("kalshi",     "K2", T + timedelta(hours=12))
k_edge   = market("kalshi",     "K3", T + timedelta(days=3))
k_beyond = market("kalshi",     "K4", T + timedelta(days=4))
k_none   = market("kalshi",     "K5", None)

p_anchor = market("polymarket", "P1", T)
p_none   = market("polymarket", "P2", None)

THRESHOLD = timedelta(days=3)


# Exact same close time → included
pairs = close_time_gate([k_same], [p_anchor], THRESHOLD)
assert len(pairs) == 1 and pairs[0] == (k_same, p_anchor), "same time should match"

# 12-hour gap → included
pairs = close_time_gate([k_close], [p_anchor], THRESHOLD)
assert len(pairs) == 1, "12h gap should match"

# Exactly at threshold → included
pairs = close_time_gate([k_edge], [p_anchor], THRESHOLD)
assert len(pairs) == 1, "edge (==threshold) should match"

# Beyond threshold → excluded
pairs = close_time_gate([k_beyond], [p_anchor], THRESHOLD)
assert len(pairs) == 0, "4-day gap should not match"

# None on kalshi side → excluded
pairs = close_time_gate([k_none], [p_anchor], THRESHOLD)
assert len(pairs) == 0, "None kalshi close_time should be excluded"

# None on polymarket side → excluded
pairs = close_time_gate([k_same], [p_none], THRESHOLD)
assert len(pairs) == 0, "None polymarket close_time should be excluded"

# Multiple kalshi, only some match
pairs = close_time_gate([k_same, k_close, k_beyond, k_none], [p_anchor], THRESHOLD)
assert len(pairs) == 2, f"expected 2 matches, got {len(pairs)}"
assert (k_same,  p_anchor) in pairs
assert (k_close, p_anchor) in pairs

# Large polymarket list — only a middle slice should match (exercises bisect indexing)
# polymarket spans Jan 1 to Jan 30, one per day. kalshi closes on Jan 15.
# With a 3-day threshold, only Jan 12–18 (7 markets) should match.
pm_many = [market("polymarket", f"PM{i}", T + timedelta(days=i)) for i in range(30)]
k_mid   = market("kalshi", "KMID", T + timedelta(days=15))
pairs   = close_time_gate([k_mid], pm_many, THRESHOLD)
assert len(pairs) == 7, f"expected 7 matches, got {len(pairs)}"
matched_ids = {p.platform_id for _, p in pairs}
assert matched_ids == {f"PM{i}" for i in range(12, 19)}, f"wrong window: {matched_ids}"

# Unsorted polymarket input — bisect must still produce correct results after internal sort
pm_unsorted = list(reversed(pm_many))
pairs_unsorted = close_time_gate([k_mid], pm_unsorted, THRESHOLD)
assert len(pairs_unsorted) == 7, "unsorted input should give same count"
assert {p.platform_id for _, p in pairs_unsorted} == matched_ids, "unsorted input should give same ids"

print("All tests passed.")
