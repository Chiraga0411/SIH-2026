#!/usr/bin/env bash
set -euo pipefail
MODELS="${MODELS:-qwen2.5:3b}"
command -v ollama >/dev/null || { echo 'Ollama is required. Install it from https://ollama.com/download'; exit 1; }
for model in $MODELS; do echo "Pulling $model"; ollama pull "$model"; done
echo 'Models are installed locally. Open the Models panel to verify runtime detection.'
