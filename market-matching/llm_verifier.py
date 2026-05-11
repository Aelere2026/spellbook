"""Optional local LLM verifier for borderline market matches.

The matcher should stay deterministic for obvious pairs.  This module is only
for the fuzzy-score band where title similarity is plausible but not decisive.
Verdicts are cached by model, prompt version, and market fingerprints so the
same pair is not re-submitted on every run.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
from typing import Any, Callable

import requests

from normalizers.models import NormalizedMarket

LLM_CACHE_PATH = Path("llm_match_cache.json")
PROMPT_VERSION = "market-match-v1"


@dataclass(frozen=True)
class LLMVerdict:
    is_match: bool
    confidence: float
    reason: str
    cached: bool = False


def _dt(value: Any) -> str | None:
    return value.isoformat() if value else None


def llm_fingerprint(m: NormalizedMarket) -> str:
    """Hash fields used by the LLM prompt."""
    payload = {
        "platform": m.platform,
        "platform_id": m.platform_id,
        "title": m.title,
        "description": m.description,
        "close_time": _dt(m.close_time),
        "resolution_date": _dt(m.resolution_date),
        "outcomes": m.outcomes,
        "event_title": m.event_title,
        "series_title": m.series_title,
        "category": m.category,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def load_llm_cache(path: Path = LLM_CACHE_PATH) -> dict[str, LLMVerdict]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except Exception:
        return {}

    entries = data.get("entries", {})
    cache: dict[str, LLMVerdict] = {}
    for key, value in entries.items():
        try:
            cache[key] = LLMVerdict(
                is_match=bool(value["is_match"]),
                confidence=float(value.get("confidence", 0.0)),
                reason=str(value.get("reason", "")),
                cached=True,
            )
        except Exception:
            continue
    return cache


def save_llm_cache(path: Path, entries: dict[str, LLMVerdict]) -> None:
    data = {
        "prompt_version": PROMPT_VERSION,
        "entries": {
            key: {
                "is_match": verdict.is_match,
                "confidence": verdict.confidence,
                "reason": verdict.reason,
            }
            for key, verdict in entries.items()
        },
    }
    path.write_text(json.dumps(data, sort_keys=True))


class LLMMatchVerifier:
    """Conservative yes/no verifier for borderline candidate pairs."""

    schema = {
        "type": "object",
        "properties": {
            "is_match": {"type": "boolean"},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "reason": {"type": "string"},
        },
        "required": ["is_match", "confidence", "reason"],
    }

    def __init__(
        self,
        model: str = "qwen3:8b",
        endpoint: str = "http://localhost:11434/api/chat",
        cache_path: Path = LLM_CACHE_PATH,
        review_min_score: float = 85.0,
        auto_accept_score: float = 92.0,
        timeout_seconds: float = 45.0,
        keep_alive: str = "30m",
        num_predict: int = 80,
        num_ctx: int = 2048,
        chat_func: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        if review_min_score >= auto_accept_score:
            raise ValueError("review_min_score must be lower than auto_accept_score")
        self.model = model
        self.endpoint = endpoint
        self.cache_path = cache_path
        self.review_min_score = review_min_score
        self.auto_accept_score = auto_accept_score
        self.timeout_seconds = timeout_seconds
        self.keep_alive = keep_alive
        self.num_predict = num_predict
        self.num_ctx = num_ctx
        self._chat_func = chat_func
        self.cache = load_llm_cache(cache_path)
        self.calls = 0
        self.cache_hits = 0

    def should_review(self, score: float) -> bool:
        return self.review_min_score <= score < self.auto_accept_score

    def verify(self, kalshi: NormalizedMarket, polymarket: NormalizedMarket, score: float) -> bool:
        """Return True if a candidate should be accepted.

        Scores at or above auto_accept_score are accepted without an LLM call.
        Scores below review_min_score are rejected by the normal matcher before
        this method is expected to run, but this guard keeps the method safe.
        """
        if score >= self.auto_accept_score:
            return True
        if score < self.review_min_score:
            return False

        key = self._cache_key(kalshi, polymarket)
        cached = self.cache.get(key)
        if cached is not None:
            self.cache_hits += 1
            return cached.is_match

        verdict = self._ask_llm(kalshi, polymarket, score)
        self.cache[key] = verdict
        self.calls += 1
        return verdict.is_match

    def save(self) -> None:
        save_llm_cache(self.cache_path, self.cache)

    def _cache_key(self, kalshi: NormalizedMarket, polymarket: NormalizedMarket) -> str:
        raw = "|".join(
            [
                self.model,
                PROMPT_VERSION,
                llm_fingerprint(kalshi),
                llm_fingerprint(polymarket),
            ]
        )
        return hashlib.sha256(raw.encode()).hexdigest()

    def _ask_llm(self, kalshi: NormalizedMarket, polymarket: NormalizedMarket, score: float) -> LLMVerdict:
        payload = {
            "model": self.model,
            "stream": False,
            "think": False,
            "keep_alive": self.keep_alive,
            "format": self.schema,
            "options": {
                "temperature": 0,
                "num_predict": self.num_predict,
                "num_ctx": self.num_ctx,
            },
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You verify whether two prediction-market contracts are the same tradable event. "
                        "Be conservative: if entity, threshold, date/cycle, resolution condition, or outcome differs, "
                        "return is_match=false. Ignore harmless wording differences."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "task": "Return JSON only. Decide if Kalshi and Polymarket describe the same Yes/No market.",
                            "fuzzy_score": round(score, 1),
                            "kalshi": self._market_payload(kalshi),
                            "polymarket": self._market_payload(polymarket),
                        },
                        sort_keys=True,
                    ),
                },
            ],
        }

        response = self._chat(payload)
        content = response.get("message", {}).get("content")
        if not isinstance(content, str):
            raise RuntimeError("Ollama response did not contain message.content")

        try:
            parsed = json.loads(content)
            is_match = parsed["is_match"]
            if not isinstance(is_match, bool):
                raise ValueError("is_match must be a boolean")
            return LLMVerdict(
                is_match=is_match,
                confidence=float(parsed.get("confidence", 0.0)),
                reason=str(parsed.get("reason", ""))[:500],
            )
        except Exception as exc:
            raise RuntimeError(f"Could not parse LLM verifier response: {content!r}") from exc

    def _chat(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self._chat_func is not None:
            return self._chat_func(payload)
        res = requests.post(self.endpoint, json=payload, timeout=self.timeout_seconds)
        res.raise_for_status()
        return res.json()

    @staticmethod
    def _market_payload(m: NormalizedMarket) -> dict[str, Any]:
        return {
            "platform_id": m.platform_id,
            "title": m.title,
            "description": m.description[:1500],
            "outcomes": m.outcomes,
            "event_title": m.event_title,
            "series_title": m.series_title,
            "category": m.category,
            "close_time": _dt(m.close_time),
            "resolution_date": _dt(m.resolution_date),
        }
