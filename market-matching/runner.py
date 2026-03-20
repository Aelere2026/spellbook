from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path

from fetchers.kalshi import pull_kalshi
from fetchers.polymarket import pull_polymarket
from normalizers.kalshi import normalize_kalshi
from normalizers.polymarket import normalize_polymarket
from matchers.match import find_matches, _is_binary

OUTPUT = Path("matches.txt")
TIME_WINDOW = timedelta(days=7)
MIN_SCORE = 84.0


def run():
    now = datetime.now()
    print(f"[{now.isoformat()}] Fetching markets...")

    with ThreadPoolExecutor(max_workers=2) as ex:
        fut_kalshi = ex.submit(pull_kalshi)
        fut_poly   = ex.submit(pull_polymarket)
        raw_kalshi = fut_kalshi.result()
        raw_poly   = fut_poly.result()

    print(f"  Kalshi:     {len(raw_kalshi)} raw")
    print(f"  Polymarket: {len(raw_poly)} raw")

    kalshi_markets = []
    for m in raw_kalshi:
        try:
            kalshi_markets.append(normalize_kalshi(m))
        except Exception as e:
            print(f"  [warn] kalshi normalize failed for {m.get('ticker')}: {e}")

    poly_markets = []
    for m in raw_poly:
        try:
            poly_markets.append(normalize_polymarket(m))
        except Exception as e:
            print(f"  [warn] polymarket normalize failed for {m.get('conditionId')}: {e}")

    eligible_kalshi = [k for k in kalshi_markets if not k.is_mve]
    binary_kalshi   = [k for k in eligible_kalshi if _is_binary(k)]
    neg_risk_poly   = sum(1 for p in poly_markets if p.neg_risk)
    binary_poly     = [p for p in poly_markets    if _is_binary(p)]
    print(f"  Kalshi after MVE filter: {len(eligible_kalshi)}  |  binary: {len(binary_kalshi)}")
    print(f"  Polymarket: {len(poly_markets)} total  |  {neg_risk_poly} negRisk dropped  |  {len(binary_poly)} binary")

    matches = find_matches(kalshi_markets, poly_markets,
                           min_score=MIN_SCORE, max_time_delta=TIME_WINDOW)
    print(f"  Matches found: {len(matches)}")

    try:
        from db import persist_matches
        saved = persist_matches(matches)
        print(f"  Persisted to DB: {saved} matches")
    except Exception as e:
        print(f"  [warn] DB persist failed: {e}")

    lines = [
        f"Generated:   {now.isoformat()}",
        f"Kalshi:      {len(raw_kalshi)} fetched  |  {len(eligible_kalshi)} non-MVE  |  {len(binary_kalshi)} binary",
        f"Polymarket:  {len(raw_poly)} fetched  |  {neg_risk_poly} negRisk  |  {len(binary_poly)} binary",
        f"Time window: ±{TIME_WINDOW.days} days",
        f"Min score:   {MIN_SCORE}",
        f"Matches:     {len(matches)}",
        "",
    ]

    for i, m in enumerate(matches, 1):
        k_close = m.kalshi.close_time.date() if m.kalshi.close_time else "?"
        p_close = m.polymarket.close_time.date() if m.polymarket.close_time else "?"
        lines += [
            f"[{i}] score={m.score:.1f}",
            f"  K  {m.kalshi.title}",
            f"     {m.kalshi.platform_id}  |  closes {k_close}",
            f"  P  {m.polymarket.title}",
            f"     {m.polymarket.platform_id}  |  closes {p_close}",
            "",
        ]

    OUTPUT.write_text("\n".join(lines))
    print(f"  Written to {OUTPUT.resolve()}")


if __name__ == "__main__":
    run()
