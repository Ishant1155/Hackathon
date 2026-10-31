import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, HeartHandshake } from 'lucide-react';
import { INSIGHT_TYPES, SEVERITY_META } from '../../utils/constants.js';
import { fmt, formatSigned } from '../../utils/format.js';

function MetricComparison({ metric }) {
  const digits = Number.isInteger(metric.current) && Number.isInteger(metric.previous) ? 0 : 1;
  const unit = metric.unit ? ` ${metric.unit}` : '';
  const cells = [
    { label: 'Baseline', value: `${fmt(metric.previous, digits)}${unit}` },
    { label: 'Current', value: `${fmt(metric.current, digits)}${unit}`, strong: true },
    { label: 'Change', value: `${formatSigned(metric.change, digits)}${unit}` },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-beige rounded-2xl bg-soft py-3 text-center">
      {cells.map((c) => (
        <div key={c.label}>
          <p className="text-[12px] font-semibold text-brown">{c.label}</p>
          <p className={`mt-0.5 tabular-nums ${c.strong ? 'text-lg font-bold text-espresso' : 'text-[15px] font-semibold text-espresso'}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Explainable observation.
 *  variant="full"     what changed, comparison period, why it matters, suggestion
 *  variant="compact"  title, employee and one-line summary
 */
export default function InsightCard({ insight, variant = 'full', showEmployee = true }) {
  const type = INSIGHT_TYPES[insight.type] ?? INSIGHT_TYPES.hours;
  const severity = SEVERITY_META[insight.severity] ?? SEVERITY_META.moderate;
  const Icon = type.icon;

  if (variant === 'compact') {
    return (
      <Link to={`/employees/${insight.employeeId}`} className="card card-interactive group flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className={`grid h-10 w-10 place-items-center rounded-full ring-1 ring-inset ${severity.className}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${severity.className}`}>{severity.label}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-snug text-espresso">{insight.title}</p>
          <p className="mt-0.5 text-[13px] font-medium text-brown">
            {insight.employeeName} · {insight.department}
          </p>
          <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-brown">{insight.whatChanged}</p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-[14px] font-semibold text-espresso">
          View profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  return (
    <article className="card flex flex-col p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-inset ${severity.className}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-snug">{insight.title}</h3>
            {showEmployee && (
              <p className="truncate text-[14px] text-brown">
                <Link to={`/employees/${insight.employeeId}`} className="font-semibold text-espresso decoration-caramel decoration-2 underline-offset-4 hover:underline">
                  {insight.employeeName}
                </Link>{' '}
                · {insight.designation}, {insight.department}
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ${severity.className}`}>{severity.label}</span>
      </header>

      <div className="mt-5 space-y-5 text-[15px]">
        <div>
          <p className="label-xs mb-1.5">What changed</p>
          <p className="leading-relaxed text-espresso">{insight.whatChanged}</p>
        </div>

        <MetricComparison metric={insight.metric} />

        <p className="flex items-center gap-2 text-[13px] text-brown">
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
          {insight.comparison.current.display} compared with {insight.comparison.previous.display}
        </p>

        <div>
          <p className="label-xs mb-1.5">{insight.severity === 'positive' ? 'Why it is useful' : 'Why a check-in may help'}</p>
          <p className="leading-relaxed text-brown">{insight.whyItMatters}</p>
        </div>

        <div className="flex gap-3 rounded-2xl bg-sage/15 px-4 py-3.5 text-espresso">
          <HeartHandshake className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{insight.suggestion}</p>
        </div>
      </div>
    </article>
  );
}
