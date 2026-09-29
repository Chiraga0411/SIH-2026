import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { root } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';

/* Real vision-model analysis (Model #3, qwen2.5vl:3b) for images/drawings the
   user uploads here. Separate from files.js because that route encrypts
   uploads at rest immediately - this one needs a short-lived plain temp file
   to hand to the vision service, deleted right after the model call.

   The image is sent to the vision service as a base64 data URL, not a file
   path — agent_service may be running on a different machine (e.g. the GPU
   box), which cannot see this server's local disk. */

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8002';

const MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.bmp': 'image/bmp',
};

const upload = multer({
  dest: path.join(root, 'uploads'),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const r = Router();

r.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });

  // multer strips the extension; keep it so we know the image type.
  const ext = path.extname(req.file.originalname) || '.png';
  const tmpPath = req.file.path + ext;
  await fs.rename(req.file.path, tmpPath);

  const mode = String(req.body?.mode || 'describe'); // describe | handwriting | drawing
  const question = req.body?.question;

  try {
    const endpoint = { describe: '/describe', handwriting: '/handwriting', drawing: '/drawing' }[mode];
    if (!endpoint) return res.status(400).json({ error: 'invalid mode' });

    const mime = MIME_BY_EXT[ext.toLowerCase()];
    if (!mime) return res.status(400).json({ error: 'unsupported_type', message: `Use one of: ${Object.keys(MIME_BY_EXT).join(', ')}` });

    const buf = await fs.readFile(tmpPath);
    const body = { image_b64: `data:${mime};base64,${buf.toString('base64')}` };
    if (mode === 'describe' && question) body.question = question;

    const resp = await fetch(`${VISION_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    });
    if (!resp.ok) throw new Error(`Vision service returned ${resp.status}`);
    const result = await resp.json();

    await appendAudit({
      user: req.user.username, action: 'vision_analysis', resource: req.file.originalname,
      model: 'vision (qwen2.5vl:3b)', result: 'ok', note: mode,
    });

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'vision_service_unreachable', message: err.message });
  } finally {
    await fs.unlink(tmpPath).catch(() => {}); // always clean up the temp file
  }
});

export default r;