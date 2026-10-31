import { fmt } from '../../utils/format.js';

/**
 * Custom Recharts tooltip.
 * `formatter(value, name, entry)` controls values; `labelFormatter(label, payload)` the heading.
 */
export default function ChartTooltip({ active, payload, label, formatter, labelFormatter, unit = '' }) {
  if (!active || !payload?.length) return null;
  const heading = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="min-w-48 rounded-2xl border border-beige bg-white/95 px-4 py-3 text-[13px] shadow-[0_16px_40px_-16px_rgba(94,48,35,0.35)] backdrop-blur">
      {heading && <p className="mb-2 font-bold text-espresso">{heading}</p>}
      <ul className="space-y-1.5">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined && !(Array.isArray(p.value) && p.value.some((v) => v == null)))
          .map((p) => (
            <li key={`${p.dataKey}-${p.name}`} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-brown">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} aria-hidden="true" />
                {p.name}
              </span>
              <span className="font-bold text-espresso tabular-nums">
                {formatter ? formatter(p.value, p.name, p) : `${fmt(p.value, Number.isInteger(p.value) ? 0 : 1)}${unit}`}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
