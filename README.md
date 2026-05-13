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

The install script now asks whether to set up the optional local LLM for
market matching. If you skip it during setup, run it later with:

```bash
./install_llm.sh
```

This installs Ollama if needed, starts the local Ollama server, and downloads
the default `qwen3:4b` model. The model is not copied into `market-matching/`;
Ollama keeps downloaded models in its own local model store. `market-matching`
only needs to know the model name through `LLM_MODEL` or `./start.sh --llm-model`.

To install a different model:

```bash
./install_llm.sh --model qwen3:8b
```

## Starting the Stack

Start the default tmux session:

```bash
./start.sh
```

This starts:

- `market-matching`: fetches Kalshi and Polymarket markets hourly, normalizes them, and writes/persists likely matches.
- `dashboard`: runs the dashboard dev server.
- `trading`: runs the trading dev server.

To enable optional local LLM verification for score-eligible market matches:

```bash
./start.sh --llm
```

The LLM path is used only by `market-matching`, runs through Ollama, and
defaults to `qwen3:4b`. Use a different local model with:

```bash
./start.sh --llm --llm-model qwen3:8b
```

If Ollama is missing, or if the requested model has not been pulled, the
market-matching tmux pane prints the install command, for example:

```bash
./install_llm.sh
```

By default, LLM matching checks every candidate with score 92 or higher:

```bash
./start.sh --llm
```

For a broader but slower pass, lower the review threshold:

```bash
LLM_REVIEW_MIN_SCORE=85 LLM_AUTO_ACCEPT_SCORE=101 ./start.sh --llm
```

## Market Matching

The matcher lives in `market-matching/`. It works without an LLM by default.
When LLM verification is enabled, score-eligible fuzzy matches are sent to the
local model, and verdicts are cached so the same unchanged pair is not reviewed
on every run. LLM runs also write `market-matching/matches_llm.txt`, split into
selected approvals, unselected approvals, and rejected pairs with reasons.

See `market-matching/README.md` for details.

## Dependencies

When Python dependencies change, update the relevant requirements file:

```bash
pip freeze > requirements.txt
```
