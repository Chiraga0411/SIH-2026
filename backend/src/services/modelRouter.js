import { readStore, writeStore, now } from '../db/store.js';

/* Two-stage router.
   Stage 1: fast rules classify the task and the capability it needs.
   Stage 2 (production path): an ambiguous task is sent to a tiny local
   classifier returning {task_type, needs_vision, needs_code_exec} — the
   same shape this rule stage produces, so swapping in the LLM call does
   not change callers.

   The model itself is chosen from the registry by capability, never
   hard-coded, so adding a registry entry is enough to make a new model
   routable (hot-add). Every decision is logged with its reason. */

const CAPABILITY_FOR = {
  multimodal: 'vision',
  coding: 'code',
  document: 'reasoning',
};

const RULES = [
  { type:'multimodal', re:/scan|image|handwriting|drawing|p&?id|photo|ocr|picture|drawing|\.png|\.jpg|\.jpeg|\.tif/ },
  { type:'coding',     re:/\bcode\b|python|javascript|typescript|stack trace|\btests?\b|debug|fix the (bug|failing)|unit test|compile|regex|pandas|numpy/ },
];

export function classify({ text = '', files = [] }) {
  const q = `${text} ${files.join(' ')}`.toLowerCase();
  for (const r of RULES) if (r.re.test(q)) return r.type;
  return 'document';
}

export async function routeTask({ text = '', files = [], taskTitle = '' }) {
  const taskType = classify({ text: `${taskTitle} ${text}`, files });
  const wanted = CAPABILITY_FOR[taskType];
  const db = await readStore();

  const candidates = db.models.filter(m => m.enabled && (m.capabilities || []).includes(wanted));
  const model = candidates[0] || db.models.find(m => m.enabled) || db.models[0];

  const reasons = {
    multimodal: 'Image, scanned document or drawing input detected — vision capability required.',
    coding: 'Code, tests or a stack trace detected — code capability required.',
    document: 'Document drafting, summarising or reasoning requested.',
  };
  const reason = `${reasons[taskType]} Routed to ${model.name} (${wanted}).`;

  const entry = { t: now(), task: (taskTitle || text || 'task').slice(0, 80), type: taskType, picked: model.name, why: reason };
  db.routingLog.unshift(entry);
  db.routingLog = db.routingLog.slice(0, 50);
  await writeStore(db);

  return { taskType, model, reason };
}

export async function listModels() { return (await readStore()).models; }
export async function routingLog() { return (await readStore()).routingLog; }
