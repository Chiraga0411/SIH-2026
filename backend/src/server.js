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
import sandbox from './routes/sandbox.js';
import tasks from './routes/tasks.js';
import audit from './routes/audit.js';
import sovereignty from './routes/sovereignty.js';
import evaluation from './routes/evaluation.js';

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
app.use('/api/sandbox', sandbox);
app.use('/api/tasks', tasks);
app.use('/api/audit', audit);
app.use('/api/sovereignty', sovereignty);
app.use('/api/evaluation', evaluation);
app.use('/api/artifacts', express.static(path.resolve(process.env.STORAGE_DIR || './storage', 'artifacts')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

await initStore();
app.listen(port, '0.0.0.0', () =>
  console.log(`Sovereign AI gateway listening on http://127.0.0.1:${port}`));
