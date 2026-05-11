# Spellbook

Spellbook is a local development workspace for prediction-market matching,
dashboarding, and trading services.

## Setup

Clone the repo and run the install script:

```bash
git clone git@github.com:Aelere2026/senior_project.git
cd senior_project/spellbook
bash ./init.sh
```

## Starting the Stack

Start the default tmux session:

```bash
./start.sh
```

This starts:

- `market-matching`: fetches Kalshi and Polymarket markets, normalizes them, and writes/persists likely matches.
- `dashboard`: runs the dashboard dev server.
- `trading`: runs the trading dev server.

To enable optional local LLM verification for borderline market matches:

```bash
./start.sh --llm
```

The LLM path uses Ollama and defaults to `qwen3:4b`. Use a different local model with:

```bash
./start.sh --llm --llm-model qwen3:8b
```

## Market Matching

The matcher lives in `market-matching/`. It works without an LLM by default.
When LLM verification is enabled, only borderline fuzzy matches are sent to the
local model, and verdicts are cached so the same unchanged pair is not reviewed
on every run.

See `market-matching/README.md` for details.

## Dependencies

When Python dependencies change, update the relevant requirements file:

```bash
pip freeze > requirements.txt
```
