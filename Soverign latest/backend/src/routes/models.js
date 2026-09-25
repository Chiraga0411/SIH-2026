import { Router } from 'express';
import { listModels, routeTask } from '../services/modelRouter.js';
import { registry, installModel } from '../services/modelRuntime.js';
const r=Router();
r.get('/',async(req,res)=>res.json(await listModels()));
r.get('/runtime',async(req,res)=>res.json(await registry()));
r.post('/route',async(req,res)=>res.json(await routeTask(req.body||{})));
r.post('/install',async(req,res)=>{try{res.status(201).json(await installModel(req.body||{},req.user.username));}catch(e){res.status(400).json({error:'model_install_failed',message:e.message});}});
export default r;
