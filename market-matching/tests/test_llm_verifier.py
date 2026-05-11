import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from llm_verifier import LLMMatchVerifier, load_llm_cache
from matchers.match import find_matches
from normalizers.models import NormalizedMarket

T = datetime(2026, 6, 1, tzinfo=timezone.utc)


def market(platform, pid, title, description=""):
    return NormalizedMarket(
        platform=platform,
        platform_id=pid,
        title=title,
        description=description,
        close_time=T,
        resolution_date=T,
        outcomes=["Yes", "No"],
        event_title=None,
        series_title=None,
    )


k = market("kalshi", "K1", "Will the Fed cut rates in June 2026?")
p = market("polymarket", "P1", "Will the Federal Reserve cut interest rates in June 2026?")


def test_llm_verifier_reviews_band_and_caches():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    path.unlink()

    def chat(_payload):
        return {
            "message": {
                "content": json.dumps(
                    {"is_match": True, "confidence": 0.92, "reason": "same event"}
                )
            }
        }

    verifier = LLMMatchVerifier(cache_path=path, chat_func=chat)
    assert verifier.verify(k, p, 88.0)
    assert verifier.calls == 1
    verifier.save()

    def fail_chat(_payload):
        raise AssertionError("cached verifier should not call chat")

    cached = LLMMatchVerifier(cache_path=path, chat_func=fail_chat)
    assert cached.verify(k, p, 88.0)
    assert cached.calls == 0
    assert cached.cache_hits == 1
    assert len(load_llm_cache(path)) == 1


def test_llm_verifier_uses_fast_ollama_options():
    seen = {}

    def chat(payload):
        seen.update(payload)
        return {
            "message": {
                "content": json.dumps(
                    {"is_match": True, "confidence": 0.92, "reason": "same event"}
                )
            }
        }

    verifier = LLMMatchVerifier(chat_func=chat)
    assert verifier.verify(k, p, 88.0)
    assert seen["think"] is False
    assert seen["keep_alive"] == "30m"
    assert seen["options"]["num_predict"] == 80
    assert seen["options"]["num_ctx"] == 2048


def test_llm_verifier_accepts_high_scores_without_calling_model():
    def fail_chat(_payload):
        raise AssertionError("high scores should bypass LLM")

    verifier = LLMMatchVerifier(chat_func=fail_chat)
    assert verifier.verify(k, p, 92.0)
    assert verifier.calls == 0


def test_llm_verifier_rejects_below_review_band_without_calling_model():
    def fail_chat(_payload):
        raise AssertionError("below-band scores should bypass LLM")

    verifier = LLMMatchVerifier(chat_func=fail_chat)
    assert not verifier.verify(k, p, 84.9)
    assert verifier.calls == 0


def test_llm_verifier_rejects_string_boolean_response():
    def chat(_payload):
        return {
            "message": {
                "content": json.dumps(
                    {"is_match": "false", "confidence": 0.2, "reason": "different event"}
                )
            }
        }

    verifier = LLMMatchVerifier(chat_func=chat)
    try:
        verifier.verify(k, p, 88.0)
    except RuntimeError as exc:
        assert "Could not parse LLM verifier response" in str(exc)
    else:
        raise AssertionError("string booleans should not be accepted")


def test_find_matches_uses_optional_verifier_before_assignment():
    k_exact = market("kalshi", "K-EXACT", "Will Bitcoin exceed $100,000 by end of 2026?")
    p_exact = market("polymarket", "P-EXACT", "Will Bitcoin exceed $100,000 by end of 2026?")

    results, _ = find_matches([k_exact], [p_exact], min_score=85.0, match_verifier=lambda *_: False)
    assert results == []

    results, _ = find_matches([k_exact], [p_exact], min_score=85.0, match_verifier=lambda *_: True)
    assert len(results) == 1
