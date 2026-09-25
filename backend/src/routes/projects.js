import { Router } from 'express';
import { readStore, writeStore, id, now } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';

const r = Router();

r.get('/', async (req, res) => {
  const db = await readStore();
  res.json(db.projects.map(p => ({
    id: p.id,
    name: p.name,
    visibility: p.visibility,
    lead: p.lead || db.users.find(u => u.id === p.members?.[0])?.name || '—',
    members: (p.members || []).map(uid => {
      const u = db.users.find(x => x.id === uid);
      return { id: uid, name: u?.name || uid, role: u?.role || '—', clearance: u?.clearance || '—' };
    }),
    memberCount: (p.members || []).length,
    taskCount: db.tasks.filter(t => t.projectId === p.id).length,
    createdAt: p.createdAt,
  })));
});

r.post('/', async (req, res) => {
  const db = await readStore();
  const p = {
    id: id('prj'),
    name: String(req.body?.name || 'Untitled project').slice(0, 80),
    visibility: req.body?.visibility === 'Shared' ? 'Shared' : 'Private',
    members: [req.user.id],
    lead: req.user.name || req.user.username,
    createdAt: now(),
  };
  db.projects.push(p);
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'project_created', resource: p.name,
    result: p.visibility,
  });
  res.status(201).json(p);
});

export default r;
