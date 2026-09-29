import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { initStore } from './db/store.js';
import { requireAuth } from './middleware/auth.js';
import auth from './routes/auth.js';
import projects from './routes/projects.js';
import files from './routes/files.js';
import models from './routes/models.js';
import knowledge from './routes/knowledge.js';
import multimodal from './routes/multimodal.js';
import vision from './routes/vision.js';
import sandbox from './routes/sandbox.js';
import tasks from './routes/tasks.js';
import audit from './routes/audit.js';
import sovereignty from './routes/sovereignty.js';
import evaluation from './routes/evaluation.js';
import ai from './routes/ai.js';

// Express 4 ignores rejected promises from async route handlers: the request hangs and Node (>=15) can exit.
// Forward them to the error handler below instead. Guarded so a different express layout cannot stop startup.
try {
  const { default: Layer } = await import('express/lib/router/layer.js');
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function (req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next();
    try { const out = fn(req, res, next); if (out && typeof out.catch === 'function') out.catch(next); }
    catch (err) { next(err); }
  };
  void original;
} catch (e) { console.warn('async error forwarding not installed:', e.message); }
process.on('unhandledRejection', err => console.error('unhandled rejection:', err));

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
// Every request carries the acting demo user (header, body or query).
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  requireAuth(req, res, next);
});

app.get('/health', (req, res) =>
  res.json({ ok: true, service: 'sovereign-ai-gateway', mode: 'local-json' }));

app.use('/api/auth', auth);
app.use('/api/projects', projects);
app.use('/api/files', files);
app.use('/api/models', models);
app.use('/api/knowledge', knowledge);
app.use('/api/multimodal', multimodal);
app.use('/api/vision', vision);
app.use('/api/sandbox', sandbox);
app.use('/api/tasks', tasks);
app.use('/api/audit', audit);
app.use('/api/sovereignty', sovereignty);
app.use('/api/evaluation', evaluation);
app.use('/api/ai', ai);
app.use('/api/artifacts', express.static(path.resolve(process.env.STORAGE_DIR || './storage', 'artifacts')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

await initStore();
app.listen(port, '0.0.0.0', () =>
  console.log(`Sovereign AI gateway listening on http://127.0.0.1:${port}`));
