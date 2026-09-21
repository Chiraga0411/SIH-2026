import { readStore } from '../db/store.js';
export async function routeTask({text='', files=[]}) {
  const q = `${text} ${files.join(' ')}`.toLowerCase();
  let taskType='document', modelId='general-local', reason='Document drafting or reasoning requested.';
  if (/code|python|javascript|stack trace|test|debug/.test(q)) { taskType='coding'; modelId='coder-local'; reason='Code execution or debugging language detected.'; }
  else if (/scan|image|handwriting|drawing|p&id|photo|ocr|pdf/.test(q)) { taskType='multimodal'; modelId='vision-local'; reason='Image, scanned document, or drawing input detected.'; }
  const db=await readStore(); const model=db.models.find(m=>m.id===modelId && m.enabled) || db.models[0];
  return { taskType, model, reason };
}
export async function listModels() { return (await readStore()).models; }
