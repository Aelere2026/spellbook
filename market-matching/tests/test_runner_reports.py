import json
from datetime import datetime, timedelta, timezone

from llm_verifier import LLMMatchVerifier
from normalizers.models import NormalizedMarket
from runner import build_llm_report, filter_open_markets

T = datetime(2026, 6, 1, tzinfo=timezone.utc)


def market(platform, pid, title, slug=None, close_time=T):
    return NormalizedMarket(
        platform=platform,
        platform_id=pid,
        title=title,
        description="",
        close_time=close_time,
        resolution_date=T,
        outcomes=["Yes", "No"],
        event_title=None,
        series_title=None,
        slug=slug,
    )


def test_build_llm_report_separates_approved_and_rejected_reviews():
    responses = iter(
        [
            {"is_match": True, "confidence": 0.91, "reason": "same event"},
            {"is_match": False, "confidence": 0.94, "reason": "different event"},
        ]
    )

    def chat(_payload):
        return {"message": {"content": json.dumps(next(responses))}}

    verifier = LLMMatchVerifier(model="qwen3:4b", chat_func=chat)

    btc_k = market("kalshi", "K-BTC", "Will Bitcoin exceed $100,000 by end of 2026?")
    btc_p = market("polymarket", "P-BTC", "Will Bitcoin exceed $100,000 by end of 2026?", "btc-100k")
    wc_k = market("kalshi", "K-WC", "Will Bitcoin exceed $100,000 by end of 2026?")
    wc_p = market("polymarket", "P-WC", "Will Argentina win the 2026 World Cup?", "argentina-world-cup")

    assert verifier.verify(btc_k, btc_p, 88.0)
    assert not verifier.verify(wc_k, wc_p, 87.0)
    verifier.skipped_after_cap = 3

    report = build_llm_report(datetime(2026, 6, 2, tzinfo=timezone.utc), verifier)

    assert "Model:           qwen3:4b" in report
    assert "LLM approved:    1" in report
    assert "LLM rejected:    1" in report
    assert "Skipped by cap:  3" in report
    assert "LLM APPROVED" in report
    assert "LLM REJECTED" in report
    assert "Reason: same event" in report
    assert "Reason: different event" in report
    assert "source=live" in report
    assert "btc-100k" in report
    assert "argentina-world-cup" in report


def test_filter_open_markets_removes_closed_and_keeps_missing_close_time():
    now = datetime(2026, 6, 1, 12, tzinfo=timezone.utc)
    closed = market("kalshi", "K-CLOSED", "Closed market", close_time=now - timedelta(seconds=1))
    open_market = market("kalshi", "K-OPEN", "Open market", close_time=now)
    missing_close = market("polymarket", "P-MISSING", "Missing close market", close_time=None)

    markets, removed = filter_open_markets([closed, open_market, missing_close], now)

    assert removed == 1
    assert [m.platform_id for m in markets] == ["K-OPEN", "P-MISSING"]
