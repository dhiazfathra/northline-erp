#!/bin/sh
# Runs the loop CLI (ADR-0050): `bun loop` and the PreToolUse hook both come through here. Builds the binary into the
# gitignored .bin/ when any Go source is newer, then execs it. A failed build exits 2, so the guard hook fails closed.
dir=$(cd "$(dirname "$0")" && pwd)
bin="$dir/.bin/loop"
if [ ! -x "$bin" ] || [ -n "$(find "$dir" -maxdepth 1 \( -name '*.go' -o -name go.mod \) -newer "$bin" 2>/dev/null)" ]; then
  mkdir -p "$dir/.bin"
  # Build next to the target and rename, so concurrent hook calls never run a half-written binary.
  go -C "$dir" build -o "$bin.$$" . && mv -f "$bin.$$" "$bin" || { rm -f "$bin.$$"; echo "loop: go build failed in $dir" >&2; exit 2; }
fi
exec "$bin" "$@"
