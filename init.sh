#!/bin/bash

set -eao pipefail

ROOT_DIR=$(pwd)
TRADING_BOT_DIR=$ROOT_DIR"/trading-bot"
MARKET_MATCHING_DIR=$ROOT_DIR"/market-matching"
DOCKER_DIR=$ROOT_DIR"/docker"
SECRETS_DIR=$ROOT_DIR/"secrets"

POSTGRES_ENV="postgres.env"
DOCKER_ENV="docker.env"

DEFAULT_PG_PASSWORD="postgres"
DEFAULT_PG_DATABASE="spellbookdb"
DEFAULT_PG_DATA="/var/lib/postgresql/18/docker"
DEFAULT_TIMEZONE="America/New_York"

main() {
    if ((BASH_VERSINFO[0] < 4))
    then
        echo "Please update to at least bash-4.0 to run this script."
        exit 1
    fi

    prompt "Clean install?"
    if [[ $RESULT ]]; then
        echo ""
        git clean -dfX
        echo ""
    fi

    init
    setup_tool PYTHON
    setup_tool POSTGRES
    setup_tool DOCKER
    setup_tool TRADING_BOT
}

init() {
    mkdir -p $SECRETS_DIR
}

# Usage: add_env <file> <key> <value>
add_env() {
    local file=$1
    local key=$2
    local value=$3

    touch "$file"

    # || true supresses the error code in cases where the file is empty
    # Otherwise, the bash script would prematurely terminate
    grep --invert-match "$key" "$file" > "temp.env" || true
    echo "$key=$value" >> "temp.env"
    mv "temp.env" "$file"
}

# Usage: prompt <prompt_string>
# Return: 1: True, 0: False
prompt() {
    local prompt_string=$1

    prompt_string="$prompt_string [Y/n] "

    read -rp "$prompt_string" -n 1
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        RESULT=1
    else
        RESULT=0
    fi
}

# Usage setup_tool <tool>
setup_tool() {
    local tool=$1

    prompt "Setup $tool?"
    if [[ $RESULT ]]; then
        echo ""
        echo "Setting up $tool..."
        $tool
    fi

    cd $ROOT
    echo "Done!"
    echo ""
}

# Sets up python venv
PYTHON() {
    cd $MARKET_MATCHING_DIR

    python3 -m venv .venv
    source .venv/bin/activate
    python3 -m pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
}

# Sets up
POSTGRES() {
    cd "$SECRETS_DIR"

    read -rep $'Postgres Password:\n > ' -i $DEFAULT_PG_PASSWORD postgres_password
    read -rep $'Postgres Database:\n > ' -i $DEFAULT_PG_DATABASE postgres_database
    read -rep $'Postgres Data Path:\n > ' -i $DEFAULT_PG_DATA postgres_data

    add_env "$POSTGRES_ENV" "POSTGRES_PASSWORD" "$postgres_password"
    add_env "$POSTGRES_ENV" "POSTGRES_DB" "$postgres_database"
    add_env "$POSTGRES_ENV" "PGDATA" "$postgres_data"
    add_env "$DOCKER_ENV" "PGDATA" "$postgres_data"
}

DOCKER() {
    cd $SECRETS_DIR
    read -rep $'Timezone:\n > ' -i "$DEFAULT_TIMEZONE" timezone
    add_env "$DOCKER_ENV" "TIMEZONE" "$timezone"

    cd "$DOCKER_DIR"
    sudo docker compose pull
}

TRADING_BOT() {
    cd "$TRADING_BOT_DIR/client"
    npm install

    cd "$TRADING_BOT_DIR/server"
    npm install
}

main