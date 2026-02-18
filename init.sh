#!/bin/bash

set -eax pipefail

ROOT_DIR=$(pwd)
TRADING_BOT_DIR=$ROOT_DIR"/trading-bot"
MARKET_MATCHING_DIR=$ROOT_DIR"/market-matching"

cd $TRADING_BOT_DIR"/server" && npm install
cd $TRADING_BOT_DIR"/client" && npm install

cd $MARKET_MATCHING_DIR
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

cd $ROOT_DIR