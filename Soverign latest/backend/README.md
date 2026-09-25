# Sovereign AI Gateway

Local Node/Express gateway for SIH26117. It uses JSON persistence for the first demo and is structured so the store can later be replaced by MongoDB or SQLite.

## Run

```bash
npm install
cp .env.example .env
npm start
```

The server listens on `http://127.0.0.1:4000` by default.

## Demo users

Send one of these values in the `x-demo-user` header:

- `engineer@demo.local` — creates tasks and uploads files
- `manager@demo.local` — can approve deliverables
- `admin@demo.local` — administrative access

This is intentionally a local demo authentication layer. Production authentication must use JWT/session validation and an organisation directory.

## Main API

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Gateway health |
| POST | `/api/auth/login` | Demo login |
| GET | `/api/models` | Local model registry |
| POST | `/api/models/route` | Route a task by capability |
| POST | `/api/files/upload` | Store local file metadata and content |
| POST | `/api/tasks` | Start the hero workflow |
| GET | `/api/tasks/:id` | Read task status, trace, findings, and citations |
| POST | `/api/tasks/:id/approve` | Manager/Admin approval gate |
| GET | `/api/tasks/:id/artifact` | Download generated DOCX |
| GET | `/api/audit/verify` | Verify the SHA-256 audit chain |
| GET | `/api/sovereignty/status` | Local services and egress policy |
| POST | `/api/sovereignty/probe` | Record a blocked egress probe |

## Hero workflow

1. Upload a local PDF, image, or text report.
2. Create a task with the uploaded file ID.
3. The gateway routes the task to a local model role.
4. Local text extraction uses `pdftotext` for PDFs and Tesseract when available for images.
5. Findings are extracted with a deterministic offline fallback.
6. Local SOP-style citations are attached.
7. A real `.docx` approval note is generated with `docx`.
8. A Manager or Admin approves the deliverable.
9. Every significant action is appended to the tamper-evident audit chain.

The gateway does not require Ollama for this first working slice. If Ollama is added later, the `modelRouter` and agent client can be swapped to call its local OpenAI-compatible endpoint. No cloud API is used by the current implementation.

## Production hardening still required

Replace demo auth with JWT/LDAP/AD, validate MIME types and file sizes, encrypt files at rest, use a real database, execute generated code in Docker with `--network none`, add rate limits, and connect the sovereignty status endpoint to host/container network telemetry.
