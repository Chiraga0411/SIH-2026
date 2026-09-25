import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { root } from '../db/store.js';

const runFile = promisify(execFile);
const RUN_TIMEOUT_MS = 20000;

/* Docker runs the code exactly as the PS asks: throwaway container,
   no network, read-only, no capabilities, memory/cpu/pid caps. When the
   Docker engine is not reachable (common on the demo laptop) we fall
   back to a local Python process in an isolated temp workspace with a
   hard timeout and a scrubbed environment, and say so plainly in the
   response — the UI shows which isolation actually applied. */

let dockerState = { at: 0, ok: false };

export async function dockerReady() {
  if (Date.now() - dockerState.at < 30000) return dockerState.ok;
  try {
    await runFile('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 5000, windowsHide: true });
    dockerState = { at: Date.now(), ok: true };
  } catch {
    dockerState = { at: Date.now(), ok: false };
  }
  return dockerState.ok;
}

export const SANDBOX_FLAGS = [
  '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
  '--security-opt', 'no-new-privileges', '--pids-limit', '128',
  '--memory', '512m', '--cpus', '1', '--user', '1000:1000',
];

const pythonBin = () => process.env.PYTHON_BIN || 'python';
const DEFAULT_IMAGE = () => process.env.SANDBOX_IMAGE || 'python:3.11-slim';

/* Scrub anything secret-looking, but keep the profile variables Windows
   needs to find an already-installed interpreter offline (stripping them
   makes the python.org launcher try to download a fresh runtime). */
const KEEP = [
  'PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT',
  'TEMP', 'TMP', 'SystemDrive', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
  'USERNAME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
  'APPDATA', 'LOCALAPPDATA', 'PUBLIC', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432', 'ALLUSERSPROFILE',
  'PYTHONIOENCODING', 'PYTHONHOME', 'PYTHONPATH',
];
function runEnv() {
  const env = {};
  for (const k of KEEP) if (process.env[k]) env[k] = process.env[k];
  env.PYTHONDONTWRITEBYTECODE = '1';
  return env;
}

let pyCache = null;
async function resolvePython() {
  if (pyCache !== null) return pyCache;
  for (const cand of [process.env.PYTHON_BIN, 'python', 'python3'].filter(Boolean)) {
    try {
      await runFile(cand, ['--version'], { timeout: 6000, env: runEnv(), windowsHide: true });
      pyCache = cand;
      return pyCache;
    } catch { /* try next */ }
  }
  pyCache = false;
  return pyCache;
}

function tail(err) {
  const out = `${err?.stderr || ''}${err?.stdout || ''}${err?.message || ''}`.trim();
  return out.split(/\r?\n/).filter(Boolean).slice(-8).join('\n').slice(0, 1200);
}

const PYTHON_FAILURE = /Traceback|AssertionError|SyntaxError|NameError|IndentationError|ModuleNotFoundError|ZeroDivisionError/i;
const DOCKER_INFRA = /unable to find image|no such file or directory|cannot connect to the docker|error during connect|image with reference/i;

export async function runCode(code, filename = 'task.py') {
  const runId = crypto.randomUUID().slice(0, 8);
  const ws = path.join(root, 'sandbox', runId);
  await fs.mkdir(ws, { recursive: true });
  const file = path.join(ws, filename);
  await fs.writeFile(file, code);
  const t0 = Date.now();
  const asserts = (code.match(/\bassert\b/g) || []).length;
  const image = DEFAULT_IMAGE();

  function finish({ ok, stdout = '', stderr = '', exitCode = 0, timedOut = false, mode, note = '' }) {
    const ms = Date.now() - t0;
    const status = timedOut ? 'timeout' : ok ? 'pass' : 'fail';
    const tests = asserts ? (status === 'pass' ? `${asserts}/${asserts}` : `failed (${asserts} asserted)`) : 'no asserts';
    const lastLine = String(stderr).trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] || '';
    return {
      runId, filename, status, exitCode, ms,
      stdout: String(stdout).slice(0, 8000),
      stderr: String(stderr).slice(0, 8000),
      assertions: asserts, tests,
      executedIn: mode === 'docker' ? `docker (${image}, --network none)` : `local python${note ? ` — ${note}` : ''}`,
      isolation: mode === 'docker'
        ? `docker ${SANDBOX_FLAGS.join(' ')} · image ${image}`
        : 'isolated temp workspace + 20s timeout + scrubbed env. Start Docker Desktop for full --network none container isolation.',
      networkPolicy: mode === 'docker'
        ? 'DENY_ALL enforced: --network none (container)'
        : 'not network-isolated: local fallback runs with host networking — no outbound claim. Start Docker Desktop for --network none.',
      workspace: `storage/sandbox/${runId}`,
      summary: ok ? String(stdout).trim().split(/\r?\n/).slice(-1)[0] || 'ok' : lastLine,
    };
  }

  async function runLocal(note) {
    const py = await resolvePython();
    if (!py) {
      return finish({
        ok: false, stdout: '', stderr: 'No Python interpreter found. Install Python or set PYTHON_BIN in .env.',
        exitCode: 127, mode: 'local', note: 'no interpreter',
      });
    }
    try {
      const r = await runFile(py, ['-I', '-B', file], {
        cwd: ws, timeout: RUN_TIMEOUT_MS, env: runEnv(), windowsHide: true, maxBuffer: 1024 * 512,
      });
      return finish({ ok: true, stdout: r.stdout, stderr: r.stderr, exitCode: 0, mode: 'local', note });
    } catch (err) {
      const timedOut = err.killed || err.signal === 'SIGTERM' || /timed out|TIMEDOUT/i.test(err.message);
      return finish({
        ok: false, stdout: err.stdout || '', stderr: tail(err),
        exitCode: timedOut ? 124 : (typeof err.code === 'number' ? err.code : 1),
        timedOut, mode: 'local', note,
      });
    }
  }

  if (!(await dockerReady())) return runLocal('Docker engine not running');

  const args = ['run', ...SANDBOX_FLAGS,
    '-v', `${ws}:/workspace`, '-w', '/workspace',
    '-e', 'PYTHONDONTWRITEBYTECODE=1',
    image, 'timeout', '20', 'python', '-I', `/workspace/${filename}`];

  try {
    const r = await runFile('docker', args, { timeout: RUN_TIMEOUT_MS + 8000, windowsHide: true, maxBuffer: 1024 * 512 });
    return finish({ ok: true, stdout: r.stdout, stderr: r.stderr, exitCode: 0, mode: 'docker' });
  } catch (err) {
    const detail = tail(err);
    const timedOut = err.killed || /timed out|TIMEDOUT/i.test(err.message);
    if (PYTHON_FAILURE.test(detail) || (timedOut && !DOCKER_INFRA.test(detail))) {
      // The container ran the code and the code itself failed — a real result.
      return finish({
        ok: false, stdout: err.stdout || '', stderr: detail,
        exitCode: timedOut ? 124 : (typeof err.code === 'number' ? err.code : 1),
        timedOut, mode: 'docker',
      });
    }
    // Image missing offline or engine hiccup — fall back, with the reason recorded.
    return runLocal(detail ? `Docker unavailable: ${detail.split('\n')[0]}` : 'Docker unavailable');
  }
}

/* Probe outbound connectivity from inside a --network none container when
   Docker is up; otherwise the gateway records the denial itself. No
   outbound attempt is ever made outside that container. */
export async function probeInContainer(target) {
  if (!(await dockerReady())) return { ran: false, ok: false, detail: 'docker engine not running' };
  const image = DEFAULT_IMAGE();
  try {
    const r = await runFile('docker', ['run', ...SANDBOX_FLAGS, image, 'timeout', '10', 'python', '-I', '-c',
      `import urllib.request\ntry:\n urllib.request.urlopen(${JSON.stringify('https://' + target)},timeout=5)\n print("REACHED")\nexcept Exception as e:\n print("BLOCKED:",type(e).__name__,e)`],
      { timeout: 15000, windowsHide: true });
    const reached = /REACHED/.test(r.stdout || '');
    return { ran: true, ok: reached, detail: reached ? 'container reached the target — investigate isolation' : (r.stdout || '').trim() || 'blocked inside container (network none)' };
  } catch (err) {
    return { ran: true, ok: false, detail: tail(err) || 'blocked inside container (network none)' };
  }
}
