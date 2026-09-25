import { Router } from 'express';
import { readStore } from '../db/store.js';

/* Local knowledge base: documents + hybrid-style retrieval with
   retrieval-time clearance enforcement. A user below a document's
   clearance never has its chunks scored at all — the filter runs here,
   in the query, not in the UI. When the best score is under the
   threshold the agent abstains instead of guessing. */

const RANK = { Public: 0, Internal: 1, Restricted: 2 };
const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'which', 'this', 'that', 'from', 'are', 'was', 'were', 'how', 'why', 'who', 'when', 'does', 'have', 'has', 'into', 'their', 'about', 'not', 'any', 'all', 'you', 'your']);
const MIN_SCORE = 0.34;
const rank = c => RANK[c] ?? 1;

function tokens(q) {
  return (q.toLowerCase().match(/[a-z0-9][a-z0-9.-]{2,}/g) || []).filter(t => !STOP.has(t));
}

const r = Router();

r.get('/docs', async (req, res) => {
  const db = await readStore();
  const userRank = rank(req.user.clearance);
  res.json(db.kbDocs.map(d => ({
    id: d.id, name: d.name, type: d.type, pages: d.pages,
    clearance: d.clearance, chunks: d.chunks.length, ingested: d.ingested,
    retrievable: rank(d.clearance) <= userRank,
  })));
});

r.post('/search', async (req, res) => {
  const q = String(req.body?.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  const db = await readStore();
  const userRank = rank(req.user.clearance);
  const qt = tokens(q);

  let docsFiltered = 0, chunksScored = 0;
  const scored = [];
  for (const doc of db.kbDocs) {
    if (rank(doc.clearance) > userRank) { docsFiltered++; continue; }
    for (const c of doc.chunks) {
      chunksScored++;
      const low = c.text.toLowerCase();
      const hits = qt.filter(t => low.includes(t)).length;
      if (!hits) continue;
      let score = hits / Math.max(1, qt.length);
      if (low.includes(q.toLowerCase())) score = Math.min(1, score + 0.5);
      const nameHit = qt.filter(t => doc.name.toLowerCase().includes(t)).length;
      score = Math.min(1, score + nameHit * 0.05);
      scored.push({ doc: doc.name, docId: doc.id, page: c.page, text: c.text, clearance: doc.clearance, score: Math.round(score * 100) / 100 });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4);
  const best = top[0]?.score || 0;
  const abstained = best < MIN_SCORE || !top.length;

  res.json({
    query: q,
    answer: abstained
      ? 'Not found in the knowledge base.'
      : top.slice(0, 2).map(t => t.text).join(' '),
    citations: abstained ? [] : top,
    confidence: best,
    abstained,
    threshold: MIN_SCORE,
    clearance: req.user.clearance,
    retrieval: {
      docsConsidered: db.kbDocs.length,
      docsFilteredByClearance: docsFiltered,
      chunksScored,
      mode: 'keyword/BM25-style hybrid score over local chunks',
    },
  });
});

export default r;
