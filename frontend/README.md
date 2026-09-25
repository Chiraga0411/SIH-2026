# Sovereign Workbench UI (frontend)

React + Vite. Every page reads live data from the local gateway — there is no
mock path for system state.

```bash
npm install
npm run dev        # http://localhost:5173  (proxies /api → 127.0.0.1:4000)
npm run preview    # serves the built dist on :4173 with the same proxy
npm run build      # production bundle
```

## Wiring

- **`src/api/client.js`** — the only fetch. Adds `x-demo-user`, prefixes
  `VITE_API_BASE` (empty in dev → same-origin → Vite proxy), JSON/blob
  handling, `login/logout`, authenticated `download()` for artifacts.
- **`src/api/useApi.js`** — `useApi(path, {poll, enabled})` → `{data, error,
  loading, reload}`. Pages poll while the agent runs or counters change.
- **`vite.config.js`** — `/api` and `/health` proxied to `127.0.0.1:4000` in
  both `server` and `preview`.
- **`.env.example`** — set `VITE_API_BASE=http://<server>:4000` when the built
  UI is hosted on a different machine than the gateway.

## Pages

| Page | Live source |
|---|---|
| Login | `POST /api/auth/login` (three demo roles) |
| Overview | models, tasks, docs, queue, sovereignty, audit verify, sandbox runs |
| Agent | upload → `POST /api/tasks` → 700ms poll of plan/trace → approve → docx/xlsx/pptx downloads |
| Knowledge | `GET /api/knowledge/docs`, `POST /api/knowledge/search` |
| Models | registry, hot-add, enable/disable, routing log, GPU gauge |
| Sandbox | run/probe/calc results, run history |
| Multimodal | tag extraction + KB cross-check, Excel export |
| Sovereignty | status (3s poll), blocked attempts, proof layers |
| Audit | chain (4s poll), verify, injection screen, encryption stats |
| Projects | projects, GPU queue (3s poll), activity off the audit log |
| Evaluation | retrieval baseline + live task rows, re-run harness |

`src/data/mock.js` holds only explicitly-labelled **baseline** figures
(retrieval benchmark rows, tasks/day trend, task-mix donut) and the pre-first-run
fallback plan/sample code — nothing that pretends to be live state.

## Render test

With the gateway running:

```bash
npm install --no-save happy-dom
node scripts/render_test.mjs
```

Mounts all 11 pages against the live API and fails on any render error.
