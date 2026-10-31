import InfoTooltip from './InfoTooltip.jsx';

/** Rounded content section with a consistent header, optional action and footer. */
export default function ChartCard({ id, title, subtitle, hint, action, footer, children, className = '', bodyClassName = '', tone = 'white' }) {
  return (
    <section id={id} className={`${tone === 'soft' ? 'card-soft' : 'card'} flex scroll-mt-24 flex-col p-6 sm:p-7 ${className}`} aria-label={title}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {hint && <InfoTooltip text={hint} label={`About ${title}`} />}
          </div>
          {subtitle && <p className="mt-1 text-[15px] text-brown">{subtitle}</p>}
        </div>
        {action && <div className="no-print shrink-0">{action}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
      {footer && <footer className="mt-5 border-t border-beige pt-4 text-[13px] leading-relaxed text-brown">{footer}</footer>}
    </section>
  );
}
