import { readStore, writeStore, now } from '../db/store.js';

/* Two-stage router.
   Stage 1: fast rules classify the task and the capability it needs.
   Stage 2 (production path): the real two-stage router running in the
   Python agent service (Model #6, core/router.py) — rules first, then a
   tiny LLM classification call when the rules are unsure. We call it here;
   if it's unreachable (service down, Ollama not pulled) we fall back to the
   local regex rules below so this page never breaks. */

const ROUTER_SERVICE_URL = process.env.GENERAL_SERVICE_URL || 'http://localhost:8002';

async function liveRoute(text, files) {
  try {
    const resp = await fetch(`${ROUTER_SERVICE_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, files }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`router service returned ${resp.status}`);
    const j = await resp.json();
    if (!j.capability) throw new Error('router service returned no capability');
    return j; // { task_type, capability, model, tools, reason }
  } catch (err) {
    return { error: err.name === 'TimeoutError' ? 'router service timed out' : err.message };
  }
}

const CAPABILITY_FOR = {
  multimodal: 'vision',
  coding: 'code',
  document: 'reasoning',
};

const RULES = [
  { type:'multimodal', re:/\bscan(?:s|ned|ning)?\b|\bimages?\b|handwrit|\bdrawings?\b|\bp&?ids?\b|\bphotos?\b|\bocr\b|\bpictures?\b|\.png|\.jpe?g|\.tiff?/ },
  { type:'coding',     re:/\bcode\b|python|javascript|typescript|stack trace|\btests?\b|debug|fix the (bug|failing)|unit test|compile|regex|pandas|numpy/ },
];

export function classify({ text = '', files = [] }) {
  const q = `${text} ${files.join(' ')}`.toLowerCase();
  for (const r of RULES) if (r.re.test(q)) return r.type;
  return 'document';
}

// Map the Python router's capability names onto the same taskType buckets
// this gateway's UI already understands, so nothing downstream changes shape.
const CAPABILITY_TO_TASKTYPE = { vision: 'multimodal', code: 'coding' };

export async function routeTask({ text = '', files = [], taskTitle = '' }) {
  const fullText = `${taskTitle} ${text}`.trim();
  const db = await readStore();

  const live = await liveRoute(fullText, files);
  let taskType, wanted, reason, liveInfo = null;

  if (!live.error) {
    taskType = CAPABILITY_TO_TASKTYPE[live.capability] || 'document';
    wanted = CAPABILITY_FOR[taskType];
    reason = `[live router] ${live.reason}`;
    liveInfo = { taskType: live.task_type, capability: live.capability, tools: live.tools, model: live.model };
  } else {
    taskType = classify({ text: fullText, files });
    wanted = CAPABILITY_FOR[taskType];
    const reasons = {
      multimodal: 'Image, scanned document or drawing input detected — vision capability required.',
      coding: 'Code, tests or a stack trace detected — code capability required.',
      document: 'Document drafting, summarising or reasoning requested.',
    };
    reason = `${reasons[taskType]} (live router unavailable: ${live.error} — used local rules instead.)`;
  }

  const candidates = db.models.filter(m => m.enabled && (m.capabilities || []).includes(wanted));
  const model = candidates[0] || db.models.find(m => m.enabled) || db.models[0];
  reason += ` Routed to ${model.name} (${wanted}).`;

  const entry = { t: now(), task: (taskTitle || text || 'task').slice(0, 80), type: taskType, picked: model.name, why: reason, live: liveInfo };
  db.routingLog.unshift(entry);
  db.routingLog = db.routingLog.slice(0, 50);
  await writeStore(db);

  return { taskType, model, reason };
}

export async function listModels() { return (await readStore()).models; }
export async function routingLog() { return (await readStore()).routingLog; }
