import { Link, useLocation } from 'react-router-dom';
import { Database, Menu } from 'lucide-react';
import SearchButton from '../search/SearchButton.jsx';
import { LogoMark } from '../brand/Logo.jsx';
import Avatar from '../ui/Avatar.jsx';
import { useScrolled } from '../../hooks/useScrolled.js';
import { NAV_ITEMS } from '../../utils/constants.js';
import { USE_MOCK_DATA } from '../../services/api.js';

function pageMeta(pathname) {
  if (pathname.startsWith('/employees/')) return { label: 'Employee profile', description: 'Individual work patterns and forecast' };
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match ?? { label: 'Sisyphus', description: 'Workplace wellbeing analytics' };
}

export default function Topbar({ onOpenMenu }) {
  const { pathname } = useLocation();
  const page = pageMeta(pathname);
  const scrolled = useScrolled(4);

  return (
    <header
      className={`no-print sticky top-0 z-20 transition-[background-color,border-color] duration-300 ${
        scrolled ? 'border-b border-beige/80 bg-cream/80 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button type="button" className="icon-btn lg:hidden" onClick={onOpenMenu} aria-label="Open navigation">
          <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <Link to="/" className="rounded-full lg:hidden" aria-label="Sisyphus homepage">
          <LogoMark size={34} />
        </Link>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-[17px] font-bold text-espresso">{page.label}</p>
          <p className="truncate text-[13px] text-brown">{page.description}</p>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-beige bg-soft/70 px-3 py-1.5 text-[13px] font-semibold text-espresso sm:inline-flex"
            title={USE_MOCK_DATA ? 'Data is generated in the browser from simulated records' : 'Data is loaded from the configured API'}
          >
            <Database className="h-3.5 w-3.5 text-brown" aria-hidden="true" />
            {USE_MOCK_DATA ? 'Simulated data' : 'Live API'}
          </span>
          <SearchButton />
          <span className="hidden sm:block" title="Jordan Ellis · Demo user">
            <Avatar name="Jordan Ellis" size="md" />
            <span className="sr-only">Signed in as Jordan Ellis (demo user)</span>
          </span>
        </div>
      </div>
    </header>
  );
}
