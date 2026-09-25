/* Render every page component against the live gateway in a DOM emulator.
   Catches runtime errors (undefined access, bad imports, failing effects)
   the same way a manual click-through would, without a browser.

   Prereq: gateway on 4000.  node scripts/render_test.mjs */

import { Window } from 'happy-dom';
import { createServer } from 'vite';

const GATEWAY = 'http://127.0.0.1:4000';
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError('[console.error]', ...a); };

// --- DOM environment -------------------------------------------------------
const win = new Window({ url: 'http://localhost:5173/' });
const g = globalThis;
const def = (k, v) => {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); }
  catch { try { g[k] = v; } catch { /* read-only global, skip */ } }
};
def('window', win);
def('document', win.document);
def('navigator', win.navigator);
def('localStorage', win.localStorage);
def('sessionStorage', win.sessionStorage);
def('location', win.location);
def('HTMLElement', win.HTMLElement);
def('Element', win.Element);
def('Node', win.Node);
def('DocumentFragment', win.DocumentFragment);
def('MutationObserver', win.MutationObserver);
def('getComputedStyle', win.getComputedStyle.bind(win));
def('requestAnimationFrame', cb => setTimeout(() => cb(Date.now()), 16));
def('cancelAnimationFrame', clearTimeout);
def('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
def('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
def('MessageChannel', win.MessageChannel);
def('IS_REACT_ACT_ENVIRONMENT', false);

// localStorage user so getUser() returns an account
win.localStorage.setItem('sovereign_user', JSON.stringify({
  username: 'engineer@demo.local', name: 'R. Shetty', role: 'Engineer', clearance: 'Internal',
}));

// route relative fetches to the live gateway
const realFetch = globalThis.fetch.bind(globalThis);
def('fetch', (url, opts) => {
  const abs = typeof url === 'string' && url.startsWith('/') ? GATEWAY + url : url;
  return realFetch(abs, opts);
});
win.fetch = globalThis.fetch;

// --- load the app through Vite so JSX + import.meta.env work ----------------
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const PAGE_PROPS = {
  Login: {},
  Overview: { setPage: () => {} },
  Agent: { setPage: () => {}, fx: fakeFx() },
  Knowledge: { setPage: () => {}, fx: fakeFx() },
  Models: { setPage: () => {}, fx: fakeFx() },
  Sandbox: { setPage: () => {}, fx: fakeFx() },
  Multimodal: { setPage: () => {}, fx: fakeFx() },
  Sovereignty: { setPage: () => {}, fx: fakeFx() },
  Audit: { setPage: () => {}, fx: fakeFx() },
  Projects: { setPage: () => {}, fx: fakeFx() },
  Evaluation: { setPage: () => {}, fx: fakeFx() },
};
function fakeFx() {
  return { toast: () => {}, busy: () => {}, pulse: () => {}, blocked: () => {}, approved: () => {} };
}

const results = [];
for (const name of Object.keys(PAGE_PROPS)) {
  const before = errors.length;
  try {
    const mod = await vite.ssrLoadModule(`/src/pages/${name}.jsx`);
    // react/react-dom are externalized in SSR (same instance the page gets)
    const { createRoot } = await import('react-dom/client');
    const React = (await import('react')).default;

    const container = win.document.createElement('div');
    win.document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(mod.default, PAGE_PROPS[name]));

    await new Promise(r => setTimeout(r, 900));   // let effects + fetches settle
    const html = container.innerHTML;
    const len = html.length;
    const pageErrors = errors.slice(before);
    root.unmount();
    container.remove();

    const ok = len > 400 && pageErrors.length === 0;
    results.push({ name, ok, htmlLen: len, errs: pageErrors.length });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} rendered ${len} chars${pageErrors.length ? ` with ${pageErrors.length} error(s)` : ''}`);
    if (pageErrors.length) pageErrors.slice(0, 3).forEach(e => console.log('      ' + e.slice(0, 300)));
  } catch (e) {
    results.push({ name, ok: false, htmlLen: 0, errs: 1 });
    console.log(`FAIL  ${name} threw: ${e.message}`);
  }
}

await vite.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pages rendered clean`);
process.exit(failed.length ? 1 : 0);
