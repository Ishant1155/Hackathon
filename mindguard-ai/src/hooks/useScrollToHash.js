import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to the element named in the URL hash once `ready` is true.
 * Used by pages whose sections render after data loads.
 */
export function useScrollToHash(ready = true) {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return undefined;
    const id = decodeURIComponent(hash.slice(1));
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(timer);
  }, [ready, hash, pathname]);
}
