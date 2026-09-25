# Sovereign AI Gateway (backend)

Local Node/Express gateway: auth, model registry + router, agent workflows with
approval gate, knowledge base, multimodal extraction, sandboxed execution,
sovereignty monitor, hash-chained audit, projects/queue, evaluation.

```bash
npm install
npm start        # http://127.0.0.1:4000
npm run smoke    # 35 end-to-end checks (gateway must be running)
npm run dev      # node --watch
```

## Configuration (env / `.env`)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | gateway port |
| `STORAGE_DIR` | `./storage` | db.json, uploads, artifacts, sandbox workspaces |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | optional local model server (status only) |
| `SANDBOX_IMAGE` | `python:3.11-slim` | image for sandboxed runs |
| `PYTHON_BIN` | auto-detect | interpreter for the local sandbox fallback |
| `FILE_ENCRYPTION_KEY` | generated | 64-hex AES-256-GCM key (else `storage/secret.key`) |

## Auth

Demo header auth: send `x-demo-user: engineer@demo.local` (or manager/admin).
`POST /api/auth/login {role|username}` returns the user + clearance. Query
`?username=` is also accepted (used as fallback for links). Production path is
LDAP/AD — the middleware is the single place to swap in a real token check.

## API map

| Method + path | What it does |
|---|---|
| `GET /health` | liveness |
| `POST /api/auth/login` · `GET /api/auth/me` | demo login / acting user |
| `GET/POST /api/models` · `PATCH /api/models/:id` | registry read, **hot-add**, enable/disable |
| `POST /api/models/route` · `GET /api/models/routing-log` | capability routing + logged reasons |
| `GET /api/projects` · `POST /api/projects` | enriched projects / create |
| `GET /api/files` · `POST /api/files/upload` | list (injection verdicts) / upload (encrypts at rest, scans for prompt injection) |
| `GET /api/knowledge/docs` · `POST /api/knowledge/search` | index / hybrid search with citations, abstention, clearance filter |
| `GET /api/multimodal/tags` · `POST /api/multimodal/extract` · `GET /api/multimodal/tags.xlsx` | P&ID tag extraction + KB cross-check + workbook |
| `GET /api/sandbox/runs` · `POST /api/sandbox/run` · `POST /api/sandbox/probe` · `POST /api/sandbox/calc` | run history / execute code / egress probe / stepped calculation |
| `POST /api/tasks` | create + run agent task (202, plan/trace stream in) |
| `GET /api/tasks` · `GET /api/tasks/:id` · `GET /api/tasks/queue` | list / poll / GPU queue |
| `POST /api/tasks/:id/approve` | manager/admin approval gate |
| `GET /api/tasks/:id/deliverable?format=docx\|xlsx\|pptx` | download generated deliverable |
| `GET /api/audit` · `GET /api/audit/verify` | chain read / recompute from genesis |
| `GET /api/sovereignty/status` · `POST /api/sovereignty/probe` | live monitor / record a blocked attempt |
| `GET /api/evaluation` · `POST /api/evaluation/run` | baseline + live rows / recompute from real runs |

## Sandbox isolation

Docker-first: `docker run --rm --network none --read-only --cap-drop ALL
--security-opt no-new-privileges --pids-limit 128 --memory 512m --cpus 1
--user 1000:1000` with a 20s timeout. If the engine is unreachable (or the
image is missing offline) it falls back to an isolated local Python process —
temp workspace, scrubbed env, hard timeout — and **the response says so**
(`executedIn`, `isolation`, `networkPolicy`); the UI renders that verbatim so
no isolation is ever claimed that did not apply.

## Storage

`storage/db.json` (store), `storage/uploads/` (AES-256-GCM encrypted files,
magic `SAE1`), `storage/artifacts/` (deliverables), `storage/sandbox/<run>/`
(per-run workspaces), `storage/secret.key`. Wipe `storage/` to reset.
