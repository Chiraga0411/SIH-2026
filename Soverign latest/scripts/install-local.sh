#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"; FRONTEND="$ROOT/frontend"
[ -d "$BACKEND" ] || BACKEND="$ROOT/src/b1"
[ -d "$FRONTEND" ] || FRONTEND="$ROOT/src/f3"
command -v node >/dev/null || { echo 'Node.js 18+ is required.'; exit 1; }
command -v npm >/dev/null || { echo 'npm is required.'; exit 1; }
if ! command -v ollama >/dev/null; then
  echo 'Ollama is not installed. Install it from https://ollama.com/download, start Ollama, then run scripts/pull-models.sh.'
else
  echo "Detected $(ollama --version 2>/dev/null || true)"
fi
(cd "$BACKEND" && npm install)
(cd "$FRONTEND" && npm install)
mkdir -p "$BACKEND/storage/uploads" "$BACKEND/storage/artifacts"
[ -f "$BACKEND/.env" ] || cp "$BACKEND/.env.example" "$BACKEND/.env"
echo 'Local dependencies installed. Run scripts/pull-models.sh, then scripts/run-local.sh.'
