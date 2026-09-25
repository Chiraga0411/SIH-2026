import { Router } from 'express';
import { readStore } from '../db/store.js';
import { searchIndex } from '../services/knowledge.js';
const r=Router();
r.post('/run',async(req,res)=>{const questions=req.body?.questions||[{q:'minimum shell thickness P-101',expected:'8.5 mm'},{q:'follow-up inspection return to service',expected:'follow-up'}];const rows=[];for(const item of questions){const hits=await searchIndex(item.q);const answer=hits.map(h=>h.text).join(' ');rows.push({question:item.q,expected:item.expected,matched:answer.toLowerCase().includes(String(item.expected).toLowerCase()),topScore:hits[0]?.score||0,sources:hits.slice(0,3).map(h=>h.source)});}const tasks=(await readStore()).tasks||[];res.json({ranAt:new Date().toISOString(),retrieval:{total:rows.length,correct:rows.filter(x=>x.matched).length,accuracy:rows.length?rows.filter(x=>x.matched).length/rows.length:0,rows},workflow:{total:tasks.length,approved:tasks.filter(t=>t.status==='approved').length,awaitingApproval:tasks.filter(t=>t.status==='awaiting_approval').length}});});
r.get('/latest',async(req,res)=>res.json({message:'Run POST /api/benchmarks/run to execute the local benchmark.',retrieval:null,workflow:null}));
export default r;
