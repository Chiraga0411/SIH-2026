import { Router } from 'express';
import { readStore } from '../db/store.js';
import { verifyAudit } from '../services/auditChain.js';
const r=Router(); r.get('/',async(req,res)=>res.json((await readStore()).audit)); r.get('/verify',async(req,res)=>res.json(await verifyAudit())); export default r;
