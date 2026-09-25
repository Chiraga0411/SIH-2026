import fs from 'node:fs/promises';
import path from 'node:path';
import { readStore, writeStore, root, now } from '../db/store.js';
import { extractText } from './heroWorkflow.js';
const indexFile=path.join(root,'knowledge-index.json');
export async function buildIndex() { const db=await readStore(); const chunks=[]; for(const f of (db.files||[])){const text=(await extractText(f.path,f.originalName)).replace(/\s+/g,' ').trim(); if(!text)continue; for(let i=0;i<text.length;i+=800) chunks.push({fileId:f.id,source:f.originalName,chunk:i/800+1,text:text.slice(i,i+800),indexedAt:now()}); } await fs.writeFile(indexFile,JSON.stringify(chunks,null,2)); return {documents:new Set(chunks.map(c=>c.fileId)).size,chunks:indexedAtCount(chunks),indexedAt:now()}; }
function indexedAtCount(chunks){return chunks.length;}
export async function loadIndex(){try{return JSON.parse(await fs.readFile(indexFile,'utf8'));}catch{await buildIndex();return JSON.parse(await fs.readFile(indexFile,'utf8'));}}
export async function searchIndex(q='') { const terms=q.toLowerCase().split(/\s+/).filter(Boolean); const chunks=await loadIndex(); return chunks.map(c=>({...c,score:terms.reduce((n,t)=>n+(c.text.toLowerCase().includes(t)?1:0),0)/Math.max(terms.length,1)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,8); }
