// Static presentation constants. All live data (models, tasks, docs, audit,
// queue, evaluation) comes from the gateway API; only baseline/reference
// figures that the gateway itself seeds as "baseline" live here.

export const RBAC = [
  { role: "Engineer", pub: "read", internal: "read", restricted: "—", approve: "—" },
  { role: "Manager",  pub: "read", internal: "read", restricted: "read", approve: "sign" },
  { role: "Admin",    pub: "manage", internal: "manage", restricted: "manage", approve: "sign" },
];

export const TASK_MIX = [
  { label: "Documents", value: 32, color: "#59d4ff" },
  { label: "Code", value: 21, color: "#b48cff" },
  { label: "Multimodal", value: 18, color: "#7ee787" },
  { label: "Retrieval", value: 15, color: "#ffd166" },
  { label: "Calculation", value: 9, color: "#ff8fab" },
  { label: "Other", value: 5, color: "#26405f" },
];

export const TREND = [46, 40, 44, 26, 30, 14, 20, 8];

// Used only before the first task is run; afterwards the live plan replaces it.
export const FALLBACK_PLAN = [
  { text: "Extract text from the uploaded report (OCR where available)", done: false },
  { text: "Search the local knowledge base for applicable SOP thresholds", done: false },
  { text: "Compare findings against the thresholds", done: false },
  { text: "Verify findings and flag anything suspicious", done: false },
  { text: "Draft the approval note (Word) and request sign-off", done: false },
];

// Dependency-free sample so the first sandbox run passes on any machine.
export const SAMPLE_CODE = `# Thickness margin check — runs in the sandbox, no external imports
measured = 8.1   # mm, from the inspection report
minimum  = 8.5   # mm, SOP-114 minimum permissible shell thickness

margin = measured - minimum
print(f"margin = {margin:.2f} mm")
assert margin < 0, "expected below tolerance"
print("all checks passed")
`;
