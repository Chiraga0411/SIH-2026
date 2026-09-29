import crypto from 'node:crypto';
import { readStore, writeStore, now } from '../db/store.js';
const GENESIS = '0'.repeat(64);
const row = (prev, e) => [prev, e.time, e.user, e.action, e.resource, e.model, e.result, e.note || ''].join('|');
const hash = (prev, e) => crypto.createHash('sha256').update(row(prev, e)).digest('hex');

let auditLock = Promise.resolve();
export function appendAudit(args) {
  const job = auditLock.then(() => appendAuditNow(args));
  auditLock = job.catch(() => {});
  return job;
}

async function appendAuditNow({ user = 'system', action, resource, model = 'gateway', result = 'ok', note = '' }) {
  const db = await readStore();
  const prev = db.audit[0]?.hash || GENESIS;
  const entry = { id: crypto.randomUUID(), time: now(), user, action, resource, model, result, note, prevHash: prev };
  entry.hash = hash(prev, entry);
  db.audit.unshift(entry);
  await writeStore(db);
  return entry;
}

export async function verifyAudit() {
  const db = await readStore();
  let prev = GENESIS;
  for (let i = db.audit.length - 1; i >= 0; i--) {
    const e = db.audit[i];
    if (e.prevHash !== prev || hash(prev, e) !== e.hash) return { ok: false, brokenAt: i, checked: db.audit.length - i };
    prev = e.hash;
  }
  return { ok: true, brokenAt: null, checked: db.audit.length, head: prev };
}
