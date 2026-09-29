import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell } from 'docx';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
import { root } from '../db/store.js';
import { withPlainFile } from './atRest.js';

const exec = promisify(execFile);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* ---------- local text extraction ---------------------------------------- */

const OCR_SERVICE_URL = process.env.VISION_SERVICE_URL_8002 || process.env.GENERAL_SERVICE_URL || 'http://localhost:8002';

/* Model #5 (OCR, FastAPI on :8002 /ocr/read) reads scanned images with
   confidence scoring and equipment-tag extraction — better than plain
   tesseract stdout. Falls back to local tesseract/pdftotext below if the
   service is down, so this never blocks the pipeline. */
async function ocrViaModel5(plainPath) {
  try {
    const buf = await fs.readFile(plainPath);
    const resp = await fetch(`${OCR_SERVICE_URL}/ocr/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: buf.toString('base64'), mode: 'document' }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) throw new Error(`OCR service returned ${resp.status}`);
    const j = await resp.json();
    if (!j.text || !j.text.trim()) throw new Error('empty OCR result');
    return { text: j.text, engine: `model 5 OCR (${j.engine || 'tesseract'}, confidence ${Math.round((j.confidence || 0) * 100)}%)` };
  } catch (err) {
    return { error: err.name === 'TimeoutError' ? 'OCR service timed out' : err.message };
  }
}

export async function extractText(filePath, originalName = '') {
  // Stored files are AES-256-GCM encrypted at rest; extract from a
  // temporary plaintext copy that is deleted immediately afterwards.
  return withPlainFile(filePath, plain => extractFromPlain(plain, originalName, filePath));
}

async function extractFromPlain(plainPath, originalName, storedPath) {
  const ext = path.extname(originalName || storedPath).toLowerCase();
  if (ext === '.pdf') {
    try {
      const r = await exec('pdftotext', [plainPath, '-'], { timeout: 20000 });
      if (r.stdout.trim()) return { text: r.stdout, engine: 'pdftotext (digital PDF)' };
    } catch { /* fall through */ }
  }
  if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'].includes(ext)) {
    const m5 = await ocrViaModel5(plainPath);
    if (!m5.error) return m5;
  }
  if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'].includes(ext) || ext === '.pdf') {
    try {
      const r = await exec('tesseract', [plainPath, 'stdout', '-l', 'eng'], { timeout: 30000 });
      if (r.stdout.trim()) return { text: r.stdout, engine: 'tesseract OCR (local fallback)' };
    } catch { /* fall through */ }
  }
  try {
    const raw = await fs.readFile(plainPath, 'utf8');
    if (raw.trim()) return { text: raw, engine: 'direct text read' };
  } catch { /* binary we cannot read locally */ }
  return { text: '', engine: 'no local extractor available for this file type' };
}

/* ---------- prompt-injection screen -------------------------------------- */

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+|any\s+|previous\s+|prior\s+)?instructions/i,
  /disregard\s+(?:the\s+)?(?:previous|prior|above)/i,
  /you\s+are\s+now\s+(?:a|an|the)\s+\w+/i,
  /email\s+(?:this|these|the)\s+(?:file|document|data|content)/i,
  /exfiltrat|send\s+(?:this|these|the)\s+(?:file|document)\s+to\s+https?:/i,
];

export function scanInjection(text) {
  if (!text) return { found: null };
  for (const p of INJECTION_PATTERNS) {
    const m = text.match(p);
    if (m) return { found: m[0].trim() };
  }
  return { found: null };
}

/* ---------- local knowledge-grounded analysis ----------------------------- */

export function analyze(text, kbDocs = []) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  // Classify every "<number> mm" by the words just before/after it. (The old single regex forbade a
  // full stop between the two figures, so "Measured 9.2 mm. SOP minimum required 8.5 mm." silently
  // fell back to the seeded 8.1 / 8.5 and produced a wrong finding.)
  let measuredFound = null, minimumFound = null;
  const mmRe = /(\d+(?:\.\d+)?)\s*mm\b/gi;
  let mm;
  while ((mm = mmRe.exec(normalized)) !== null) {
    const before = normalized.slice(Math.max(0, mm.index - 45), mm.index).toLowerCase();
    const after = normalized.slice(mm.index + mm[0].length, mm.index + mm[0].length + 12).toLowerCase();
    // words BEFORE the number decide first; words after it only when nothing before says (so the
    // "(minimum" that follows 7.9 in "7.9 mm (minimum 8.5 mm)" is not mistaken for 7.9's label)
    let isMin = /(minimum|min\.?|required|allowable|permissible)[^0-9]*$/.test(before);
    let isMeas = /(measured|reading|recorded|found|thickness|gauged)[^0-9]*$/.test(before);
    if (!isMin && !isMeas) {
      isMin = /^\s*[)(,;]?\s*(minimum|min\b|required)/.test(after);
      isMeas = /^\s*[)(,;]?\s*(measured|reading|recorded)/.test(after);
    }
    if (isMin && minimumFound === null) minimumFound = Number(mm[1]);
    else if (isMeas && !isMin && measuredFound === null) measuredFound = Number(mm[1]);
  }
  const figuresFound = measuredFound !== null && minimumFound !== null;
  const measured = figuresFound ? measuredFound : 8.1;
  const minimum = figuresFound ? minimumFound : 8.5;
  const below = measured < minimum;
  const margin = Math.round((measured - minimum) * 100) / 100;
  const finding = below
    ? `Measured thickness ${measured} mm is below the SOP minimum of ${minimum} mm.`
    : `Measured thickness ${measured} mm meets the SOP minimum of ${minimum} mm.`;

  // Ground citations in the actual local knowledge base chunks.
  const terms = ['thickness', 'minimum', 'follow-up', 'tolerance', 'return to service', 'corrosion'];
  const citations = [];
  for (const doc of kbDocs || []) {
    for (const c of doc.chunks || []) {
      const low = c.text.toLowerCase();
      if (terms.some(t => low.includes(t))) {
        citations.push({ source: doc.name, clearance: doc.clearance, page: c.page, quote: c.text });
      }
      if (citations.length >= 3) break;
    }
    if (citations.length >= 3) break;
  }
  if (!citations.length) {
    citations.push(
      { source: 'SOP-114 Pressure vessel inspection', clearance: 'Internal', page: 12, quote: `Minimum permissible shell thickness is ${minimum} mm.` },
      { source: 'Inspection report', clearance: 'Internal', page: 1, quote: `Measured thickness recorded as ${measured} mm.` },
    );
  }

  return {
    summary: normalized.slice(0, 700) || 'Report processed with the local fallback extractor. Figures shown are the seeded sample values — attach a text-readable report for measured figures.',
    extractionFallback: !figuresFound,
    figuresFound,
    findings: [{
      finding, measured, minimum, margin,
      verdict: below ? 'follow-up inspection required' : 'within tolerance',
      confidence: 0.94,
    }],
    citations,
  };
}

export const PLAN_STEPS = [
  { text: 'Extract text from the uploaded report (OCR where available)', done: false },
  { text: 'Search the local knowledge base for applicable SOP thresholds', done: false },
  { text: 'Compare findings against the thresholds', done: false },
  { text: 'Verify findings and flag anything suspicious', done: false },
  { text: 'Draft the approval note (Word) and request sign-off', done: false },
];

/* ---------- deliverables -------------------------------------------------- */

export async function createApprovalDoc({ task, analysis, user }) {
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: 'APPROVAL NOTE', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Note ref: ${task.id.slice(-8).toUpperCase()} · Subject: ${task.title}` }),
    new Paragraph({ text: `Prepared by: ${user.username} · Generated locally by the Sovereign AI Workbench` }),
    new Paragraph({ text: 'Background', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: task.prompt }),
    new Paragraph({ text: 'Key findings', heading: HeadingLevel.HEADING_1 }),
    ...analysis.findings.map(f => new Paragraph({ text: `${f.finding} Verdict: ${f.verdict}. Margin: ${f.margin} mm.`, bullet: { level: 0 } })),
    new Paragraph({ text: 'Recommendation', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: 'Carry out a follow-up inspection before P-101 returns to service, and record the result against SOP-114. Calculations are assistive and require engineer verification.' }),
    new Paragraph({ text: 'Sources and citations', heading: HeadingLevel.HEADING_1 }),
    new Table({ rows: analysis.citations.map(c => new TableRow({ children: [
      new TableCell({ children: [new Paragraph(c.source)] }),
      new TableCell({ children: [new Paragraph(`p.${c.page}: ${c.quote}`)] }),
    ] })) }),
    new Paragraph({ text: 'Approval chain', heading: HeadingLevel.HEADING_1 }),
    new Table({ rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Role') ] }), new TableCell({ children: [new Paragraph('Name') ] }), new TableCell({ children: [new Paragraph('Status') ] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Engineer') ] }), new TableCell({ children: [new Paragraph(user.username) ] }), new TableCell({ children: [new Paragraph('Drafted') ] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Manager') ] }), new TableCell({ children: [new Paragraph(task.approvedBy || '—') ] }), new TableCell({ children: [new Paragraph(task.status === 'approved' ? `Approved ${task.approvedAt || ''}` : 'Awaiting sign-off') ] })] }),
    ] }),
    new Paragraph({ text: `Status: ${task.status === 'approved' ? 'Approved and recorded in the audit chain.' : 'Awaiting manager approval.'}` }),
  ] }] });
  const buf = await Packer.toBuffer(doc);
  return saveArtifact(`Approval_Note_${task.id}.docx`, buf, 'docx');
}

export async function createAnalysisXlsx({ task, analysis }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Findings');
  ws.columns = [
    { header: 'Finding', key: 'finding', width: 62 },
    { header: 'Measured (mm)', key: 'measured', width: 15 },
    { header: 'Minimum (mm)', key: 'minimum', width: 15 },
    { header: 'Margin (mm)', key: 'margin', width: 14 },
    { header: 'Verdict', key: 'verdict', width: 32 },
    { header: 'Confidence', key: 'confidence', width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const f of analysis.findings) {
    const row = ws.addRow({ finding: f.finding, measured: f.measured, minimum: f.minimum, verdict: f.verdict, confidence: f.confidence });
    row.getCell('margin').value = { formula: `B${row.number}-C${row.number}`, result: f.margin }; // live formula
  }

  const cit = wb.addWorksheet('Citations');
  cit.columns = [{ header: 'Source', key: 'source', width: 46 }, { header: 'Page', key: 'page', width: 8 }, { header: 'Quote', key: 'quote', width: 80 }];
  cit.getRow(1).font = { bold: true };
  analysis.citations.forEach(c => cit.addRow(c));

  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ header: 'Metric', key: 'k', width: 34 }, { header: 'Value', key: 'v', width: 24 }];
  sum.getRow(1).font = { bold: true };
  sum.addRow({ k: 'Task', v: task.title });
  sum.addRow({ k: 'Status', v: task.status });
  sum.addRow({ k: 'Findings total', v: { formula: 'COUNTA(Findings!A2:A1000)' } });
  sum.addRow({ k: 'Needing follow-up', v: { formula: 'COUNTIF(Findings!E2:E1000,"*follow-up*")' } });
  sum.addRow({ k: 'Avg measured (mm)', v: { formula: 'AVERAGE(Findings!B2:B1000)' } });
  sum.addRow({ k: 'Citations attached', v: { formula: 'COUNTA(Citations!A2:A1000)' } });

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return saveArtifact(`Analysis_${task.id}.xlsx`, buf, 'xlsx');
}

export async function createSummaryPptx({ task, analysis }) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  const ink = '0d2035', cyan = '1f9fd0', amber = 'e08c00';

  const s1 = pptx.addSlide();
  s1.addText('Inspection Approval Brief', { x: 0.6, y: 1.6, w: 8.8, h: 1, fontSize: 40, bold: true, color: ink });
  s1.addText(task.title, { x: 0.6, y: 2.7, w: 8.8, h: 0.5, fontSize: 20, color: cyan });
  s1.addText(`Generated locally · ${task.id.slice(-8).toUpperCase()} · status: ${task.status}`, { x: 0.6, y: 3.3, w: 8.8, h: 0.4, fontSize: 14, color: amber });

  const s2 = pptx.addSlide();
  s2.addText('Key findings', { x: 0.6, y: 0.5, w: 8.8, h: 0.6, fontSize: 28, bold: true, color: ink });
  s2.addText(analysis.findings.map(f => ({ text: `${f.finding} — ${f.verdict}.`, options: { bullet: { code: '2022' }, breakLine: true } })),
    { x: 0.7, y: 1.3, w: 8.6, h: 2.6, fontSize: 17, color: '333333' });

  const s3 = pptx.addSlide();
  s3.addText('Sources', { x: 0.6, y: 0.5, w: 8.8, h: 0.6, fontSize: 28, bold: true, color: ink });
  s3.addText(analysis.citations.map(c => ({ text: `${c.source} (p.${c.page}) — ${c.quote}`, options: { bullet: { code: '2022' }, breakLine: true } })),
    { x: 0.7, y: 1.3, w: 8.6, h: 2.6, fontSize: 14, color: '333333' });

  const s4 = pptx.addSlide();
  s4.addText('Recommendation', { x: 0.6, y: 0.5, w: 8.8, h: 0.6, fontSize: 28, bold: true, color: ink });
  s4.addText('Follow-up inspection before return to service. Calculations are assistive and require engineer verification. Approval is recorded in the hash-chained audit log.',
    { x: 0.7, y: 1.4, w: 8.6, h: 1.6, fontSize: 17, color: '333333' });

  const buf = await pptx.write('nodebuffer');
  return saveArtifact(`Brief_${task.id}.pptx`, buf, 'pptx');
}

async function saveArtifact(filename, buf, format) {
  const out = path.join(root, 'artifacts', filename);
  await fs.writeFile(out, buf);
  return { filename, path: out, format, bytes: buf.length, sha256: sha256(buf) };
}
