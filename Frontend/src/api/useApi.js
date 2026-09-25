import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './client';

/* Small data hook: fetch on mount, optional polling, manual reload. */
export function useApi(path, { poll = 0, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!path && enabled);
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!path || !enabled) return;
    let timer;
    const tick = async () => {
      try {
        const d = await api(path);
        if (alive.current) { setData(d); setError(null); setLoading(false); }
      } catch (e) {
        if (alive.current) { setError(e); setLoading(false); }
      }
      if (poll && alive.current) timer = setTimeout(tick, poll);
    };
    setLoading(true);
    tick();
    return () => { clearTimeout(timer); };
  }, [path, poll, enabled, nonce]);

  return { data, error, loading, reload, setData };
}
