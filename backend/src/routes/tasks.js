import { Router } from 'express';
import { readStore, writeStore, id, now, root } from '../db/store.js';
import { routeTask } from '../services/modelRouter.js';
import { appendAudit } from '../services/auditChain.js';
import {
  extractText, analyze, scanInjection, createApprovalDoc,
  createAnalysisXlsx, createSummaryPptx, PLAN_STEPS,
} from '../services/heroWorkflow.js';

const r = Router();

const strip = t => {
  if (!t) return t;
  const { filePath, ...rest } = t;
  if (rest.artifact) {
    const { path, ...artifact } = rest.artifact;
    rest.artifact = artifact;
  }
  return rest;
};

/* ---- GPU job queue (one GPU, fair order) -------------------------------- */
r.get('/queue', async (req, res) => {
  const db = await readStore();
  const active = db.tasks
    .filter(t => ['running', 'queued'].includes(t.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(active.map((t, i) => ({
    pos: i + 1,
    task: t.title,
    user: t.createdBy,
    model: t.routing?.model?.name || '—',
    state: t.status === 'running' ? 'running' : 'queued',
    id: t.id,
  })));
});

r.get('/', async (req, res) => {
  const db = await readStore();
  res.json(db.tasks
    .filter(t => !req.query.projectId || t.projectId === req.query.projectId)
    .map(strip));
});

r.get('/:id', async (req, res) => {
  const db = await readStore();
  const t = db.tasks.find(x => x.id === req.params.id);
  t ? res.json(strip(t)) : res.status(404).json({ error: 'task_not_found' });
});

/* ---- create + run the agent loop --------------------------------------- */
r.post('/', async (req, res) => {
  const db = await readStore();
  const files = (db.files || []).filter(f => (req.body.fileIds || []).includes(f.id));
  const prompt = String(req.body?.prompt || 'Analyze the inspection report and prepare an approval note.');
  const routing = await routeTask({ text: prompt, files: files.map(f => f.originalName), taskTitle: req.body.title || prompt });

  const task = {
    id: id('task'),
    projectId: req.body.projectId || 'prj_p101',
    title: String(req.body.title || 'Inspection analysis').slice(0, 120),
    prompt,
    fileIds: files.map(f => f.id),
    status: 'queued',
    stage: 'PLAN',
    routing,
    plan: PLAN_STEPS.map(p => ({ ...p })),
    createdBy: req.user.username,
    createdAt: now(),
    trace: [],
    injection: null,
    artifact: null,
    approvedBy: null,
    approvedAt: null,
  };
  db.tasks.unshift(task);
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'task_created', resource: task.id,
    model: routing.model.name, result: 'queued', note: routing.reason,
  });
  res.status(202).json(strip(task));
  runTask(task.id).catch(async err => {
    console.error('task run failed', err);
    try {
      const { db: d2, task: t2 } = await loadTask(task.id);
      if (t2) {
        t2.status = 'failed';
        t2.trace.push({ stage: 'ERROR', message: `Agent run failed: ${err.message}`, at: now(), ms: 0 });
        await writeStore(d2);
        await appendAudit({ user: task.createdBy, action: 'task_failed', resource: task.id, model: task.routing.model.name, result: 'failed', note: String(err.message).slice(0, 120) });
      }
    } catch (e2) { console.error('could not record task failure', e2); }
  });
});

async function loadTask(taskId) {
  const db = await readStore();
  return { db, task: db.tasks.find(t => t.id === taskId) };
}
const step = (task, since, extra = {}) => ({ at: now(), ms: Date.now() - since, ...extra });

async function runTask(taskId) {
  let { db, task } = await loadTask(taskId);
  if (!task) return;

  /* PLAN */
  task.status = 'running';
  task.stage = 'PLAN';
  let t0 = Date.now();
  task.trace.push({ stage: 'PLAN', message: 'Plan created: extract → search knowledge base → compare against SOP thresholds → verify → draft approval note', ...step(task, t0) });
  await writeStore(db);
  await appendAudit({ user: task.createdBy, action: 'agent_plan', resource: task.id, model: task.routing.model.name, result: 'ok' });

  /* ACT — local text extraction per file */
  ({ db, task } = await loadTask(taskId)); if (!task) return;
  task.stage = 'ACT';
  t0 = Date.now();
  const files = db.files.filter(f => task.fileIds.includes(f.id));
  const engines = [];
  let text = '';
  let flagged = null;
  for (const f of files) {
    const ex = await extractText(f.path, f.originalName);
    engines.push(`${f.originalName}: ${ex.engine}`);
    text += `\n${ex.text}`;
    const inj = scanInjection(ex.text);
    if (inj.found && !flagged) flagged = { file: f.originalName, found: inj.found };
    f.injection = inj.found ? { found: inj.found, action: 'Flagged, treated as data, no tool call issued' } : { found: null, action: 'Clean' };
  }
  task.extractedText = text.slice(0, 10000);
  task.plan[0].done = true;
  task.trace.push({
    stage: 'ACT', tool: 'ocr_read',
    message: files.length
      ? `Processed ${files.length} local file(s) — ${engines.join('; ')}`
      : 'No files attached — ran on the prompt text alone',
    ...step(task, t0),
  });
  for (const f of files) db.files[db.files.findIndex(x => x.id === f.id)] = f;
  await writeStore(db);   // persist before the next stage reloads (appendAudit writes back too)

  /* OBSERVE — grounded knowledge-base retrieval */
  ({ db, task } = await loadTask(taskId)); if (!task) return;
  t0 = Date.now();
  task.analysis = analyze(task.extractedText, db.kbDocs);
  task.plan[1].done = true;
  task.plan[2].done = true;
  task.trace.push({
    stage: 'ACT', tool: 'kb_search',
    message: `Retrieved ${task.analysis.citations.length} grounded citation(s) from the local knowledge base`,
    citations: task.analysis.citations.map(c => `${c.source} §p.${c.page}`),
    ...step(task, t0),
  });
  task.trace.push({
    stage: 'OBSERVE',
    message: task.analysis.findings.map(f => f.finding).join(' '),
    ...step(task, Date.now() - 1),
  });
  await writeStore(db);   // persist analysis + trace before VERIFY reloads

  /* VERIFY — thresholds + prompt-injection screen */
  ({ db, task } = await loadTask(taskId)); if (!task) return;
  task.stage = 'VERIFY';
  t0 = Date.now();
  task.plan[3].done = true;
  task.trace.push({
    stage: 'VERIFY',
    message: `Finding checked against local SOP thresholds. Prompt-injection screen: ${flagged ? `FLAGGED in ${flagged.file} — ignored as data` : 'clean'}.`,
    ...step(task, t0),
  });
  if (task.analysis.extractionFallback) {
    task.stage = 'REVISE';
    task.trace.push({
      stage: 'REVISE',
      message: 'Could not read measured / minimum thickness figures from the input (no extractable text, or no "<n> mm" readings found). Used the seeded sample values 8.1 / 8.5 mm — verify before relying on this note.',
      ...step(task, t0),
    });
    task.stage = 'VERIFY';
  }
  await writeStore(db);
  if (flagged) {
    task.injection = { ...flagged, action: 'Flagged, treated as data, no tool call issued' };
    await writeStore(db);
    await appendAudit({
      user: task.createdBy, action: 'prompt_injection_flagged', resource: flagged.file,
      model: 'allow-list', result: 'treated-as-data', note: flagged.found,
    });
  }

  /* DELIVER — real .docx */
  ({ db, task } = await loadTask(taskId)); if (!task) return;
  task.stage = 'DELIVER';
  t0 = Date.now();
  task.artifact = await createApprovalDoc({ task, analysis: task.analysis, user: { username: task.createdBy } });
  task.plan[4].done = true;
  task.status = 'awaiting_approval';
  task.trace.push({ stage: 'DELIVER', tool: 'make_docx', message: `Created ${task.artifact.filename} (${task.artifact.bytes} bytes, sha-256 ${task.artifact.sha256.slice(0, 12)}…), awaiting sign-off`, ...step(task, t0) });
  await writeStore(db);
  await appendAudit({
    user: task.createdBy, action: 'approval_note_generated', resource: task.id,
    model: task.routing.model.name, result: 'awaiting-approval', note: task.artifact.sha256,
  });
}

/* ---- approval gate ------------------------------------------------------ */
r.post('/:id/approve', async (req, res) => {
  const db = await readStore();
  const t = db.tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'task_not_found' });
  if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'manager_approval_required', role: req.user.role });
  }
  if (t.status === 'approved') return res.json(strip(t));
  if (t.status !== 'awaiting_approval') {
    return res.status(409).json({ error: 'not_ready_for_approval', status: t.status, message: 'Only a finished task that is awaiting approval can be signed off.' });
  }
  t.status = 'approved';
  t.approvedBy = req.user.username;
  t.approvedAt = now();
  t.trace.push({ stage: 'DELIVER', message: `Approved and signed by ${req.user.name || req.user.username} (${req.user.role})`, at: now(), ms: 0 });
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'approval_note_approved', resource: t.id,
    model: t.routing?.model?.name || 'gateway', result: 'approved',
    note: t.artifact?.sha256 || '',
  });
  res.json(strip(t));
});

/* ---- downloads ---------------------------------------------------------- */
const FORMATS = { docx: 'approval note', xlsx: 'findings workbook', pptx: 'board brief' };

r.get('/:id/deliverable', async (req, res) => {
  const fmt = String(req.query.format || 'docx').toLowerCase();
  if (!FORMATS[fmt]) return res.status(400).json({ error: 'format must be docx, xlsx or pptx' });
  const db = await readStore();
  const t = db.tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'task_not_found' });
  if (!t.analysis) return res.status(409).json({ error: 'task_still_running' });

  let artifact;
  if (fmt === 'docx') {
    if (!t.artifact) t.artifact = await createApprovalDoc({ task: t, analysis: t.analysis, user: { username: t.createdBy } });
    artifact = t.artifact;
    await writeStore(db);
  } else if (fmt === 'xlsx') {
    artifact = await createAnalysisXlsx({ task: t, analysis: t.analysis });
  } else {
    artifact = await createSummaryPptx({ task: t, analysis: t.analysis });
  }
  await appendAudit({
    user: req.user.username, action: 'deliverable_downloaded', resource: artifact.filename,
    model: fmt, result: 'ok', note: artifact.sha256,
  });
  res.download(artifact.path, artifact.filename);
});

r.get('/:id/artifact', async (req, res) => {
  const db = await readStore();
  const t = db.tasks.find(x => x.id === req.params.id);
  if (!t?.artifact) return res.status(404).json({ error: 'artifact_not_ready' });
  res.download(t.artifact.path, t.artifact.filename);
});

export default r;
