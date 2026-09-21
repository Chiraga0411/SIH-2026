# Sovereign AI — SIH26117

Full-stack SIH26117 prototype for a Sovereign On-Premise Agentic AI Workbench.

## Repository structure

```text
frontend/   React/Vite/Tailwind judge-facing workbench
backend/    Node/Express local gateway and hero workflow
```

Keep them as separate packages in one repository. This makes frontend deployment, backend deployment, dependency installation, and future team ownership clearer while preserving one Git history.

## Run locally

Terminal 1 — backend:

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Terminal 2 — frontend:

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE=http://127.0.0.1:4000 when using the gateway.
npm run dev
```

The frontend can also run without the backend using its local mock-demo mode.

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for workflow and API details.
