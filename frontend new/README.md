# Sovereign AI — SIH26117 Frontend

A React/Vite frontend prototype for **SIH26117: Sovereign On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs for Confidential Industrial Work**.

## What the frontend demonstrates

The UI is organized around the SIH expected-solution workflow:

| Workflow requirement | Frontend surface |
| --- | --- |
| Agent plans and iterates | **Agent**: live plan, trace, tools, verification, human approval gate |
| Automatic model selection | **Models**: model registry and routing decisions with reasons |
| Multimodal industrial inputs | **Multimodal**: scanned reports, handwriting, P&IDs, OCR confidence and tags |
| Local knowledge grounding | **Knowledge**: indexed documents, hybrid retrieval and citations |
| Sandboxed code and calculations | **Sandbox**: code, tests, blocked egress attempt and calculation output |
| No external calls | **Sovereignty**: blocked attempts, loopback traffic, telemetry flags and deployment proof |
| Governance and traceability | **Audit**: hash-chained activity, RBAC and prompt-injection handling |
| Multi-user deployment | **Projects**: workspaces, members, visibility and GPU queue |
| Evaluation and evidence | **Evaluation**: retrieval, task success and benchmark views |

## Prototype honesty

The screens use local mock data so the complete judge-facing workflow can be demonstrated consistently. The green `PROTOTYPE-VERIFIED` marker identifies the current demo surface; production API wiring, real OCR/model calls, authentication, and deployment infrastructure remain integration work behind these screens. This distinction is intentional and follows the workflow guidance to avoid presenting a mock-up as a live backend.

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

The app works without internet access. Fonts are bundled from npm and no runtime API calls are required by the current prototype.

## Environment and GitHub commits

The current frontend does **not require a `.env` file** because it runs entirely on local mock data. If the Node/FastAPI gateway is connected later, copy `.env.example` to `.env` and set `VITE_API_BASE` to the local gateway URL. Do not commit `.env`; it is ignored by Git. Only `.env.example`, which contains no secrets, should be committed.

Before committing, run `npm install` and `npm run build`. Commit `package-lock.json` for reproducible installs, but do not commit `node_modules/`, `dist/`, logs, local IDE files, or credentials.

## SIH demo path

1. Enter as **Engineer**.
2. Open **Agent** and show the plan, router reason, OCR step, citations, verification, and approval gate.
3. Open **Models** to show role-based model routing and the extensible registry.
4. Open **Multimodal** to show scan/P&ID handling and confidence flags.
5. Open **Sandbox** to show passing tests and the blocked network probe.
6. Open **Sovereignty** and click **Try an outbound call** to show the blocked attempt being recorded.
7. Open **Audit** to close the loop with local traceability.

## Design

The shell is the 3D campus: each building is one area of the workbench, and choosing a building (click it, click its label, or use the list on the left) flies the camera in and opens that area's panel. The panel content is the same set of pages and interactions as before.

| Building | Panel |
| --- | --- |
| Model router | Models and routing |
| Document reader | Multimodal ingestion |
| Code lab | Sandbox |
| Knowledge library | Knowledge base |
| Operations hall | Projects and queue |
| Test range | Evaluation |
| Report studio | Agent workspace (plan, trace, approval gate, deliverable) |
| Control tower | Sovereignty monitor and Audit (two tabs) |
| Overview (list only) | Plant summary panels |

Actions in the panels light up the matching building: running a task lights the Report studio, a knowledge search lights the library, and the outbound-call tests flash the sandbox or tower and raise the Blocked attempts counter. Esc or "Back to campus" returns to the whole view; "Lite graphics" turns off stars, dust and drones for weaker machines.

Layout is responsive. Below 820px the list becomes a strip along the bottom and the panel opens as a sheet above it. Fonts come from `@fontsource`, so the app makes no external requests.

Code layout: `src/campus/scene.js` is the Three.js scene, `src/campus/agents.js` defines the buildings, and `src/pages/*` are the panel pages.
