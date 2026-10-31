import InfoTooltip from './InfoTooltip.jsx';
import TrendDelta from './TrendDelta.jsx';

const ACCENTS = {
  caramel: 'bg-caramel/15 text-espresso',
  sage: 'bg-sage/20 text-espresso',
  honey: 'bg-honey/25 text-espresso',
  brown: 'bg-beige text-espresso',
  // legacy names
  teal: 'bg-caramel/15 text-espresso',
  blue: 'bg-beige text-espresso',
  amber: 'bg-honey/25 text-espresso',
  slate: 'bg-beige text-espresso',
};

/** KPI card with a large metric, optional tooltip and change indicator. */
export default function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'caramel',
  delta,
  deltaSuffix = '%',
  deltaDigits = 1,
  deltaLabel = 'vs previous period',
  goodDirection = 'down',
  hint,
  footer,
}) {
  return (
    <div className="card card-interactive flex flex-col justify-between gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1">
          <p className="text-[15px] font-semibold text-brown">{label}</p>
          {hint && <InfoTooltip text={hint} label={`About ${label}`} />}
        </div>
        {Icon && (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ACCENTS[accent] ?? ACCENTS.caramel}`}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
      <div>
        <p className="metric text-[44px] leading-none">
          {value}
          {unit && <span className="ml-1.5 text-lg font-semibold tracking-normal text-brown">{unit}</span>}
        </p>
        <div className="mt-3 min-h-6">
          {delta !== undefined ? (
            <TrendDelta value={delta} suffix={deltaSuffix} digits={deltaDigits} goodDirection={goodDirection} label={deltaLabel} />
          ) : (
            footer
          )}
        </div>
      </div>
    </div>
  );
}
