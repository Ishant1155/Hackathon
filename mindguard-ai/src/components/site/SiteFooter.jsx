import { Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import { DISCLAIMER, NAV_ITEMS, SITE_NAV } from '../../utils/constants.js';

const FEATURE_LINKS = [
  { label: '7-Day Forecast', to: '/forecast' },
  { label: 'Explainable Insights', to: '/insights' },
  { label: 'Simulation Lab', to: '/simulation' },
  { label: 'Trend Analysis', to: '/trends' },
];

export default function SiteFooter() {
  return (
    <footer className="no-print border-t border-beige bg-soft">
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={40} />
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-brown">
              Workload forecasting and supportive insights for healthier, more balanced workplaces.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="label-xs mb-3">Product</p>
            <ul className="space-y-2 text-[15px]">
              {SITE_NAV.filter((s) => s.id !== 'top').map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-brown transition-colors hover:text-espresso">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Features">
            <p className="label-xs mb-3">Features</p>
            <ul className="space-y-2 text-[15px]">
              {FEATURE_LINKS.map((f) => (
                <li key={f.to}>
                  <Link to={f.to} className="text-brown transition-colors hover:text-espresso">
                    {f.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Dashboard">
            <p className="label-xs mb-3">Dashboard</p>
            <ul className="space-y-2 text-[15px]">
              {NAV_ITEMS.filter((n) => ['/dashboard', '/employees', '/reports'].includes(n.to)).map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-brown transition-colors hover:text-espresso">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 border-t border-beige pt-6 text-[13px] leading-relaxed text-brown">
          <p className="max-w-3xl">{DISCLAIMER}</p>
          <p className="mt-3">© 2026 Sisyphus. A hackathon demonstration. All people and organisations shown are fictional.</p>
        </div>
      </div>
    </footer>
  );
}
