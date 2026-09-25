import { Router } from 'express';
import { buildIndex, loadIndex, searchIndex } from '../services/knowledge.js';
const r=Router();
r.get('/status',async(req,res)=>{const idx=await loadIndex();res.json({documents:new Set(idx.map(x=>x.fileId)).size,chunks:idx.length,indexedAt:idx[0]?.indexedAt||null});});
r.post('/reindex',async(req,res)=>res.json(await buildIndex()));
r.get('/search',async(req,res)=>res.json(await searchIndex(req.query.q||'')));
export default r;
