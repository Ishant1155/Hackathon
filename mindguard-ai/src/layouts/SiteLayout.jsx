import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNav from '../components/site/SiteNav.jsx';
import SiteFooter from '../components/site/SiteFooter.jsx';

/** Public marketing layout: Apple-style top navigation and footer. */
export default function SiteLayout() {
  const { hash, pathname } = useLocation();

  // React Router does not scroll to hashes on its own.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return undefined;
    }
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 40);
    return () => clearTimeout(timer);
  }, [hash, pathname]);

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
