import http from 'node:http';
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { root } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';

/* Proxy onto the Python agent service (agent_service/main.py, :8002) hosting Models 1-8.

   SECURITY: the browser is never trusted for anything that decides access.
   - max_clearance always comes from the signed-in user, never from the request body.
   - auto_approve, files, out_dir and path are stripped: they would let a client skip the
     human approval gate or make the server read/write arbitrary paths.
   - Agent approval needs the Manager or Admin role, same as the Node approval route. */

const AI_SERVICE_URL = (process.env.GENERAL_SERVICE_URL || 'http://localhost:8002').replace(/\/$/, '');

const CLEAR_TO_INT = { Public: 0, Internal: 1, Restricted: 3 };   // matches samples/kb/manifest.json
export const clearanceInt = c => CLEAR_TO_INT[c] ?? 0;

/* node:http, not fetch: Node's built-in fetch gives up after 300 s without response headers no matter what
   AbortSignal says, and a write -> test -> fix coder loop on a small GPU can take longer than that. */
function callAgentService(p, body, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const url = new URL(AI_SERVICE_URL + p);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search,
      method: payload === null ? 'GET' : 'POST',
      headers: payload === null ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, resp => {
      const chunks = [];
      resp.on('data', c => chunks.push(c));
      resp.on('end', () => {
        let j = {};
        try { j = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* non-JSON body */ }
        if (resp.statusCode >= 200 && resp.statusCode < 300) return resolve(j);
        const detail = j?.detail || j?.error || `HTTP ${resp.statusCode}`;
        const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        err.status = resp.statusCode;
        reject(err);
      });
    });
    req.setTimeout(timeoutMs, () => { const e = new Error('timed out'); e.name = 'TimeoutError'; req.destroy(e); });
    req.on('error', err => reject(err.code === 'ECONNREFUSED'
      ? Object.assign(new Error(`cannot connect to ${AI_SERVICE_URL} (is agent_service running?)`), { name: 'ConnectError' })
      : err));
    if (payload !== null) req.write(payload);
    req.end();
  });
}

const str = (v, max = 4000) => String(v ?? '').slice(0, max);
const clamp = (n, lo, hi, d) => { n = Number(n); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };

/* Whitelist what the client may send, and inject the user's clearance. */
export const SANITIZE = {
  '/code/solve': (b) => ({ task: str(b.task, 2000), max_attempts: clamp(b.max_attempts, 1, 4, 3), use_escalation: b.use_escalation !== false }),
  '/kb/search': (b, u) => ({ query: str(b.query, 500), top_k: clamp(b.top_k, 1, 10, 5), mode: ['hybrid', 'dense', 'bm25'].includes(b.mode) ? b.mode : 'hybrid', max_clearance: clearanceInt(u.clearance) }),
  '/kb/answer': (b, u) => ({ question: str(b.question, 500), top_k: clamp(b.top_k, 1, 8, 4), max_clearance: clearanceInt(u.clearance) }),
  '/route': (b) => ({ text: str(b.text, 2000), files: [] }),
  '/agent/run': (b, u) => ({ request: str(b.request, 4000), files: [], max_clearance: clearanceInt(u.clearance), auto_approve: false }),
  '/agent/approve': (b) => ({ run_id: str(b.run_id, 80) }),
  '/doc/generate': (b) => ({ request: str(b.request, 4000), context: str(b.context, 8000), out_dir: 'workspace' }),
};

function proxyHandler(p, { auditAction, timeoutMs, roles } = {}) {
  return async (req, res) => {
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden', message: `${req.user.role} cannot do this. Requires: ${roles.join(' or ')}.` });
    }
    try {
      const body = SANITIZE[p](req.body || {}, req.user);
      const result = await callAgentService(p, body, timeoutMs);
      if (auditAction) {
        await appendAudit({ user: req.user.username, action: auditAction, resource: p,
          model: 'agent_service', result: 'ok', note: `clearance ${req.user.clearance}` });
      }
      res.json(result);
    } catch (err) {
      const timedOut = err.name === 'TimeoutError';
      res.status(timedOut ? 504 : 502).json({
        error: 'agent_service_unreachable_or_failed',
        message: timedOut ? `${p} timed out (the first request after a model swap can be slow - try again)` : err.message,
        hint: 'Check that agent_service is running on port 8002 (python -m uvicorn main:app --port 8002) and that the required Ollama model is pulled.',
      });
    }
  };
}

const r = Router();

// Model 2 (coder loop can take minutes on a 6 GB GPU: generate + test + fix + escalate)
r.post('/code/solve', proxyHandler('/code/solve', { auditAction: 'ai_code_solve', timeoutMs: 900000 }));

// Model 4
r.post('/kb/search', proxyHandler('/kb/search', { timeoutMs: 120000 }));
r.post('/kb/answer', proxyHandler('/kb/answer', { auditAction: 'ai_kb_answer', timeoutMs: 240000 }));
r.get('/kb/stats', async (req, res) => {
  try { res.json(await callAgentService('/kb/stats', undefined, 10000)); }
  catch (err) { res.status(502).json({ error: 'agent_service_unreachable', message: err.message }); }
});

// Model 4: fill the (initially empty) knowledge base
r.post('/kb/seed', async (req, res) => {
  try {
    const out = await callAgentService('/kb/seed', {}, 600000);
    await appendAudit({ user: req.user.username, action: 'kb_seed', resource: 'sample SOPs', model: 'agent_service', result: 'ok', note: `${out.results?.length || 0} documents` });
    res.json(out);
  } catch (err) {
    res.status(502).json({ error: 'kb_seed_failed', message: `${err.message} (is Ollama running with nomic-embed-text pulled?)` });
  }
});

const upload = multer({ dest: path.join(root, 'uploads'), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
const RANK = { Public: 0, Internal: 1, Restricted: 2 };
r.post('/kb/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const tmp = req.file.path + ext;
  await fs.rename(req.file.path, tmp);
  try {
    if (!['.md', '.markdown', '.txt', '.pdf'].includes(ext)) return res.status(400).json({ error: 'unsupported_type', message: 'Use .md, .txt or .pdf' });
    const label = req.body?.clearance in CLEAR_TO_INT ? req.body.clearance : 'Internal';
    if (RANK[label] > (RANK[req.user.clearance] ?? 0)) {
      return res.status(403).json({ error: 'forbidden', message: `Your clearance (${req.user.clearance}) cannot add ${label} documents.` });
    }
    const buf = await fs.readFile(tmp);
    const out = await callAgentService('/kb/ingest', {
      file_b64: buf.toString('base64'), source: path.basename(req.file.originalname, ext),
      clearance: CLEAR_TO_INT[label], doc_type: ext.slice(1),
    }, 600000);
    await appendAudit({ user: req.user.username, action: 'kb_ingest', resource: req.file.originalname, model: 'agent_service', result: out.status || 'ok', note: `${out.chunks ?? 0} chunks · ${label}` });
    res.json({ ...out, clearance: label });
  } catch (err) {
    res.status(502).json({ error: 'kb_ingest_failed', message: err.message });
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
});

// Model 6
r.post('/route', proxyHandler('/route', { timeoutMs: 30000 }));

// Model 7: full agent loop. Approval is a human gate: Manager/Admin only.
r.post('/agent/run', proxyHandler('/agent/run', { auditAction: 'ai_agent_run', timeoutMs: 900000 }));
r.post('/agent/approve', proxyHandler('/agent/approve', { auditAction: 'ai_agent_approve', timeoutMs: 60000, roles: ['Manager', 'Admin'] }));

// Model 8
r.post('/doc/generate', proxyHandler('/doc/generate', { auditAction: 'ai_doc_generate', timeoutMs: 300000 }));

export default r;
