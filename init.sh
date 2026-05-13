#!/bin/bash

set -eao pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR=$ROOT_DIR"/dashboard"
TRADING_DIR=$ROOT_DIR"/trading"
MARKET_MATCHING_DIR=$ROOT_DIR"/market-matching"
DOCKER_DIR=$ROOT_DIR"/docker"
SECRETS_DIR=$ROOT_DIR/"secrets"

POSTGRES_ENV="postgres.env"
DOCKER_ENV="docker.env"
BOT_ENV="bot.env"

DEFAULT_PG_PASSWORD="postgres"
DEFAULT_PG_DATABASE="spellbookdb"
DEFAULT_PG_DATA="/var/lib/postgresql/data"
DEFAULT_PG_PORT="5432"
DEFAULT_TIMEZONE="America/New_York"
DEFAULT_LLM_MODEL="qwen3:4b"

main() {
    if ((BASH_VERSINFO[0] < 4)); then
        echo "Please update to at least bash-4.0 to run this script."
        exit 1
    fi

    preflight

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
    setup_tool LLM N
    setup_tool DASHBOARD
    setup_tool TRADING
    setup_tool DOCKER
    setup_tool POSTGRES
}

preflight() {
    echo ""
    echo "Checking prerequisites..."

    check_command "git" "clean install"
    check_command "python3" "Python setup"
    check_command "pip" "Python setup"
    check_python_venv
    check_command "npm" "Dashboard and trading setup"
    check_command "npx" "Postgres migrations"
    check_node
    check_docker
    check_command "curl" "optional LLM setup"
    check_command "tmux" "start.sh"
    check_ollama

    echo ""
    echo "Preflight complete. Missing optional tools can be skipped at their setup prompt."
    echo ""
}

check_command() {
    local program=$1
    local purpose=$2

    if command -v "$program" > /dev/null; then
        echo "[OK] $program ($purpose)"
    else
        echo "[MISSING] $program ($purpose)"
    fi
}

check_python_venv() {
    if ! command -v python3 > /dev/null; then
        echo "[MISSING] python3-venv (Python setup)"
        return
    fi

    if python3 -m venv --help > /dev/null 2>&1; then
        echo "[OK] python3-venv (Python setup)"
    else
        echo "[MISSING] python3-venv (Python setup)"
    fi
}

check_node() {
    if ! command -v node > /dev/null; then
        echo "[MISSING] node >=20.19, >=22.12, or >=24 (Dashboard and trading setup)"
        return
    fi

    local version
    version=$(node --version)

    if node_version_supported "$version"; then
        echo "[OK] node $version (Dashboard and trading setup)"
    else
        echo "[WARN] node $version found; recommended version is >=20.19, >=22.12, or >=24"
    fi
}

node_version_supported() {
    local version=${1#v}
    local major=${version%%.*}
    local rest=${version#*.}
    local minor=${rest%%.*}

    if ((major >= 24)); then
        return 0
    fi

    if ((major >= 23)); then
        return 0
    fi

    if ((major == 22 && minor >= 12)); then
        return 0
    fi

    if ((major == 20 && minor >= 19)); then
        return 0
    fi

    return 1
}

check_docker() {
    if ! command -v docker > /dev/null; then
        echo "[MISSING] docker (Docker and Postgres setup)"
        return
    fi

    if ! docker version > /dev/null 2>&1; then
        echo "[WARN] docker found, but the Docker daemon is not available"
        return
    fi

    if ! docker compose version > /dev/null 2>&1; then
        echo "[MISSING] docker compose plugin (Docker and Postgres setup)"
        return
    fi

    echo "[OK] docker and docker compose (Docker and Postgres setup)"
}

check_ollama() {
    if ! command -v ollama > /dev/null; then
        echo "[MISSING] ollama (optional LLM setup; install script can handle Linux)"
        return
    fi

    if ollama list > /dev/null 2>&1; then
        echo "[OK] ollama server (optional LLM setup)"
    else
        echo "[WARN] ollama found, but the server is not running"
    fi
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

require_docker() {
    if ! command -v docker > /dev/null; then
        docker_help
        exit 1
    fi

    if ! docker version > /dev/null 2>&1; then
        docker_help
        exit 1
    fi

    if ! docker compose version > /dev/null 2>&1; then
        echo "Docker Compose is required. Install the Docker Compose plugin, then rerun this script."
        exit 1
    fi
}

docker_help() {
    echo "Docker is required for database setup, but it is not available in this shell."

    if grep -qi microsoft /proc/version 2> /dev/null; then
        echo "WSL detected: install Docker Desktop on Windows and enable WSL integration for this distro."
        echo "After enabling it, restart this shell and rerun ./init.sh."
    else
        echo "Install Docker Engine for your OS, start Docker, then rerun ./init.sh."
    fi
}

clean() {
    require git
    require_docker

    echo ""
    echo "Removing .gitignored files..."
    git clean -dfX
    echo ""

    echo "Removing docker containers..."
    cd "$DOCKER_DIR"
    docker compose down --volumes --rmi "all"

    cd "$ROOT_DIR"
}

init() {
    mkdir -p "$SECRETS_DIR"
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
    local default=${2:-"Y"}

    if prompt "Setup $tool?" "$default"; then
        echo ""
        echo "Setting up $tool..."
        $tool

        cd "$ROOT_DIR"
        echo "Done!"
    fi

    echo ""
}

# Sets up python venv
PYTHON() {
    require python3
    require pip

    cd "$MARKET_MATCHING_DIR"

    python3 -m venv .venv
    source .venv/bin/activate
    python3 -m pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
}

DASHBOARD() {
    require npm

    cd "$DASHBOARD_DIR"
    npm install
}

TRADING() {
    require npm

    cd "$TRADING_DIR"
    npm install
}

LLM() {
    cd "$ROOT_DIR"
    read -rep $'LLM model:\n > ' -i "$DEFAULT_LLM_MODEL" llm_model
    ./install_llm.sh --model "$llm_model"
}

DOCKER() {
    require_docker

    cd "$SECRETS_DIR"
    read -rep $'Timezone:\n > ' -i "$DEFAULT_TIMEZONE" timezone
    add_env "$DOCKER_ENV" "TIMEZONE" "$timezone"

    cd "$DOCKER_DIR"
    docker compose pull
}

# Sets up
POSTGRES() {
    require_docker
    require npx

    cd "$SECRETS_DIR"

    read -rep $'Postgres Password:\n > ' -i $DEFAULT_PG_PASSWORD postgres_password
    read -rep $'Postgres Database:\n > ' -i $DEFAULT_PG_DATABASE postgres_database
    read -rep $'Postgres Data Path:\n > ' -i $DEFAULT_PG_DATA postgres_data
    read -rep $'Postgres Port:\n > ' -i $DEFAULT_PG_PORT postgres_port

    add_env "$POSTGRES_ENV" "POSTGRES_DB" "$postgres_database"
    add_env "$POSTGRES_ENV" "PGDATA" "$postgres_data"
    add_env "$POSTGRES_ENV" "PGPASSWORD" "$postgres_password"
    add_env "$POSTGRES_ENV" "POSTGRES_PASSWORD" "$postgres_password"

    add_env "$DOCKER_ENV" "POSTGRES_PORT" "$postgres_port"

    add_env "$BOT_ENV" "DATABASE_URL" "postgresql://postgres:$postgres_password@localhost:$postgres_port/$postgres_database"

    # Docker needs to be running for Prisma to do its thing
    # The second line here is just a weird way to set postgres_running to be true or false
    container_id=$(docker container ls --filter "name=postgres" --quiet)
    [[ "$container_id" != "" ]] && postgres_running=true || postgres_running=false

    # If it isn't running, start it up
    if ! $postgres_running; then
        cd "$DOCKER_DIR"
        echo "Starting docker containers..."
        docker compose up --detach postgres
    else
        echo "Postgres already running! Recreating in case of env updates..."
        docker compose up --detach postgres
    fi

    # Give the container some time to finish starting up
    sleep 2

    export DATABASE_URL="postgresql://postgres:$postgres_password@localhost:$postgres_port/$postgres_database"

    cd "$TRADING_DIR/prisma"
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
        docker compose stop postgres
    fi
}

main
