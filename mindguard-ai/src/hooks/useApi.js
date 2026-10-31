import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../services/api.js';

/**
 * Run an async service function and track its state.
 *
 * @param {(opts: {signal: AbortSignal}) => Promise<{data:any, meta:any}>} fetcher
 * @param {Array<any>} deps  Re-run when these change.
 * @returns {{ data:any, meta:any, loading:boolean, error:Error|null, reload:() => void }}
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (active) setState({ data: result.data, meta: result.meta, loading: false, error: null });
      })
      .catch((error) => {
        if (!active || isAbortError(error)) return;
        setState({ data: null, meta: null, loading: false, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
