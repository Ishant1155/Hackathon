import { fmt } from '../../utils/format.js';

/** Horizontal bars: points each factor adds to the illustrative score, relative to its cap. */
export default function FactorBreakdown({ factors, showExplanation = true }) {
  return (
    <ul className="space-y-5">
      {factors.map((f) => {
        const pct = f.maxPoints ? Math.min(100, (f.points / f.maxPoints) * 100) : 0;
        const strong = pct >= 60;
        return (
          <li key={f.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-[15px] font-semibold ${f.points > 0 ? 'text-espresso' : 'text-brown'}`}>{f.label}</span>
              <span className="text-[13px] tabular-nums text-brown">
                <span className="text-[15px] font-bold text-espresso">+{fmt(f.points, f.points % 1 ? 1 : 0)}</span> / {f.maxPoints} pts
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-beige"
              role="meter"
              aria-label={`${f.label} contribution`}
              aria-valuemin={0}
              aria-valuemax={f.maxPoints}
              aria-valuenow={f.points}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${strong ? 'bg-honey' : 'bg-caramel'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {showExplanation && <p className="mt-2 text-[13px] leading-relaxed text-brown">{f.explanation}</p>}
          </li>
        );
      })}
    </ul>
  );
}
