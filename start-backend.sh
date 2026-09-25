#!/usr/bin/env bash
# Starts the Sovereign AI gateway on http://127.0.0.1:4000
set -e
cd "$(dirname "$0")/backend"
[ -d node_modules ] || npm install --no-audit --no-fund
npm start
