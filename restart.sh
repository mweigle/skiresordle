#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

IMAGE_ARCHIVE=${1:-/tmp/skiresordle.tar}
if [ ! -f "$IMAGE_ARCHIVE" ]; then
    printf 'Image archive not found: %s\n' "$IMAGE_ARCHIVE" >&2
    exit 1
fi

git pull --ff-only
docker compose --profile tls config --quiet
docker load --input "$IMAGE_ARCHIVE"
docker compose --profile tls up --detach --no-build --remove-orphans
