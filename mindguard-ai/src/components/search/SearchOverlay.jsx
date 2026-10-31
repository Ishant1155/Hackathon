import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CornerDownLeft,
  FileText,
  LayoutGrid,
  Lightbulb,
  Search,
  SearchX,
  User,
  X,
} from 'lucide-react';
import { getEmployees, getForecast, getInsights } from '../../services/api.js';
import { buildSearchIndex, searchIndex, SUGGESTIONS } from '../../utils/search.js';

const CATEGORY_ICONS = {
  Page: LayoutGrid,
  Department: Building2,
  Employee: User,
  Forecast: CalendarClock,
  Insight: Lightbulb,
  Report: FileText,
};

const CLOSE_MS = 160;

// Index is cached for the session so reopening search is instant.
let cachedIndex = null;

export default function SearchOverlay({ onClose }) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(cachedIndex);
  const [status, setStatus] = useState(cachedIndex ? 'ready' : 'loading');
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const [closing, setClosing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (cachedIndex) return undefined;
    let alive = true;
    setStatus('loading');
    Promise.allSettled([getEmployees(), getInsights(), getForecast()]).then(([emp, ins, fc]) => {
      if (!alive) return;
      if (emp.status === 'rejected' && ins.status === 'rejected') {
        setError(emp.reason);
        setStatus('error');
        return;
      }
      cachedIndex = buildSearchIndex({
        employees: emp.status === 'fulfilled' ? emp.value.data : [],
        insights: ins.status === 'fulfilled' ? ins.value.data : [],
        forecast: fc.status === 'fulfilled' ? fc.value.data : null,
      });
      setIndex(cachedIndex);
      setStatus('ready');
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Pages are searchable even while data is still loading.
  const fallbackIndex = useMemo(() => buildSearchIndex({}), []);
  const groups = useMemo(() => searchIndex(index ?? fallbackIndex, query), [index, fallbackIndex, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setActive(0), [query]);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };

  const go = (to) => {
    setClosing(true);
    onClose();
    navigate(to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    } else if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter' && document.activeElement === inputRef.current && flat[active]) {
      e.preventDefault();
      go(flat[active].to);
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const focusable = dialogRef.current?.querySelectorAll('input, button, [href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  let optionIndex = -1;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="no-print fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      <div
        className={`absolute inset-0 bg-espresso/25 backdrop-blur-[6px] transition-opacity duration-150 ${closing ? 'opacity-0' : 'animate-fade'}`}
        onClick={dismiss}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Sisyphus"
        className={`relative mx-auto mt-[8vh] w-[min(680px,calc(100%-1.5rem))] overflow-hidden rounded-[24px] border border-beige bg-soft shadow-[0_30px_80px_-24px_rgba(94,48,35,0.45)] transition-[opacity,transform] duration-150 ${
          closing ? 'translate-y-[-6px] scale-[0.98] opacity-0' : 'animate-pop'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-beige px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-brown" aria-hidden="true" />
          <label htmlFor={`${listId}-input`} className="sr-only">
            Search employees, forecasts, insights and pages
          </label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={hasQuery && flat.length > 0}
            aria-controls={`${listId}-list`}
            aria-activedescendant={flat.length ? `${listId}-opt-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Sisyphus"
            className="min-w-0 flex-1 bg-transparent text-xl font-medium text-espresso placeholder:text-brown/70 focus:outline-none sm:text-2xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="rounded-full px-2.5 py-1 text-sm font-semibold text-brown hover:bg-beige hover:text-espresso"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={dismiss} aria-label="Close search" className="icon-btn icon-btn-sm">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-3 py-3">
          {!hasQuery && (
            <div className="px-3 py-2">
              <p className="label-xs mb-3">Quick links</p>
              <ul className="space-y-1">
                {SUGGESTIONS.map((s) => (
                  <li key={s.to}>
                    <button
                      type="button"
                      onClick={() => go(s.to)}
                      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[15px] font-medium text-espresso hover:bg-beige/60"
                    >
                      <ArrowRight className="h-4 w-4 text-caramel transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-brown">
                Try a name, an employee ID such as <span className="font-semibold text-espresso">MG-1013</span>, a department or a topic like “late night”.
              </p>
            </div>
          )}

          {hasQuery && status === 'error' && (
            <div className="px-3 py-6 text-center text-sm text-brown" role="alert">
              Could not load employee data ({error?.message}). Pages can still be searched.{' '}
              <button type="button" className="link" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}

          {hasQuery && flat.length > 0 && (
            <ul id={`${listId}-list`} role="listbox" aria-label="Search results">
              {groups.map((group) => {
                const Icon = CATEGORY_ICONS[group.category];
                return (
                  <li key={group.category} role="presentation" className="mb-2">
                    <p className="label-xs px-3 pb-1.5 pt-2" role="presentation">
                      {group.category === 'Page' ? 'Pages' : `${group.category}s`}
                    </p>
                    <ul role="group" aria-label={group.category}>
                      {group.items.map((item) => {
                        optionIndex += 1;
                        const i = optionIndex;
                        const selected = i === active;
                        return (
                          <li
                            key={item.id}
                            id={`${listId}-opt-${i}`}
                            role="option"
                            aria-selected={selected}
                            onMouseMove={() => setActive(i)}
                            onClick={() => go(item.to)}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${selected ? 'bg-white shadow-sm ring-1 ring-beige' : ''}`}
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-brown">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-semibold text-espresso">{item.title}</span>
                              <span className="block truncate text-[13px] text-brown">{item.description}</span>
                            </span>
                            <span className="hidden shrink-0 rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-brown sm:inline">
                              {item.category}
                            </span>
                            {selected && <CornerDownLeft className="hidden h-4 w-4 shrink-0 text-brown sm:block" aria-hidden="true" />}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}

          {hasQuery && flat.length === 0 && status !== 'error' && (
            <div className="flex flex-col items-center px-6 py-12 text-center" role="status">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream text-brown">
                <SearchX className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-lg font-semibold text-espresso">
                {status === 'loading' ? 'Searching…' : `No results for “${query.trim()}”`}
              </p>
              {status !== 'loading' && <p className="mt-1 text-sm text-brown">Check the spelling, or search for a department, an employee ID or a page.</p>}
            </div>
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-beige px-5 py-2.5 text-xs text-brown sm:flex">
          <span>
            <kbd className="rounded border border-beige bg-white px-1.5 py-0.5 font-sans">↑</kbd>{' '}
            <kbd className="rounded border border-beige bg-white px-1.5 py-0.5 font-sans">↓</kbd> to move ·{' '}
            <kbd className="rounded border border-beige bg-white px-1.5 py-0.5 font-sans">Enter</kbd> to open ·{' '}
            <kbd className="rounded border border-beige bg-white px-1.5 py-0.5 font-sans">Esc</kbd> to close
          </span>
          <span>{status === 'loading' ? 'Loading data…' : 'Simulated data'}</span>
        </div>
      </div>
    </div>
  );
}
