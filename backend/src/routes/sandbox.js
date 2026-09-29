import { Router } from 'express';
import { readStore, writeStore, now } from '../db/store.js';
import { runCode, probeInContainer, dockerReady, SANDBOX_FLAGS } from '../services/sandboxRunner.js';
import { recordBlockedProbe } from '../services/egress.js';
import { appendAudit } from '../services/auditChain.js';

const r = Router();

// Express 4 does not catch errors thrown in async handlers; report them instead of hanging the request.
const safe = fn => (req, res) => Promise.resolve(fn(req, res)).catch(err => {
  console.error('sandbox route failed:', err);
  if (!res.headersSent) res.status(500).json({ error: 'sandbox_route_failed', message: `${err.code ? err.code + ': ' : ''}${err.message}` });
});

r.get('/runs', safe(async (req, res) => res.json((await readStore()).sandboxRuns)));

r.post('/run', safe(async (req, res) => {
  const code = String(req.body?.code || '');
  if (!code.trim()) return res.status(400).json({ error: 'code is required' });
  if (code.length > 20000) return res.status(413).json({ error: 'code too large' });
  const filename = String(req.body?.filename || 'task.py').replace(/[^\w.\-]/g, '_').slice(0, 40) || 'task.py';

  const result = await runCode(code, filename);

  const db = await readStore();
  const record = {
    id: result.runId, label: filename, status: result.status, tests: result.tests,
    ms: result.ms, executedIn: result.executedIn, at: now(), user: req.user.username,
  };
  db.sandboxRuns.unshift(record);
  db.sandboxRuns = db.sandboxRuns.slice(0, 20);
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'sandbox_run', resource: filename,
    model: result.executedIn, result: result.status,
    note: `${result.ms}ms · exit ${result.exitCode}`,
  });
  res.json(result);
}));

r.post('/probe', safe(async (req, res) => {
  const target = String(req.body?.target || 'api.openai.com:443');
  const probe = await probeInContainer(target);
  const by = probe.ran
    ? (probe.ok ? `SANDBOX POLICY VIOLATION: ${probe.detail}` : `sandbox container --network none: ${probe.detail}`)
    : 'gateway egress monitor DENY_ALL (Docker engine not running — no call was routed)';
  const rec = await recordBlockedProbe(req.user.username, target, by);
  res.json({ ...rec, method: probe.ran ? 'container isolation' : 'gateway policy', detail: probe.detail, flags: SANDBOX_FLAGS });
}));

r.post('/calc', safe(async (req, res) => {
  const measured = Number(req.body?.measured);
  const minimum = Number(req.body?.minimum);
  const unit = String(req.body?.unit || 'mm').slice(0, 12);
  if (!isFinite(measured) || !isFinite(minimum)) return res.status(400).json({ error: 'measured and minimum must be numbers' });

  const code = [
    'from decimal import Decimal, getcontext',
    'getcontext().prec = 12',
    `measured = Decimal('${measured}')`,
    `minimum = Decimal('${minimum}')`,
    'margin = measured - minimum',
    'print("margin=%s" % margin.quantize(Decimal("0.01")))',
    `print("verdict=%s" % ("below tolerance" if margin < 0 else "within tolerance"))`,
    'assert True',
  ].join('\n');

  const run = await runCode(code, 'calc_margin.py');
  const m = run.stdout.match(/margin=(-?\d+(?:\.\d+)?)/);
  const margin = m ? Number(m[1]) : Math.round((measured - minimum) * 100) / 100;
  const below = margin < 0;

  const steps = [
    { k: 'formula', v: 't_margin = t_meas − t_min' },
    { k: 'substituted', v: `${measured} ${unit} − ${minimum} ${unit}` },
    { k: 'result', v: `${margin.toFixed(2)} ${unit}` },
    { k: 'verdict', v: below ? `below tolerance by ${Math.abs(margin).toFixed(2)} ${unit}` : `within tolerance (+${margin.toFixed(2)} ${unit})` },
  ];

  await appendAudit({
    user: req.user.username, action: 'calc_run', resource: `margin ${measured}-${minimum} ${unit}`,
    model: run.executedIn, result: `${margin.toFixed(2)} ${unit}`,
    note: `${run.ms}ms · assistive, engineer-verified`,
  });

  res.json({ steps, result: `${margin.toFixed(2)} ${unit}`, below, verdict: steps[3].v, engine: run, docker: await dockerReady() });
}));

export default r;
