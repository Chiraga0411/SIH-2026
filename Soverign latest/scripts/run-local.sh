#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"; FRONTEND="$ROOT/frontend"
[ -d "$BACKEND" ] || BACKEND="$ROOT/src/b1"
[ -d "$FRONTEND" ] || FRONTEND="$ROOT/src/f3"
mkdir -p "$BACKEND/storage/uploads" "$BACKEND/storage/artifacts"
trap 'kill 0' INT TERM EXIT
(cd "$BACKEND" && npm start) &
(cd "$FRONTEND" && npm run dev -- --host 0.0.0.0) &
echo 'Gateway: http://127.0.0.1:4000'
echo 'Frontend: http://127.0.0.1:5173'
wait
