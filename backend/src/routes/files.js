import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { root, readStore, writeStore, id, now } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';
import { extractText, scanInjection } from '../services/heroWorkflow.js';
import { encryptBuffer } from '../services/atRest.js';
import fs from 'node:fs/promises';

const upload = multer({
  dest: path.join(root, 'uploads'),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});
const r = Router();

r.get('/', async (req, res) => {
  const db = await readStore();
  res.json(db.files
    .filter(f => !req.query.projectId || f.projectId === req.query.projectId)
    .map(({ path, ...rest }) => rest));
});

r.post('/upload', upload.array('files', 10), async (req, res) => {
  const db = await readStore();
  const files = [];
  for (const f of (req.files || [])) {
    // Encrypt the upload at rest (AES-256-GCM) before it is screened.
    const enc = await encryptBuffer(await fs.readFile(f.path));
    await fs.writeFile(f.path, enc);
    // Screen every upload for hidden instructions; document text is data, never instructions.
    const ex = await extractText(f.path, f.originalname);
    const inj = scanInjection(ex.text);
    const rec = {
      id: id('file'),
      originalName: f.originalname,
      storedName: f.filename,
      path: f.path,
      mimeType: f.mimetype,
      size: f.size,
      projectId: req.body.projectId || 'prj_p101',
      clearance: ['Public', 'Internal', 'Restricted'].includes(req.body.clearance) ? req.body.clearance : 'Internal',
      extractionEngine: ex.engine,
      encrypted: true,
      cipher: 'AES-256-GCM',
      injection: inj.found
        ? { found: inj.found, action: 'Flagged, treated as data, no tool call issued' }
        : { found: null, action: 'Clean' },
      createdAt: now(),
      uploadedBy: req.user.username,
    };
    files.push(rec);
    db.files.push(rec);
    if (inj.found) {
      await appendAudit({
        user: req.user.username, action: 'prompt_injection_flagged', resource: rec.originalName,
        model: 'upload-screen', result: 'treated-as-data', note: inj.found,
      });
    }
  }
  await writeStore(db);
  for (const f of files) {
    await appendAudit({
      user: req.user.username, action: 'file_upload', resource: f.originalName,
      model: f.extractionEngine, result: 'stored-locally', note: f.injection.found ? 'injection flagged' : 'clean',
    });
  }
  res.status(201).json(files.map(({ path, ...rest }) => rest));
});

export default r;
