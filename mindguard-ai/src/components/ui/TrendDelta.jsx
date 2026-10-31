import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatSigned } from '../../utils/format.js';

/**
 * Change indicator. `goodDirection` decides the tone: for hours an
 * increase is a concern, for productivity a decrease is. Direction is
 * shown by the arrow and sign as well as colour.
 */
export default function TrendDelta({ value, suffix = '%', digits = 1, goodDirection = 'down', label, className = '' }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const concerning = !flat && goodDirection !== 'neutral' && (goodDirection === 'down' ? up : !up);
  const tone =
    flat || goodDirection === 'neutral'
      ? 'bg-beige/60 text-brown'
      : concerning
        ? 'bg-honey/25 text-espresso'
        : 'bg-sage/20 text-espresso';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 text-[13px] ${className}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {formatSigned(value, digits)}
        {suffix}
      </span>
      {label && <span className="text-brown">{label}</span>}
    </span>
  );
}
