#!/bin/bash

set -eao pipefail

ROOT_DIR=$(pwd)
TRADING_BOT_DIR=$ROOT_DIR"/trading-bot"
MARKET_MATCHING_DIR=$ROOT_DIR"/market-matching"
DOCKER_DIR=$ROOT_DIR"/docker"
SECRETS_DIR=$ROOT_DIR/"secrets"

POSTGRES_ENV="postgres.env"
DOCKER_ENV="docker.env"
TRADING_BOT_ENV="bot.env"

DEFAULT_PG_PASSWORD="postgres"
DEFAULT_PG_DATABASE="spellbookdb"
DEFAULT_PG_DATA="/var/lib/postgresql/data"
DEFAULT_PG_PORT="5432"
DEFAULT_TIMEZONE="America/New_York"

main() {
    require git
    require npm
    require npx
    require python3
    require pip
    require docker

    if ((BASH_VERSINFO[0] < 4)); then
        echo "Please update to at least bash-4.0 to run this script."
        exit 1
    fi

    cleaned=false
    if prompt "Clean install?" "N"; then
        echo ""
        if prompt "Are you sure? This will drop the database!" "N"; then
            echo ""
            read -rep $'Please type "CONFIRM" to confirm:\n > '
            if [[ "$REPLY" == "CONFIRM" ]]; then
                clean
                cleaned=true
            fi
        fi
    fi

    if ! "$cleaned"; then
        echo ""
        echo "Skipping clean..."
    fi

    init
    setup_tool PYTHON
    setup_tool TRADING_BOT
    setup_tool DOCKER
    setup_tool POSTGRES
}

# Usage: require <program>
require() {
    local program=$1

    if command -v "$program" > /dev/null; then
        true
        #echo "$program installed!"
    else
        echo "Please install $program!"
        exit
    fi
}

clean() {
    echo ""
    echo "Removing .gitignored files..."
    git clean -dfX
    echo ""

    echo "Removing docker containers..."
    cd "$DOCKER_DIR"
    sudo docker compose down --volumes --rmi "all"

    cd $ROOT_DIR
}

init() {
    mkdir -p $SECRETS_DIR
    echo ""
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

# Usage: prompt <prompt_string> <default: {YN} = Y>
prompt() {
    local prompt_string=$1
    local default=${2:-"Y"}

    if [ "$default" == "Y" ]; then
        prompt_string="$prompt_string [Y/n] "
        read -rp "$prompt_string" -n 1
        [[ ! "$REPLY" =~ ^[Nn]$ ]]
    else
        prompt_string="$prompt_string [y/N] "
        read -rp "$prompt_string" -n 1
        [[ "$REPLY" =~ ^[Yy]$ ]]
    fi
}

# Usage setup_tool <tool>
setup_tool() {
    local tool=$1

    if prompt "Setup $tool?"; then
        echo ""
        echo "Setting up $tool..."
        $tool

        cd $ROOT
        echo "Done!"
    fi

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

TRADING_BOT() {
    cd "$TRADING_BOT_DIR/client"
    npm install

    cd "$TRADING_BOT_DIR/server"
    npm install
}

DOCKER() {
    cd $SECRETS_DIR
    read -rep $'Timezone:\n > ' -i "$DEFAULT_TIMEZONE" timezone
    add_env "$DOCKER_ENV" "TIMEZONE" "$timezone"

    cd "$DOCKER_DIR"
    sudo docker compose pull
}

# Sets up
POSTGRES() {
    cd "$SECRETS_DIR"

    read -rep $'Postgres Password:\n > ' -i $DEFAULT_PG_PASSWORD postgres_password
    read -rep $'Postgres Database:\n > ' -i $DEFAULT_PG_DATABASE postgres_database
    read -rep $'Postgres Data Path:\n > ' -i $DEFAULT_PG_DATA postgres_data
    read -rep $'Postgres Port:\n > ' -i $DEFAULT_PG_PORT postgres_port

    add_env "$POSTGRES_ENV" "POSTGRES_DB" "$postgres_database"
    add_env "$POSTGRES_ENV" "PGDATA" "$postgres_data"
    add_env "$POSTGRES_ENV" "PGPASSWORD" "$postgres_password"
    add_env "$POSTGRES_ENV" "POSTGRES_PASSWORD" "$postgres_password"

    add_env "$DOCKER_ENV" "PG_PORT" "$postgres_port"

    add_env "$TRADING_BOT_ENV" "DATABASE_URL" "postgresql://postgres:$postgres_password@localhost:$postgres_port/$postgres_database"

    # Docker needs to be running for Prisma to do its thing
    # The second line here is just a weird way to set postgres_running to be true or false
    container_id=$(docker container ls --filter "name=postgres" --quiet)
    [[ "$container_id" != "" ]] && postres_running=true || postgres_running=false

    # If it isn't running, start it up
    if ! $postgres_running; then
        cd "$DOCKER_DIR"
        echo "Starting docker containers..."
        sudo docker compose up --detach postgres
    else
        echo "Postgres already running! Recreating in case of env updates..."
        sudo docker compose up --detach postgres
    fi

    # Give the container some time to finish starting up
    sleep 2

    cd "$TRADING_BOT_DIR/server/prisma"
    if ! npx prisma migrate dev > /dev/null; then
        echo "Database out of sync! Dropping data..."
        npx prisma migrate reset
        npx prisma migrate dev
    fi
    npx prisma generate

    # If docker wasn't running before the script, stop it
    if ! $postgres_running; then
        cd "$DOCKER_DIR"
        echo "Stopping docker containers..."
        sudo docker compose stop postgres
    fi
}

main