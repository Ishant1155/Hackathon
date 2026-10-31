import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import { DISCLAIMER } from '../utils/constants.js';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="print-shell lg:pl-[264px]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" tabIndex={-1} className="print-shell mx-auto max-w-[1320px] px-4 pb-10 pt-4 focus:outline-none sm:px-6 lg:px-10 lg:pt-6">
          <div key={pathname} className="animate-rise">
            <Outlet />
          </div>
        </main>
        <footer className="no-print mx-auto max-w-[1320px] px-4 pb-8 text-[13px] leading-relaxed text-brown sm:px-6 lg:px-10">
          <div className="border-t border-beige pt-5">{DISCLAIMER}</div>
        </footer>
      </div>
    </div>
  );
}
