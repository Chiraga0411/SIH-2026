import { readStore } from '../db/store.js';
export async function requireAuth(req, res, next) {
  const username = req.header('x-demo-user') || req.body?.username || req.query?.username || 'engineer@demo.local';
  const db = await readStore(); const user = db.users.find(u => u.username === username) || db.users[0];
  req.user = user; next();
}
export function requireRole(...roles) { return (req,res,next) => roles.includes(req.user.role) ? next() : res.status(403).json({error:'forbidden', role:req.user.role, required:roles}); }
