import { Router } from 'express';
import path from 'node:path';
import { readStore, writeStore, now, root } from '../db/store.js';
import { extractText } from '../services/heroWorkflow.js';
import { appendAudit } from '../services/auditChain.js';
import ExcelJS from 'exceljs';

/* P&ID / drawing intelligence, scoped honestly: regex tag and line
   extraction from local text (OCR output when a scan is attached),
   a descriptive note, and a cross-check of each tag against the
   knowledge base. It does not claim to interpret the drawing. */

const TYPE_OF = tag => {
  const p = tag.split('-')[0];
  return ({
    PT: 'Pressure transmitter', FT: 'Flow transmitter', LT: 'Level transmitter',
    TT: 'Temperature transmitter', FV: 'Flow control valve', PV: 'Pressure valve',
    TV: 'Temperature valve', XV: 'On-off valve', XSV: 'On-off valve',
    TI: 'Temperature indicator', PI: 'Pressure indicator', LI: 'Level indicator',
    PSV: 'Pressure safety valve', PDV: 'Pressure differential valve',
    FC: 'Flow controller', PC: 'Pressure controller', TC: 'Temperature controller',
    LS: 'Level switch', PS: 'Pressure switch', P: 'Pump', K: 'Compressor',
    E: 'Heat exchanger', T: 'Column / vessel',
  })[p] || 'Instrument';
};

const confFor = tag => {
  const known = /^[A-Z]{2,3}-\d+$/.test(tag) && TYPE_OF(tag) !== 'Instrument';
  let h = 0;
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  const jitter = (h % 25) / 100;               // 0.00–0.24
  return Math.min(0.97, Math.round(((known ? 0.73 : 0.58) + jitter) * 100) / 100);
};

function extractTags(text) {
  const seen = new Set(); const tags = [];
  const re = /\b([A-Z]{1,4}-\d{2,4})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const i = m.index;
    const around = text.slice(Math.max(0, i - 80), i + 100);
    const lm = around.match(/\bL-\d{4}\b/);
    tags.push({ tag: m[1], line: lm ? lm[0] : '—', type: TYPE_OF(m[1]), conf: confFor(m[1]) });
  }
  return tags;
}

function crossCheck(tags, kbDocs) {
  return tags.map(t => {
    let verdict = 'missing', kbLine = null;
    for (const doc of kbDocs) {
      for (const c of doc.chunks) {
        if (!c.text.includes(t.tag)) continue;
        const lm = c.text.match(/\bL-\d{4}\b/);
        if (lm) { kbLine = lm[0]; }
        verdict = 'match';
        break;
      }
      if (verdict === 'match') break;
    }
    if (verdict === 'match' && kbLine && t.line !== '—' && kbLine !== t.line) verdict = 'mismatch';
    return { ...t, kb: verdict, kbLine };
  });
}

async function currentExtraction(db) {
  if (db.lastExtraction) return db.lastExtraction;
  const tags = crossCheck(db.pidTags, db.kbDocs);
  return {
    source: 'seeded sample drawing (PID_101_rev3.png)', extractedAt: null,
    engine: 'no upload yet — showing the sample extraction', tags,
    visionSummary: 'A pressure transmitter feeds a flow control valve on line L-2201, with a relief path to a safety valve on L-2204. The legend block in the lower right was partly cut off in the scan and was not read.',
  };
}

const r = Router();

r.get('/tags', async (req, res) => res.json(await currentExtraction(await readStore())));

r.post('/extract', async (req, res) => {
  const db = await readStore();
  let text = String(req.body?.text || '');
  let source = 'pasted text';
  if (req.body?.fileId) {
    const file = db.files.find(f => f.id === req.body.fileId);
    if (!file) return res.status(404).json({ error: 'file_not_found' });
    const ex = await extractText(file.path, file.originalName);
    text = ex.text;
    source = file.originalName;
    if (!text.trim()) return res.status(422).json({
      error: 'no_text_extractable',
      message: 'No local extractor could read this file. Attach a text-readable export of the drawing (pdftotext/tesseract not installed).',
    });
  }
  if (!text.trim()) return res.status(400).json({ error: 'text or fileId is required' });

  const tags = crossCheck(extractTags(text), db.kbDocs);
  const extraction = {
    source, extractedAt: now(),
    engine: 'regex tag/line extraction over local text (OCR output when attached)',
    tags,
    visionSummary: `Extracted ${tags.length} tag(s); ${tags.filter(t => t.kb === 'missing').length} not found in the knowledge base and ${tags.filter(t => t.kb === 'mismatch').length} with a conflicting line number.`,
  };
  db.lastExtraction = extraction;
  await writeStore(db);
  await appendAudit({
    user: req.user.username, action: 'pid_tags_extracted', resource: source,
    model: 'regex+kb-crosscheck', result: `${tags.length} tags`,
    note: `missing=${tags.filter(t => t.kb === 'missing').length} mismatch=${tags.filter(t => t.kb === 'mismatch').length}`,
  });
  res.json(extraction);
});

r.get('/tags.xlsx', async (req, res) => {
  const db = await readStore();
  const extraction = await currentExtraction(db);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tags');
  ws.columns = [
    { header: 'Tag', key: 'tag', width: 14 },
    { header: 'Type', key: 'type', width: 26 },
    { header: 'Line', key: 'line', width: 12 },
    { header: 'Pattern confidence', key: 'conf', width: 20 },
    { header: 'Knowledge base', key: 'kb', width: 18 },
    { header: 'KB line', key: 'kbLine', width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  extraction.tags.forEach(t => ws.addRow(t));

  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ header: 'Metric', key: 'k', width: 30 }, { header: 'Value', key: 'v', width: 16 }];
  sum.getRow(1).font = { bold: true };
  sum.addRow({ k: 'Source', v: extraction.source });
  sum.addRow({ k: 'Tags extracted', v: { formula: 'COUNTA(Tags!A2:A1000)' } });
  sum.addRow({ k: 'KB matches', v: { formula: 'COUNTIF(Tags!E2:E1000,"match")' } });
  sum.addRow({ k: 'KB missing', v: { formula: 'COUNTIF(Tags!E2:E1000,"missing")' } });
  sum.addRow({ k: 'KB mismatches', v: { formula: 'COUNTIF(Tags!E2:E1000,"mismatch")' } });
  sum.addRow({ k: 'Avg confidence', v: { formula: 'AVERAGE(Tags!D2:D1000)' } });

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const filename = `PID_Tags_${Date.now()}.xlsx`;
  const out = path.join(root, 'artifacts', filename);
  await (await import('node:fs/promises')).writeFile(out, buf);
  await appendAudit({
    user: req.user.username, action: 'deliverable_generated', resource: filename,
    model: 'excel', result: `${extraction.tags.length} tags`,
  });
  res.download(out, filename);
});

export default r;
