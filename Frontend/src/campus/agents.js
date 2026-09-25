// The campus: one building per area of the workbench. Visual fields (pos, ring,
// halo, cols, rows, lit ...) drive the 3D scene; the rest drives the rail and
// the panel. `pages` are the workbench pages that open when the building is chosen.

export const OVERVIEW = {
  id: "overview", name: "Overview", short: "Live numbers for the whole plant",
  color: "#9db8e0", model: null, pages: ["overview"],
  desc: "Models, tasks, health, compute and today's findings at a glance.",
};

export const AGENT_DEFS = [
  { id: "router", name: "Model router", short: "Picks the right model for each task", color: "#59d4ff",
    model: "rules + qwen2.5-14b-instruct", pages: ["models"],
    pos: [0, 18], dist: 22, ty: 3, ring: 6.5, halo: 14, cols: 6, rows: 6, lit: .5 },
  { id: "doc", name: "Document reader", short: "Reads scans, handwriting and drawings", color: "#7ee787",
    model: "llama-3.2-11b-vision + OCR", pages: ["multimodal"],
    pos: [-14, 11.2], dist: 22, ty: 3, ring: 8, halo: 15, cols: 10, rows: 6, lit: .55 },
  { id: "code", name: "Code lab", short: "Runs code in a locked sandbox", color: "#b48cff",
    model: "qwen2.5-coder-7b", pages: ["sandbox"],
    pos: [-17.5, -4], dist: 21, ty: 3, ring: 7.5, halo: 14, cols: 8, rows: 8, lit: .5 },
  { id: "kb", name: "Knowledge library", short: "Answers from your manuals, with sources", color: "#ffd166",
    model: "bge-m3 + bge-reranker-v2-m3", pages: ["knowledge"],
    pos: [-7.8, -16.2], dist: 26, ty: 6, ring: 7.5, halo: 16, cols: 6, rows: 16, lit: .6 },
  { id: "ops", name: "Operations hall", short: "Projects, teams and the GPU queue", color: "#8fb3ff",
    model: "no model, job scheduler", pages: ["projects"],
    pos: [7.8, -16.2], dist: 24, ty: 3, ring: 8, halo: 15, cols: 12, rows: 5, lit: .55 },
  { id: "lab", name: "Test range", short: "Benchmarks and evidence", color: "#5eead4",
    model: "test harness, no model", pages: ["evaluation"],
    pos: [17.5, -4], dist: 22, ty: 4, ring: 7.5, halo: 14, cols: 8, rows: 6, lit: .5 },
  { id: "studio", name: "Report studio", short: "Plans the task, runs it, holds the note for sign-off", color: "#ff8fab",
    model: "qwen2.5-14b-instruct", pages: ["agent"],
    pos: [14, 11.2], dist: 22, ty: 3, ring: 8.5, halo: 15, cols: 10, rows: 5, lit: .55 },
  { id: "tower", name: "Control tower", short: "Proof nothing leaves, and the audit log", color: "#ffb03b",
    model: "no model, plain code", pages: ["sovereignty", "audit"],
    pos: [0, 0], dist: 36, ty: 10, ring: 6, halo: 26, cols: 4, rows: 26, lit: .5, theta: .7, phi: 1.28 },
];

export const PAGE_LABEL = { sovereignty: "Sovereignty", audit: "Audit" };
