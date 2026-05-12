from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import os
from pathlib import Path
import time

from fetchers.kalshi import pull_kalshi
from fetchers.polymarket import pull_polymarket
from normalizers.kalshi import normalize_kalshi
from normalizers.polymarket import normalize_polymarket
from matchers.match import find_matches, is_binary
from match_cache import CACHE_PATH, load_cache, save_cache, build_score_cache

OUTPUT = Path("matches.txt")
OUTPUT_LLM = Path("matches_llm.txt")
TIME_WINDOW = timedelta(days=7)
MIN_SCORE = 84.0
BM25_TOP_K = 20  # Polymarket candidates per Kalshi market from BM25 retrieval
LLM_VERIFY_ENABLED = os.getenv("LLM_VERIFY_ENABLED", "").lower() in {"1", "true", "yes", "on"}
LLM_REVIEW_MIN_SCORE = float(os.getenv("LLM_REVIEW_MIN_SCORE", "85.0"))
LLM_AUTO_ACCEPT_SCORE = float(os.getenv("LLM_AUTO_ACCEPT_SCORE", "92.0"))
LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:8b")
LLM_ENDPOINT = os.getenv("LLM_ENDPOINT", "http://localhost:11434/api/chat")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "120.0"))
LLM_MAX_REVIEWS = os.getenv("LLM_MAX_REVIEWS")
LLM_PROGRESS_INTERVAL = int(os.getenv("LLM_PROGRESS_INTERVAL", "25"))


def _elapsed(t0: float) -> str:
    return f"{time.monotonic() - t0:.1f}s"


def _market_report_lines(index: int, score: float, kalshi, polymarket) -> list[str]:
    k_close = kalshi.close_time.date() if kalshi.close_time else "?"
    p_close = polymarket.close_time.date() if polymarket.close_time else "?"
    k_url = f"https://kalshi.com/events/{kalshi.platform_id}"
    p_url = f"https://polymarket.com/market/{polymarket.slug}"
    return [
        f"[{index}] score={score:.1f}",
        f"  K  {kalshi.title}",
        f"     {k_url}  |  {kalshi.platform_id}  |  closes {k_close}",
        f"  P  {polymarket.title}",
        f"     {p_url}  |  {polymarket.platform_id}  |  closes {p_close}",
    ]


def filter_open_markets(markets: list, now: datetime) -> tuple[list, int]:
    """Return markets that have not closed yet.

    Markets with missing close_time are kept. Some platforms omit close times,
    and the matcher can still use title/resolution data for those.
    """
    open_markets = [m for m in markets if m.close_time is None or m.close_time >= now]
    return open_markets, len(markets) - len(open_markets)


def build_llm_report(now: datetime, verifier) -> str:
    approved = [r for r in verifier.reviews if r.verdict.is_match]
    rejected = [r for r in verifier.reviews if not r.verdict.is_match]

    lines = [
        f"Generated:       {now.isoformat()}",
        f"Model:           {verifier.model}",
        f"Review band:     {verifier.review_min_score:.1f} <= score < {verifier.auto_accept_score:.1f}",
        f"LLM calls:       {verifier.calls}",
        f"LLM cache hits:  {verifier.cache_hits}",
        f"Skipped by cap:  {verifier.skipped_after_cap}",
        f"LLM approved:    {len(approved)}",
        f"LLM rejected:    {len(rejected)}",
        "",
        "LLM APPROVED",
        "",
    ]

    if approved:
        for i, review in enumerate(approved, 1):
            source = "cache" if review.verdict.cached else "live"
            lines += _market_report_lines(i, review.score, review.kalshi, review.polymarket)
            lines += [
                f"  LLM confidence={review.verdict.confidence:.2f}  |  source={source}",
                f"  Reason: {review.verdict.reason}",
                "",
            ]
    else:
        lines += ["  none", ""]

    lines += ["LLM REJECTED", ""]

    if rejected:
        for i, review in enumerate(rejected, 1):
            source = "cache" if review.verdict.cached else "live"
            lines += _market_report_lines(i, review.score, review.kalshi, review.polymarket)
            lines += [
                f"  LLM confidence={review.verdict.confidence:.2f}  |  source={source}",
                f"  Reason: {review.verdict.reason}",
                "",
            ]
    else:
        lines += ["  none", ""]

    return "\n".join(lines)


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

    # --- Open-market filter ---
    t = time.monotonic()
    kalshi_markets, closed_kalshi = filter_open_markets(kalshi_markets, now)
    poly_markets, closed_poly = filter_open_markets(poly_markets, now)
    binary_kalshi = [k for k in kalshi_markets if is_binary(k)]
    neg_risk_poly = sum(1 for p in poly_markets if p.neg_risk)
    binary_poly = [p for p in poly_markets if is_binary(p)]
    print(
        f"[filter] Removed closed markets in {_elapsed(t)}  |  "
        f"Kalshi closed: {closed_kalshi}  |  Polymarket closed: {closed_poly}"
    )

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
    verifier = None
    match_verifier = None
    min_score = MIN_SCORE
    if LLM_VERIFY_ENABLED:
        from llm_verifier import LLMMatchVerifier
        verifier = LLMMatchVerifier(
            model=LLM_MODEL,
            endpoint=LLM_ENDPOINT,
            review_min_score=LLM_REVIEW_MIN_SCORE,
            auto_accept_score=LLM_AUTO_ACCEPT_SCORE,
            timeout_seconds=LLM_TIMEOUT_SECONDS,
            max_reviews=int(LLM_MAX_REVIEWS) if LLM_MAX_REVIEWS else None,
            progress_interval=LLM_PROGRESS_INTERVAL,
        )
        match_verifier = verifier.verify
        min_score = LLM_REVIEW_MIN_SCORE
        print(
            f"[match] LLM verifier enabled  |  model={LLM_MODEL}  |  "
            f"review {LLM_REVIEW_MIN_SCORE:.1f}-{LLM_AUTO_ACCEPT_SCORE:.1f}"
        )
        if LLM_MAX_REVIEWS:
            print(f"[match] LLM review cap enabled  |  max_reviews={LLM_MAX_REVIEWS}")

    matches, all_scores = find_matches(
        kalshi_markets,
        poly_markets,
        min_score=min_score,
        max_time_delta=TIME_WINDOW,
        score_cache=score_cache,
        idf_top_k=BM25_TOP_K,
        match_verifier=match_verifier,
    )
    llm_stats = ""
    if verifier is not None:
        verifier.save()
        OUTPUT_LLM.write_text(build_llm_report(now, verifier))
        llm_stats = f"  |  LLM calls: {verifier.calls}  |  LLM cache hits: {verifier.cache_hits}"
    print(f"[match] Done in {_elapsed(t)}  |  {len(matches)} matches found  |  {len(all_scores)} pairs scored{llm_stats}")

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
        f"Kalshi:      {len(raw_kalshi)} fetched  |  {closed_kalshi} closed filtered  |  {len(binary_kalshi)} binary open",
        f"Polymarket:  {len(raw_poly)} fetched  |  {closed_poly} closed filtered  |  {neg_risk_poly} negRisk open  |  {len(binary_poly)} binary open",
        f"Time window: ±{TIME_WINDOW.days} days",
        f"Min score:   {min_score}",
        f"LLM verify:  {'on' if LLM_VERIFY_ENABLED else 'off'}",
        f"Matches:     {len(matches)}",
        "",
    ]

    for i, m in enumerate(matches, 1):
        lines += _market_report_lines(i, m.score, m.kalshi, m.polymarket)
        lines.append("")

    OUTPUT.write_text("\n".join(lines))
    if verifier is not None:
        print(f"[done] Written LLM review report to {OUTPUT_LLM.resolve()}")
    print(f"[done] Written to {OUTPUT.resolve()}  |  Total: {_elapsed(run_start)}")


if __name__ == "__main__":
    run()
