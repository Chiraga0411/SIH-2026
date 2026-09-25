import { Router } from 'express';
import { readStore } from '../db/store.js';

const r = Router();
r.get('/', async (req, res) => {
  const db = await readStore();
  const tasks = db.tasks || [];
  const projects = db.projects || [];
  const models = db.models || [];
  const audit = db.audit || [];
  const files = db.files || [];
  const counts = { total: tasks.length, queued: tasks.filter(t => t.status === 'queued').length, running: tasks.filter(t => t.status === 'running').length, approved: tasks.filter(t => t.status === 'approved').length, awaitingApproval: tasks.filter(t => t.status === 'awaiting_approval').length };
  const byType = tasks.reduce((a, t) => { const key = t.routing?.taskType || 'document'; a[key] = (a[key] || 0) + 1; return a; }, {});
  const recent = tasks.slice(0, 12).map(t => ({ id: t.id, title: t.title, status: t.status, stage: t.stage, model: t.routing?.model?.id, createdBy: t.createdBy, createdAt: t.createdAt }));
  res.json({ generatedAt: new Date().toISOString(), models, projects, tasks: recent, files: files.map(f => ({ id: f.id, originalName: f.originalName, projectId: f.projectId, uploadedAt: f.uploadedAt })), audit, counts, byType, queue: recent.filter(t => ['queued','running'].includes(t.status)).map((t, i) => ({ pos: i + 1, task: t.title, user: t.createdBy, model: t.model || 'not assigned', state: t.status })) });
});
export default r;
