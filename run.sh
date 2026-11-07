#!/usr/bin/env sh
set -eu
export DATA_DIR="${DATA_DIR:-./data}"
export PORT="${PORT:-8080}"
export ADMIN_PORT="${ADMIN_PORT:-8081}"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
mkdir -p "$DATA_DIR"
exec python3 app/blog.py
