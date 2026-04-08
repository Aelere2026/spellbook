from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
import time

from fetchers.kalshi import pull_kalshi
from fetchers.polymarket import pull_polymarket
from normalizers.kalshi import normalize_kalshi
from normalizers.polymarket import normalize_polymarket
from matchers.match import find_matches, is_binary
from match_cache import CACHE_PATH, load_cache, save_cache, build_score_cache

OUTPUT = Path("matches.txt")
TIME_WINDOW = timedelta(days=7)
MIN_SCORE = 84.0
BM25_TOP_K = 20  # Polymarket candidates per Kalshi market from BM25 retrieval


def _elapsed(t0: float) -> str:
    return f"{time.monotonic() - t0:.1f}s"


def run():
    run_start = time.monotonic()
    now = datetime.now()
    print(f"[{now.isoformat()}] Starting run")

    # --- Fetch ---
    t = time.monotonic()
    print(f"[fetch] Starting parallel fetch...")
    with ThreadPoolExecutor(max_workers=2) as ex:
        fut_kalshi = ex.submit(pull_kalshi)
        fut_poly   = ex.submit(pull_polymarket)
        raw_kalshi = fut_kalshi.result()
        raw_poly   = fut_poly.result()
    print(f"[fetch] Done in {_elapsed(t)}  |  Kalshi: {len(raw_kalshi)} raw  |  Polymarket: {len(raw_poly)} raw")

    # --- Normalize ---
    t = time.monotonic()
    print(f"[normalize] Normalizing markets...")
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

    binary_kalshi = [k for k in kalshi_markets if is_binary(k)]
    neg_risk_poly = sum(1 for p in poly_markets if p.neg_risk)
    binary_poly   = [p for p in poly_markets if is_binary(p)]
    print(f"[normalize] Done in {_elapsed(t)}  |  Kalshi binary: {len(binary_kalshi)}  |  Polymarket: {len(poly_markets)} total  |  {neg_risk_poly} negRisk  |  {len(binary_poly)} binary")

    # --- Cache ---
    t = time.monotonic()
    print(f"[cache] Loading and building score cache...")
    old_k_fps, old_p_fps, pair_scores = load_cache(CACHE_PATH)
    score_cache = build_score_cache(
        kalshi_markets, poly_markets, old_k_fps, old_p_fps, pair_scores
    )
    print(f"[cache] Done in {_elapsed(t)}  |  {len(score_cache)} unchanged pairs (of {len(pair_scores)} cached)")

    # --- Match ---
    t = time.monotonic()
    print(f"[match] Finding matches...")
    matches, all_scores = find_matches(kalshi_markets, poly_markets,
                                       min_score=MIN_SCORE, max_time_delta=TIME_WINDOW,
                                       score_cache=score_cache, bm25_top_k=BM25_TOP_K)
    print(f"[match] Done in {_elapsed(t)}  |  {len(matches)} matches found  |  {len(all_scores)} pairs scored")

    # --- Save cache ---
    t = time.monotonic()
    save_cache(CACHE_PATH, kalshi_markets, poly_markets, all_scores)
    print(f"[cache] Saved in {_elapsed(t)}")

    try:
        t = time.monotonic()
        from db import persist_matches
        saved = persist_matches(matches)
        print(f"[db] Persisted {saved} matches in {_elapsed(t)}")
    except Exception as e:
        print(f"[db] Skipped: {e}")

    lines = [
        f"Generated:   {now.isoformat()}",
        f"Kalshi:      {len(raw_kalshi)} fetched  |  {len(binary_kalshi)} binary",
        f"Polymarket:  {len(raw_poly)} fetched  |  {neg_risk_poly} negRisk  |  {len(binary_poly)} binary",
        f"Time window: ±{TIME_WINDOW.days} days",
        f"Min score:   {MIN_SCORE}",
        f"Matches:     {len(matches)}",
        "",
    ]

    for i, m in enumerate(matches, 1):
        k_close = m.kalshi.close_time.date() if m.kalshi.close_time else "?"
        p_close = m.polymarket.close_time.date() if m.polymarket.close_time else "?"
        k_url = f"https://kalshi.com/events/{m.kalshi.platform_id}"
        p_url = f"https://polymarket.com/market/{m.polymarket.slug}"
        lines += [
            f"[{i}] score={m.score:.1f}",
            f"  K  {m.kalshi.title}",
            f"     {k_url}  |  {m.kalshi.platform_id}  |  closes {k_close}",
            f"  P  {m.polymarket.title}",
            f"     {p_url}  |  {m.polymarket.platform_id}  |  closes {p_close}",
            "",
        ]

    OUTPUT.write_text("\n".join(lines))
    print(f"[done] Written to {OUTPUT.resolve()}  |  Total: {_elapsed(run_start)}")


if __name__ == "__main__":
    run()
