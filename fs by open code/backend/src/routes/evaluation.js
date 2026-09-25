import { Router } from 'express';
import { readStore, writeStore, now } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';

/* Evaluation: real numbers where the system has them (agent task success
   from actual runs), honest baselines elsewhere, both labelled. */

const TYPE_LABEL = {
  document: 'Scan → approval note',
  coding: 'Code + tests in sandbox',
  multimodal: 'P&ID / multimodal extraction',
};

function liveTaskRows(db) {
  const byType = {};
  for (const t of db.tasks) {
    const type = t.routing?.taskType || 'document';
    (byType[type] = byType[type] || []).push(t);
  }
  const rows = [];
  for (const [type, list] of Object.entries(byType)) {
    const done = list.filter(t => ['awaiting_approval', 'approved'].includes(t.status));
    const durations = done
      .map(t => (t.approvedAt ? new Date(t.approvedAt) - new Date(t.createdAt) : null))
      .filter(d => d !== null && d >= 0);
    const avg = durations.length
      ? `${Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000))}s`
      : '—';
    rows.push({ task: TYPE_LABEL[type] || type, runs: list.length, success: done.length, avg, live: true });
  }
  return rows;
}

const r = Router();

r.get('/', async (req, res) => {
  const db = await readStore();
  const live = liveTaskRows(db);
  const tasks = db.evaluation.tasks.map(b => live.find(l => l.task === b.task) || { ...b, live: false });
  for (const l of live) if (!tasks.some(t => t.task === l.task)) tasks.push(l);
  res.json({
    retrieval: db.evaluation.retrieval,
    tasks,
    models: db.models.filter(m => m.tps !== '—').map(m => ({ name: m.name, tps: m.tps, load: m.load, vram: m.vram, enabled: m.enabled })),
    lastRun: db.evaluation.lastRun,
    source: db.evaluation.source,
    liveTaskRuns: db.tasks.length,
    sandboxRuns: db.sandboxRuns.length,
  });
});

r.post('/run', async (req, res) => {
  const db = await readStore();
  db.evaluation.lastRun = now();
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'evaluation_run', resource: 'agent task harness',
    model: 'local', result: `${db.tasks.length} live task(s)`,
  });
  const live = liveTaskRows(db);
  res.json({
    ran: true,
    at: db.evaluation.lastRun,
    live,
    note: live.length
      ? `Recomputed from ${db.tasks.length} live task run(s) on this gateway.`
      : 'No live task runs yet — run a task in the Agent panel, then re-run.',
  });
});

export default r;
