import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../brand/Logo.jsx';
import SearchButton from '../search/SearchButton.jsx';
import { useScrolled } from '../../hooks/useScrolled.js';
import { SITE_NAV } from '../../utils/constants.js';

/** Tracks which homepage section is currently in view. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = SITE_NAV.map((s) => s.id);

export default function SiteNav() {
  const scrolled = useScrolled(12);
  const active = useActiveSection(SECTION_IDS);
  const [open, setOpen] = useState(false);
  const { hash } = useLocation();

  useEffect(() => setOpen(false), [hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={`no-print sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? 'border-b border-beige bg-cream/85 backdrop-blur-xl' : 'border-b border-transparent bg-cream'
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="Sisyphus home" className="rounded-full">
          <Logo size={38} />
        </Link>

        <nav aria-label="Main" className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-1 rounded-full border border-beige bg-soft/70 p-1">
            {SITE_NAV.map((item) => {
              const current = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={current ? 'true' : undefined}
                    className={`block rounded-full px-4 py-2 text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                      current ? 'bg-white text-espresso shadow-sm' : 'text-brown hover:text-espresso'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
          <SearchButton />
          <Link to="/dashboard" className="btn-primary hidden sm:inline-flex">
            Explore Dashboard
          </Link>
          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-[18px] w-[18px]" aria-hidden="true" /> : <Menu className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="site-mobile-menu"
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        inert={open ? undefined : ''}
      >
        <nav aria-label="Main (mobile)" className="min-h-0">
          <ul className="mx-auto max-w-[1240px] space-y-1 px-5 pb-6 pt-2 sm:px-8">
            {SITE_NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-3 py-3 text-2xl font-bold tracking-tight text-espresso hover:bg-soft"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="pt-3">
              <Link to="/dashboard" className="btn-primary w-full">
                Explore Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
