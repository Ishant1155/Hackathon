import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import SearchOverlay from './SearchOverlay.jsx';

const SearchContext = createContext({ open: () => {}, close: () => {}, isOpen: false });

/**
 * Owns the global search overlay. Any SearchButton can open it, and
 * Ctrl/⌘ + K or "/" open it from anywhere.
 */
export function SearchProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocus = useRef(null);

  const open = useCallback(() => {
    returnFocus.current = document.activeElement;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    const el = returnFocus.current;
    if (el && typeof el.focus === 'function') requestAnimationFrame(() => el.focus());
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) close();
        else open();
      } else if (e.key === '/' && !typing && !isOpen) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, open, close]);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {isOpen && <SearchOverlay onClose={close} />}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
