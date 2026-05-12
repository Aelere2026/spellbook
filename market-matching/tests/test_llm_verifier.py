import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

from llm_verifier import LLMMatchVerifier, LLMVerdict, load_llm_cache, save_llm_cache
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
    assert len(verifier.reviews) == 1
    assert verifier.reviews[0].verdict.is_match is True
    assert verifier.reviews[0].verdict.cached is False
    verifier.save()

    def fail_chat(_payload):
        raise AssertionError("cached verifier should not call chat")

    cached = LLMMatchVerifier(cache_path=path, chat_func=fail_chat)
    assert cached.verify(k, p, 88.0)
    assert cached.calls == 0
    assert cached.cache_hits == 1
    assert len(cached.reviews) == 1
    assert cached.reviews[0].verdict.cached is True
    assert len(load_llm_cache(path)) == 1


def test_llm_cache_preserves_false_verdicts():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)

    save_llm_cache(path, {"pair": LLMVerdict(False, 0.81, "different threshold")})
    loaded = load_llm_cache(path)

    assert loaded["pair"].is_match is False
    assert loaded["pair"].confidence == 0.81
    assert loaded["pair"].cached is True


def test_llm_cache_skips_non_boolean_verdicts():
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        f.write(json.dumps({"entries": {"bad": {"is_match": "false"}}}))
        path = Path(f.name)

    assert load_llm_cache(path) == {}


def test_llm_cache_key_changes_when_market_prompt_fields_change():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = Path(f.name)
    path.unlink()

    calls = 0

    def chat(_payload):
        nonlocal calls
        calls += 1
        return {
            "message": {
                "content": json.dumps(
                    {"is_match": True, "confidence": 0.92, "reason": "same event"}
                )
            }
        }

    verifier = LLMMatchVerifier(cache_path=path, chat_func=chat)
    assert verifier.verify(k, p, 88.0)
    assert verifier.verify(k, p, 88.0)

    changed = market(
        "polymarket",
        "P1",
        "Will the Federal Reserve cut interest rates in June 2026?",
        description="Resolution source changed.",
    )
    assert verifier.verify(k, changed, 88.0)

    assert calls == 2
    assert verifier.cache_hits == 1


def test_llm_cache_key_changes_by_model():
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

    first = LLMMatchVerifier(model="qwen3:4b", cache_path=path, chat_func=chat)
    assert first.verify(k, p, 88.0)
    first.save()

    second = LLMMatchVerifier(model="qwen3:8b", cache_path=path, chat_func=chat)
    assert second.verify(k, p, 88.0)
    assert second.cache_hits == 0
    assert second.calls == 1


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
    assert seen["options"]["num_predict"] == 160
    assert seen["options"]["num_ctx"] == 2048
    system_prompt = seen["messages"][0]["content"]
    assert "different dates as a warning" in system_prompt
    assert "not an automatic rejection" in system_prompt
    assert "Do not reject solely because close/resolution dates differ by a day or two" in system_prompt
    prompt = json.loads(seen["messages"][1]["content"])
    assert "event_title" not in prompt["kalshi"]
    assert "event_title" not in prompt["polymarket"]
    assert "series_title" not in prompt["kalshi"]
    assert "series_title" not in prompt["polymarket"]


def test_llm_verifier_truncates_long_descriptions_in_prompt():
    seen = {}
    long_description = "x" * 2000
    verbose = market("polymarket", "P-LONG", p.title, description=long_description)

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
    assert verifier.verify(k, verbose, 88.0)

    prompt = json.loads(seen["messages"][1]["content"])
    assert len(prompt["polymarket"]["description"]) == 1500


def test_llm_verifier_rejects_invalid_review_band():
    with pytest.raises(ValueError):
        LLMMatchVerifier(review_min_score=92.0, auto_accept_score=92.0)


def test_llm_verifier_accepts_high_scores_without_calling_model():
    def fail_chat(_payload):
        raise AssertionError("high scores should bypass LLM")

    verifier = LLMMatchVerifier(chat_func=fail_chat)
    assert verifier.verify(k, p, 92.0)
    assert verifier.calls == 0
    assert verifier.reviews == []


def test_llm_verifier_max_reviews_skips_without_calling_model_again():
    calls = 0

    def chat(_payload):
        nonlocal calls
        calls += 1
        return {
            "message": {
                "content": json.dumps(
                    {"is_match": True, "confidence": 0.92, "reason": "same event"}
                )
            }
        }

    verifier = LLMMatchVerifier(max_reviews=1, progress_interval=0, chat_func=chat)
    changed = market("polymarket", "P2", p.title, description="changed")

    assert verifier.verify(k, p, 88.0)
    assert not verifier.verify(k, changed, 88.0)
    assert calls == 1
    assert len(verifier.reviews) == 1
    assert verifier.skipped_after_cap == 1


def test_llm_verifier_rejects_below_review_band_without_calling_model():
    def fail_chat(_payload):
        raise AssertionError("below-band scores should bypass LLM")

    verifier = LLMMatchVerifier(chat_func=fail_chat)
    assert not verifier.verify(k, p, 84.9)
    assert verifier.calls == 0
    assert verifier.reviews == []


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


def test_llm_verifier_rejects_missing_message_content():
    verifier = LLMMatchVerifier(chat_func=lambda _payload: {"message": {}})

    with pytest.raises(RuntimeError, match="message.content"):
        verifier.verify(k, p, 88.0)


def test_find_matches_uses_optional_verifier_before_assignment():
    k_exact = market("kalshi", "K-EXACT", "Will Bitcoin exceed $100,000 by end of 2026?")
    p_exact = market("polymarket", "P-EXACT", "Will Bitcoin exceed $100,000 by end of 2026?")

    results, _ = find_matches([k_exact], [p_exact], min_score=85.0, match_verifier=lambda *_: False)
    assert results == []

    results, _ = find_matches([k_exact], [p_exact], min_score=85.0, match_verifier=lambda *_: True)
    assert len(results) == 1


def test_find_matches_does_not_call_verifier_for_high_deterministic_rejects():
    k_prop = market("kalshi", "K-PROP", "Stephen Curry: 6+ assists")
    p_prop = market("polymarket", "P-PROP", "Stephen Curry assists O/U 6.5")

    def fail_verifier(*_args):
        raise AssertionError("deterministic rejects should not reach LLM verifier")

    results, _ = find_matches(
        [k_prop],
        [p_prop],
        min_score=85.0,
        score_cache={("K-PROP", "P-PROP"): 99.0},
        match_verifier=fail_verifier,
    )

    assert results == []


def test_find_matches_verifier_can_reject_borderline_cached_score():
    k_exact = market("kalshi", "K-BORDER", "Will Bitcoin exceed $100,000 by end of 2026?")
    p_exact = market("polymarket", "P-BORDER", "Will Bitcoin exceed $100,000 by end of 2026?")

    results, _ = find_matches(
        [k_exact],
        [p_exact],
        min_score=85.0,
        score_cache={("K-BORDER", "P-BORDER"): 88.0},
        match_verifier=lambda *_args: False,
    )

    assert results == []
