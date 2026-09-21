import { Router } from 'express';
import { listModels, routeTask } from '../services/modelRouter.js';
const r=Router();
r.get('/',async(req,res)=>res.json(await listModels()));
r.post('/route',async(req,res)=>res.json(await routeTask(req.body||{})));
export default r;
