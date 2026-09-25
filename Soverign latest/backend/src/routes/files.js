import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { root, readStore, writeStore, id, now } from '../db/store.js';
import { appendAudit } from '../services/auditChain.js';
const upload=multer({dest:path.join(root,'uploads')}); const r=Router();
r.get('/',async(req,res)=>res.json((await readStore()).files.filter(f=>!req.query.projectId||f.projectId===req.query.projectId)));
r.post('/upload',upload.array('files',10),async(req,res)=>{const db=await readStore();const files=(req.files||[]).map(f=>({id:id('file'),originalName:f.originalname,storedName:f.filename,path:f.path,mimeType:f.mimetype,size:f.size,projectId:req.body.projectId||'prj_p101',clearance:req.body.clearance||'Internal',createdAt:now(),uploadedBy:req.user.username}));db.files.push(...files);await writeStore(db);for(const f of files)await appendAudit({user:req.user.username,action:'file_upload',resource:f.originalName,result:'stored-locally'});res.status(201).json(files);});
export default r;
