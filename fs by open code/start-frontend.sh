#!/usr/bin/env bash
# Starts the UI on http://localhost:5173 (start the backend first).
set -e
cd "$(dirname "$0")/frontend"
[ -d node_modules ] || npm install --no-audit --no-fund
npm run dev
