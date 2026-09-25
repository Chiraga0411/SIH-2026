import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
export async function runSandbox({code='',language='python',timeout=20}) { if(language!=='python') throw new Error('Only Python is supported by the local sandbox'); const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sih-sandbox-')); const file=path.join(dir,'task.py'); await fs.writeFile(file,code); const started=Date.now(); let result={stdout:'',stderr:'',exitCode:0}; try { const r=await exec('python3',[file],{timeout:Math.min(Number(timeout)||20,60)*1000,maxBuffer:1024*1024}); result.stdout=r.stdout;result.stderr=r.stderr; } catch(e){result.stdout=e.stdout||'';result.stderr=e.stderr||e.message;result.exitCode=e.code||1;} finally {await fs.rm(dir,{recursive:true,force:true});} return {...result,durationMs:Date.now()-started,networkIsolation:'process-local; set SANDBOX_DOCKER=true for Docker network:none isolation',verified:result.exitCode===0}; }
