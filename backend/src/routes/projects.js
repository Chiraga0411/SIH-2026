import { Router } from 'express';
import { readStore, writeStore, id, now } from '../db/store.js';
const r=Router();
r.get('/',async(req,res)=>res.json((await readStore()).projects));
r.post('/',async(req,res)=>{const db=await readStore();const p={id:id('prj'),name:req.body.name||'Untitled project',visibility:req.body.visibility||'Private',members:[req.user.id],createdAt:now()};db.projects.push(p);await writeStore(db);res.status(201).json(p);});
export default r;
