#!/usr/bin/env bash
set -euo pipefail
export DATA_DIR="${DATA_DIR:-/var/data/baoviet-cms}"
export APP_PORT="${APP_PORT:-10001}"
mkdir -p "$DATA_DIR" 2>/dev/null || true
if [ -d /app/data ]; then
  for f in /app/data/*.json; do
    [ -f "$f" ] || continue
    target="$DATA_DIR/$(basename "$f")"
    [ -e "$target" ] || cp "$f" "$target" 2>/dev/null || true
  done
fi
printf '[cms] starting Node CMS on 127.0.0.1:%s\n' "$APP_PORT"
( APP_PORT="$APP_PORT" node /app/dist/server.cjs ) &
APP_PID=$!
(
  while kill -0 "$APP_PID" 2>/dev/null; do sleep 2; done
  printf '[cms] Node CMS exited; gateway remains available for diagnostics.\n' >&2
) &
printf '[cms] starting warm-up gateway on PORT=%s\n' "${PORT:-10000}"
exec node /app/render-gateway.cjs
