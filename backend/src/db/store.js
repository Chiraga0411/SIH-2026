import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.env.STORAGE_DIR || './storage');
const dbFile = path.join(root, 'db.json');
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const seed = {
  users: [
    { id:'usr_engineer', username:'engineer@demo.local', role:'Engineer', clearance:'Internal' },
    { id:'usr_manager', username:'manager@demo.local', role:'Manager', clearance:'Restricted' },
    { id:'usr_admin', username:'admin@demo.local', role:'Admin', clearance:'Internal' }
  ],
  projects: [{ id:'prj_p101', name:'P-101 Inspection Review', visibility:'Private', members:['usr_engineer','usr_manager'], createdAt:now() }],
  files: [], tasks: [], audit: [],
  models: [
    { id:'general-local', name:'General Local Model', capabilities:['document','reasoning','summary'], enabled:true, source:'ollama-or-fallback' },
    { id:'coder-local', name:'Coder Local Model', capabilities:['code','debugging'], enabled:true, source:'ollama-or-fallback' },
    { id:'vision-local', name:'Vision/OCR Local Model', capabilities:['vision','ocr'], enabled:true, source:'local-pipeline' }
  ]
};

export async function initStore() {
  await fs.mkdir(path.join(root, 'uploads'), { recursive:true });
  await fs.mkdir(path.join(root, 'artifacts'), { recursive:true });
  try { await fs.access(dbFile); } catch { await fs.writeFile(dbFile, JSON.stringify(seed, null, 2)); }
}
export async function readStore() { await initStore(); return JSON.parse(await fs.readFile(dbFile, 'utf8')); }
export async function writeStore(data) { await fs.writeFile(dbFile, JSON.stringify(data, null, 2)); return data; }
export { root, now, id };
