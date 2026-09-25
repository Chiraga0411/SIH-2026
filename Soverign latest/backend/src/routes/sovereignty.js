import { Router } from 'express';
import { appendAudit } from '../services/auditChain.js';
const r=Router();
r.get('/status',async(req,res)=>res.json({mode:'local-demo',externalConnections:0,egressPolicy:'DENY_ALL',localServices:[{name:'gateway',address:'127.0.0.1:4000',status:'operational'},{name:'ollama',address:'127.0.0.1:11434',status:'optional'},{name:'knowledge-base',address:'local-storage',status:'operational'}],disclosure:'Counters are local demo telemetry until host-level monitoring is connected.'}));
r.post('/probe',async(req,res)=>{const event=await appendAudit({user:req.user.username,action:'egress_probe',resource:req.body?.target||'external-api.example.com:443',result:'blocked'});res.json({blocked:true,target:req.body?.target||'external-api.example.com:443',policy:'DENY_ALL',auditId:event.id});});
export default r;
