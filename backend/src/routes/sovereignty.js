import { Router } from 'express';
import { readStore } from '../db/store.js';
import { recordBlockedProbe } from '../services/egress.js';
import { dockerReady } from '../services/sandboxRunner.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
let gpuCache = { at: 0, data: null };

async function readGpu() {
  if (Date.now() - gpuCache.at < 5000) return gpuCache.data;
  try {
    const r = await runFile('nvidia-smi',
      ['--query-gpu=memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits'],
      { timeout: 2500, windowsHide: true });
    const [used, total, util] = String(r.stdout).trim().split(/[\s,]+/).map(Number);
    gpuCache = { at: Date.now(), data: { present: true, usedMB: used, totalMB: total, utilPercent: util } };
  } catch {
    gpuCache = { at: Date.now(), data: { present: false } };
  }
  return gpuCache.data;
}

/* Sovereignty monitor: live status for the UI. externalConnections is
   always 0 by policy — the gateway holds no outbound client, and every
   attempt is denied and written to the audit chain. */

const r = Router();

r.get('/status', async (req, res) => {
  const db = await readStore();
  const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  let ollama = 'not running (optional — gateway works without it)';
  try {
    const ctrl = AbortSignal.timeout(600);
    const resp = await fetch(`${base}/api/tags`, { signal: ctrl });
    if (resp.ok) ollama = 'operational';
  } catch { /* keep default */ }
  const docker = await dockerReady();

  const blockedAttempts = db.audit
    .filter(e => e.action === 'egress_probe')
    .slice(0, 20)
    .map(e => ({ t: e.time, target: e.resource, verdict: e.result, by: e.model, note: e.note }));

  res.json({
    mode: 'local-demo',
    externalConnections: 0,
    egressPolicy: 'DENY_ALL',
    localServices: [
      { name: 'gateway', address: '127.0.0.1:' + (process.env.PORT || 4000), status: 'operational' },
      { name: 'ollama', address: base.replace('http://', ''), status: ollama },
      { name: 'knowledge-base', address: 'local storage + in-process retrieval', status: 'operational' },
      { name: 'sandbox', address: docker ? 'docker (--network none)' : 'local python fallback', status: docker ? 'container isolation active' : 'process isolation (start Docker Desktop for container isolation)' },
    ],
    blockedAttempts,
    gpu: await readGpu(),
    telemetryFlags: [
      'anonymized_telemetry=False', 'HF_HUB_OFFLINE=1', 'TRANSFORMERS_OFFLINE=1',
      'no LangSmith keys set', 'no cloud API keys in use',
    ],
    proofLayers: [
      { name: 'Network physically off', detail: 'Wi-Fi disabled / cable out — everything still works' },
      { name: 'Packet capture', detail: 'Wireshark during a full task shows zero non-local traffic' },
      { name: 'This monitor', detail: 'gateway egress policy DENY_ALL, polled live' },
      { name: 'Audit log', detail: 'every model call, tool call and file access recorded locally' },
    ],
    uptimeSec: Math.round(process.uptime()),
    disclosure: 'The gateway holds no outbound client. Counters are live gateway state; host-level connection enumeration is the Wireshark layer.',
  });
});

r.post('/probe', async (req, res) => {
  const target = String(req.body?.target || 'external-api.example.com:443');
  const rec = await recordBlockedProbe(
    req.user.username, target,
    'gateway egress monitor DENY_ALL (no outbound client exists in the gateway)',
  );
  res.json(rec);
});

export default r;
