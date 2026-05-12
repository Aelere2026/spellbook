# Market Matching

This service finds likely equivalent binary prediction markets between Kalshi
and Polymarket.

It fetches markets from both platforms, normalizes them into one internal
shape, generates likely candidates with IDF/BM25-style retrieval, applies
deterministic filters, scores title similarity with RapidFuzz, and writes the
best one-to-one matches.

Optional local LLM verification can be enabled for borderline matches. It is
off by default.

## Pipeline

`runner.py` runs the full flow:

1. Fetch raw markets from Kalshi and Polymarket in parallel.
2. Normalize raw market payloads into `NormalizedMarket`.
3. Drop markets whose `close_time` is already in the past.
4. Filter to binary Yes/No markets.
5. Generate candidate pairs with `matchers/idf_retrieval.py`.
6. Apply time, year, cutoff-year, prop-threshold, and entity mismatch guards.
7. Score candidates with RapidFuzz.
8. Optionally ask a local LLM to verify borderline scores.
9. Greedily select one-to-one matches.
10. Save match-score cache, write `matches.txt`, and persist to DB when
   `DATABASE_URL` is available.

When LLM verification is enabled, `runner.py` also writes `matches_llm.txt`
with separate LLM-approved and LLM-rejected sections, including model
confidence, cache/live source, and reasoning for each reviewed pair.

## Default Matching

Run from this directory:

```bash
PYTHONPATH=. python3 runner.py
```

If your shell has `python` mapped correctly, this also works:

```bash
PYTHONPATH=. python runner.py
```

The default path does not require Ollama or a downloaded model.

## Loop Runner

`run_loop.sh` runs `runner.py` every 300 seconds:

```bash
bash run_loop.sh
```

From the repo root, `start.sh` creates a tmux session and runs this loop:

```bash
cd ..
./start.sh
```

## Optional Local LLM Verification

The LLM verifier is only used when explicitly enabled:

```bash
LLM_VERIFY_ENABLED=1 LLM_MODEL=qwen3:4b PYTHONPATH=. python3 runner.py
```

From the repo root:

```bash
./start.sh --llm
```

The root start script starts an `ollama` tmux window when needed and waits for
Ollama before starting the matching loop.

### Recommended Local Model

For the current laptop-GPU setup, use:

```bash
ollama pull qwen3:4b
```

Then make sure Ollama is running:

```bash
ollama serve
```

If `ollama serve` says the address is already in use, the server is already
running.

### LLM Score Band

When LLM verification is enabled:

- Scores below `LLM_REVIEW_MIN_SCORE` are rejected.
- Scores from `LLM_REVIEW_MIN_SCORE` up to but not including
  `LLM_AUTO_ACCEPT_SCORE` are sent to the LLM.
- Scores at or above `LLM_AUTO_ACCEPT_SCORE` are accepted without an LLM call.

Defaults:

```text
LLM_REVIEW_MIN_SCORE=85.0
LLM_AUTO_ACCEPT_SCORE=92.0
```

The fuzzy-only default threshold remains:

```text
MIN_SCORE=84.0
```

## LLM Prompting

`llm_verifier.py` sends a conservative verification prompt to Ollama. The model
receives the fuzzy score plus structured Kalshi and Polymarket market records:

- title
- description
- outcomes
- category
- close time
- resolution date

Different dates are treated as a warning, not an automatic denial. The LLM is
instructed to allow date differences when both contracts clearly settle on the
same underlying event, and to reject only when the date difference changes what
can make the contract resolve Yes or No. One- or two-day close/resolution date
differences should not reject an otherwise equivalent pair. Event and series
titles are intentionally omitted from the LLM payload because platforms often
group matching markets under different parent events.

The model must return JSON matching this schema:

```json
{
  "is_match": true,
  "confidence": 0.92,
  "reason": "same event"
}
```

For speed, the verifier uses:

```text
think=false
keep_alive=30m
temperature=0
num_predict=160
num_ctx=2048
```

## LLM Environment Variables

```text
LLM_VERIFY_ENABLED=1
LLM_MODEL=qwen3:4b
LLM_ENDPOINT=http://localhost:11434/api/chat
LLM_REVIEW_MIN_SCORE=85.0
LLM_AUTO_ACCEPT_SCORE=92.0
LLM_TIMEOUT_SECONDS=120.0
LLM_MAX_REVIEWS=
LLM_PROGRESS_INTERVAL=25
```

Examples:

```bash
LLM_VERIFY_ENABLED=1 LLM_MODEL=qwen3:4b PYTHONPATH=. python3 runner.py
LLM_VERIFY_ENABLED=1 LLM_MODEL=qwen3:4b LLM_TIMEOUT_SECONDS=180 PYTHONPATH=. python3 runner.py
LLM_VERIFY_ENABLED=1 LLM_REVIEW_MIN_SCORE=87 LLM_AUTO_ACCEPT_SCORE=92 PYTHONPATH=. python3 runner.py
LLM_VERIFY_ENABLED=1 LLM_REVIEW_MIN_SCORE=92 LLM_AUTO_ACCEPT_SCORE=101 PYTHONPATH=. python3 runner.py
LLM_VERIFY_ENABLED=1 LLM_MODEL=qwen3:4b LLM_MAX_REVIEWS=100 PYTHONPATH=. python3 runner.py
```

Use `LLM_REVIEW_MIN_SCORE=92 LLM_AUTO_ACCEPT_SCORE=101` when you want a less
frequent but stricter run: fuzzy scores below 92 are ignored, and every kept
candidate is checked by the LLM instead of auto-accepting high scores.

For a fast first validation run, cap the LLM reviews from the repo root:

```bash
LLM_MAX_REVIEWS=100 ./start.sh --llm
```

## Caching

Two persistent caches are used:

- `match_cache.json`: fuzzy score cache for unchanged market pairs.
- `llm_match_cache.json`: local LLM verdict cache for unchanged market pairs,
  keyed by model, prompt version, and market fingerprints.

This keeps repeat runs from re-scoring or re-verifying unchanged pairs.

Generated cache/output files are local runtime artifacts:

- `match_cache.json`
- `llm_match_cache.json`
- `matches.txt`
- `matches_llm.txt`

## Database Persistence

`runner.py` attempts to persist matches through `db.py`. If `DATABASE_URL` is
not available or the database is not reachable, the run continues and logs that
DB persistence was skipped.

Environment files are loaded from:

- `../secrets/bot.env`
- `../secrets/postgres.env`
- `../secrets/.env`
- `.env`

## Tests

Focused matcher/cache/verifier tests:

```bash
PYTHONPATH=. pytest -q tests/test_match.py tests/test_cache.py tests/test_llm_verifier.py
```

Current expected result:

```text
19 passed
```

Full `pytest -q` may require DB configuration because `tests/test_db.py`
connects to `DATABASE_URL` during collection.

## Important Files

- `runner.py`: orchestration entrypoint.
- `matchers/match.py`: candidate filtering, scoring, verifier hook, and
  one-to-one assignment.
- `matchers/idf_retrieval.py`: candidate retrieval.
- `matchers/utils.py`: canonicalization and RapidFuzz scoring.
- `match_cache.py`: persistent fuzzy-score cache.
- `llm_verifier.py`: optional local Ollama verifier and LLM verdict cache.
- `normalizers/`: platform-specific conversion into `NormalizedMarket`.
- `fetchers/`: platform API fetchers.
- `db.py`: persistence into the application database.
