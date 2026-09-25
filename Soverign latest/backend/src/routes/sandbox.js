import { Router } from 'express';
import { runSandbox } from '../services/sandbox.js';
const r=Router();
r.post('/run',async(req,res)=>{try{res.json(await runSandbox(req.body||{}));}catch(e){res.status(400).json({error:'sandbox_failed',message:e.message});}});
export default r;
