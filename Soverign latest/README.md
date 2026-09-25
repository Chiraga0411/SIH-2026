# Sovereign AI Workbench — Full Local Prototype

This bundle is a runnable local prototype. The React frontend talks to a Node/Express gateway, and the gateway provides local model management, OCR/text ingestion, knowledge indexing/search, sandbox execution, benchmark execution, audit logging, approval-note generation, and offline sovereignty probes.

## Quick start on a local machine

Prerequisites: Node.js 18+, npm, Python 3, and optionally [Ollama](https://ollama.com/download). `pdftotext` and Tesseract improve PDF/image extraction. Docker is optional; the prototype runs the sandbox through a local Python subprocess and reports the isolation mode. For strict `network:none` execution, install Docker and set `SANDBOX_DOCKER=true` before starting.

```bash
cd final_bundle
chmod +x scripts/*.sh
./scripts/install-local.sh
# Optional: install a local model; this downloads to Ollama, not to the cloud app
./scripts/pull-models.sh
./scripts/run-local.sh
```

Open `http://127.0.0.1:5173`. The gateway runs at `http://127.0.0.1:4000`. The Models screen detects installed Ollama models and can pull/register another model. The frontend never sends documents or prompts to a cloud API.

Use `MODELS='qwen2.5:3b qwen2.5-coder:7b' ./scripts/pull-models.sh` to install several local models. Ollama is optional for the deterministic prototype path; the router and workflow still operate with the local registry when Ollama is unavailable.

## Working prototype features

The Agent workflow uploads local reports, routes by task type, performs local extraction/OCR, searches the local index, creates a cited Word approval note, requires manager approval, and records the audit chain. The Knowledge panel reindexes uploaded files into a persistent local chunk index and searches it. The Sandbox panel executes editable Python calculations and returns stdout, stderr, exit code, timeout, duration, and isolation mode. The Evaluation panel runs a real retrieval benchmark against the current index and calculates workflow approval metrics from actual tasks. The Models panel checks Ollama, lists installed models, and exposes a local pull/register action. The Multimodal panel ingests PDF/image/text files. Projects, overview, audit, queue, and sovereignty views use gateway-backed data.

## Manual commands

```bash
cd backend
npm install
npm start
# in a second terminal
cd frontend
npm install
npm run dev
# backend integration test
cd backend && npm run smoke
```

Important API routes include `/api/models/runtime`, `/api/models/install`, `/api/knowledge/reindex`, `/api/knowledge/search`, `/api/sandbox/run`, `/api/benchmarks/run`, and `/api/dashboard`.

All sample content is synthetic. Model files are not included in the ZIP; they are installed into the user's local Ollama environment by the explicit pull command or Models screen.
