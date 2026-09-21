import { Router } from 'express';
import { readStore } from '../db/store.js';
const r=Router();
r.post('/login', async (req,res)=>{ const db=await readStore(); const user=db.users.find(u=>u.username===req.body.username) || db.users.find(u=>u.role===req.body.role) || db.users[0]; res.json({user, token:`demo.${user.id}`}); });
r.get('/me',(req,res)=>res.json({user:req.user}));
export default r;
