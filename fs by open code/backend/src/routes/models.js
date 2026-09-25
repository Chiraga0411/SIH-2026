import { Router } from 'express';
import { readStore, writeStore, now } from '../db/store.js';
import { listModels, routeTask, routingLog } from '../services/modelRouter.js';
import { appendAudit } from '../services/auditChain.js';

const r = Router();

r.get('/', async (req, res) => res.json(await listModels()));

r.get('/routing-log', async (req, res) => res.json(await routingLog()));

r.post('/route', async (req, res) => res.json(await routeTask(req.body || {})));

/* Hot-add: append an entry to the registry. No code change, no restart —
   the router picks it up on the next decision because selection is by
   capability, not by hard-coded name. */
r.post('/', async (req, res) => {
  const { name, capabilities = [], ctx = 8192, vram = '—', tps = '—', load = '—' } = req.body || {};
  if (!name || !Array.isArray(capabilities) || !capabilities.length) {
    return res.status(400).json({ error: 'name and capabilities[] are required' });
  }
  const db = await readStore();
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model';
  let entryId = base;
  let n = 2;
  while (db.models.some(m => m.id === entryId)) entryId = `${base}-${n++}`;
  const model = {
    id: entryId, name, capabilities, ctx: Number(ctx) || 8192,
    vram: String(vram), tps, load: String(load), state: 'idle',
    enabled: true, source: req.body.source || 'ollama (local)', addedAt: now(),
  };
  db.models.push(model);
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'model_registered', resource: model.name,
    model: model.id, result: 'hot-added to registry',
    note: `capabilities: ${capabilities.join(', ')}`,
  });
  res.status(201).json({ model, models: db.models });
});

r.patch('/:id', async (req, res) => {
  const db = await readStore();
  const model = db.models.find(m => m.id === req.params.id);
  if (!model) return res.status(404).json({ error: 'model_not_found' });
  model.enabled = req.body?.enabled === undefined ? !model.enabled : !!req.body.enabled;
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'model_toggled', resource: model.name,
    model: model.id, result: model.enabled ? 'enabled' : 'disabled',
  });
  res.json(model);
});

export default r;
