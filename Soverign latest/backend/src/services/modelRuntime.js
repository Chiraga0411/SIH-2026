import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readStore, writeStore, id, now } from '../db/store.js';
import { appendAudit } from './auditChain.js';
const exec = promisify(execFile);
const caps = name => /vision|vl|llava|pixtral/i.test(name) ? ['vision','reasoning'] : /coder|code/i.test(name) ? ['code','reasoning'] : ['reasoning','summarise'];
export async function runtimeStatus() {
  try { const r=await exec('ollama',['--version']); return {installed:true,version:r.stdout.trim(),service:'unknown'}; } catch { return {installed:false,version:null,service:'unavailable',message:'Install Ollama from https://ollama.com/download before pulling local models.'}; }
}
export async function installedModels() {
  try { const r=await exec('ollama',['list']); const lines=r.stdout.trim().split('\n').slice(1).filter(Boolean); return lines.map(line=>{const p=line.trim().split(/\s+/); return {name:p[0],id:p[0],size:p[2]||'',modified:p.slice(3).join(' ')};}); } catch { return []; }
}
export async function registry() { const db=await readStore(); const installed=await installedModels(); const names=new Set(installed.map(x=>x.name)); return {models:db.models.map(m=>({...m,installed:names.has(m.id)||names.has(m.name)})),installed,runtime:await runtimeStatus()}; }
export async function installModel({name,capabilities=[]}, user='engineer@demo.local') {
  if (!name || !/^[\w.:-]+$/.test(name)) throw new Error('Invalid Ollama model name');
  const status=await runtimeStatus(); if (!status.installed) throw new Error(status.message);
  await exec('ollama',['pull',name],{timeout:30*60*1000});
  const db=await readStore(); if(!db.models.some(m=>m.id===name)){db.models.push({id:name,name,caps:capabilities.length?capabilities:caps(name),ctx:32768,vram:'unknown',tps:0,load:'runtime',state:'idle',enabled:true});await writeStore(db);}
  await appendAudit({user,action:'model_install',resource:name,result:'installed',at:now()}); return (await registry());
}
