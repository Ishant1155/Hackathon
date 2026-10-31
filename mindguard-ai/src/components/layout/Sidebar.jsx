import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, FlaskConical, X } from 'lucide-react';
import Logo from '../brand/Logo.jsx';
import Avatar from '../ui/Avatar.jsx';
import { NAV_ITEMS } from '../../utils/constants.js';

function SidebarContent({ onNavigate, onClose }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <Link to="/" onClick={onNavigate} aria-label="Sisyphus homepage" className="rounded-full">
          <Logo size={38} />
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} className="icon-btn icon-btn-sm lg:hidden" aria-label="Close navigation">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Dashboard" className="mt-5 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition-[background-color,color] duration-200 ${
                    isActive ? 'bg-caramel/15 text-espresso' : 'text-brown hover:bg-white/60 hover:text-espresso'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-espresso' : 'text-brown group-hover:text-espresso'}`}
                      strokeWidth={isActive ? 2.25 : 1.9}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-caramel" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 p-3">
        <div className="rounded-2xl border border-honey/50 bg-honey/15 px-3.5 py-3">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-espresso uppercase">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Demo · Simulated data
          </p>
          <p className="mt-1 text-xs leading-snug text-brown">All people are fictional. Scores and forecasts are estimates.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
          <Avatar name="Jordan Ellis" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-espresso">Jordan Ellis</p>
            <p className="truncate text-xs text-brown">People &amp; Culture · Demo</p>
          </div>
          <Link to="/" onClick={onNavigate} className="icon-btn icon-btn-sm" aria-label="Back to homepage" title="Back to homepage">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Transparent floating sidebar on large screens; slide-in drawer below 1024 px.
 */
export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      <aside className="no-print fixed inset-y-3 left-3 z-30 hidden w-[248px] rounded-[26px] border border-beige/80 bg-soft/55 shadow-[0_10px_40px_-24px_rgba(94,48,35,0.35)] backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      <div className={`no-print fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-espresso/20 backdrop-blur-[3px] transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          inert={mobileOpen ? undefined : ''}
          className={`absolute inset-y-3 left-3 w-[280px] max-w-[calc(100vw-1.5rem)] rounded-[26px] border border-beige bg-soft/90 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
          }`}
        >
          <SidebarContent onNavigate={onClose} onClose={onClose} />
        </aside>
      </div>
    </>
  );
}
