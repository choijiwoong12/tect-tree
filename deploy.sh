#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

STACK_NAME="${STACK_NAME:-admin}"
STACK_FILE="${STACK_FILE:-docker-stack.yml}"

docker stack deploy \
  --with-registry-auth \
  --compose-file "$STACK_FILE" \
  "$STACK_NAME"

docker stack services "$STACK_NAME"
