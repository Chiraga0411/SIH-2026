const API_BASE = import.meta.env.VITE_API_BASE || "";
const DEMO_USER = import.meta.env.VITE_DEMO_USER || "engineer@demo.local";

async function request(path, options = {}) {
  const headers = { "x-demo-user": DEMO_USER, ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body?.error || body || `Request failed (${response.status})`);
  return body;
}

export const api = {
  health: () => request("/health"),
  dashboard: () => request("/api/dashboard"),
  login: (username) => request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) }),
  models: () => request("/api/models"),
  modelsRuntime: () => request("/api/models/runtime"),
  installModel: (name) => request("/api/models/install", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }),
  knowledgeStatus: () => request("/api/knowledge/status"),
  knowledgeSearch: (q) => request(`/api/knowledge/search?q=${encodeURIComponent(q)}`),
  knowledgeReindex: () => request("/api/knowledge/reindex", { method: "POST" }),
  sandboxRun: (code) => request("/api/sandbox/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, language: "python" }) }),
  benchmarkRun: () => request("/api/benchmarks/run", { method: "POST" }),
  route: (payload) => request("/api/models/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  projects: () => request("/api/projects"),
  tasks: () => request("/api/tasks"),
  task: (id) => request(`/api/tasks/${id}`),
  createTask: (payload) => request("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  upload: async (files, projectId = "prj_p101") => {
    const form = new FormData();
    form.append("projectId", projectId);
    Array.from(files || []).forEach(file => form.append("files", file, file.name));
    return request("/api/files/upload", { method: "POST", body: form });
  },
  approve: (id) => request(`/api/tasks/${id}/approve`, { method: "POST", headers: { "x-demo-user": "manager@demo.local" } }),
  audit: () => request("/api/audit"),
  auditVerify: () => request("/api/audit/verify"),
  sovereignty: () => request("/api/sovereignty/status"),
  probe: (target) => request("/api/sovereignty/probe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) }),
  artifactUrl: (id) => `${API_BASE}/api/tasks/${id}/artifact`,
};

export function normalizeTrace(task) {
  return (task?.trace || []).map((item) => ({
    stage: item.stage || "ACT",
    text: item.message || item.tool || "Local workflow step completed",
    tool: item.tool,
    cites: (item.citations || []).map(c => `${c.source} p.${c.page}`),
    status: "done",
  }));
}
