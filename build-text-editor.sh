#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
EDITOR_DIR="${TEXT_EDITOR_SOURCE_DIR:-$SCRIPT_DIR/../Text_editor}"
DIST_DIR="$SCRIPT_DIR/text_editor_dist"

if [ ! -f "$EDITOR_DIR/package.json" ]; then
  echo "Text editor source was not found: $EDITOR_DIR" >&2
  exit 1
fi

npm --prefix "$EDITOR_DIR" install
npm --prefix "$EDITOR_DIR" run build -- --base=/admin/editor/

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -R "$EDITOR_DIR/dist/." "$DIST_DIR/"

echo "Text editor build copied to $DIST_DIR"
