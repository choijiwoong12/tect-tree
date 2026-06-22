#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

IMAGE_NAME="${IMAGE_NAME:-admin:latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
PUSH_IMAGE="${PUSH_IMAGE:-true}"

docker build --platform "$PLATFORM" -t "$IMAGE_NAME" .

if [ "$PUSH_IMAGE" = "true" ]; then
  docker push "$IMAGE_NAME"
fi

./deploy.sh
