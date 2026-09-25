/* One client for the local gateway. Every request carries the acting demo
   user; in dev the Vite proxy forwards /api to 127.0.0.1:4000, so the app
   makes no external calls. Set VITE_API_BASE to point at another host on
   the internal network. */

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

let USER = null;
try { USER = JSON.parse(localStorage.getItem('sovereign_user') || 'null'); } catch { USER = null; }

export function setUser(u) {
  USER = u;
  if (u) localStorage.setItem('sovereign_user', JSON.stringify(u));
  else localStorage.removeItem('sovereign_user');
}
export function getUser() { return USER; }

function authHeaders(extra = {}) {
  const h = { ...extra };
  if (USER?.username) h['x-demo-user'] = USER.username;
  return h;
}

export async function api(path, { method = 'GET', body, form, signal, raw = false } = {}) {
  const opts = { method, headers: authHeaders(body || form ? { 'content-type': 'application/json' } : {}) , signal };
  if (body) opts.body = JSON.stringify(body);
  if (form) { delete opts.headers['content-type']; opts.body = form; }
  const resp = await fetch(BASE + path, opts);
  if (raw) {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.blob();
  }
  const ct = resp.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await resp.json() : await resp.blob();
  if (!resp.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function login({ role, username }) {
  const data = await api('/api/auth/login', { method: 'POST', body: { role, username } });
  setUser(data.user);
  return data.user;
}

export function logout() { setUser(null); }

/* Fetch a protected file as a blob and hand it to the browser's download. */
export async function download(path, filename) {
  const blob = await api(path, { raw: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || path.split('/').pop().split('?')[0] || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return blob;
}

export function post(path, body) { return api(path, { method: 'POST', body }); }
