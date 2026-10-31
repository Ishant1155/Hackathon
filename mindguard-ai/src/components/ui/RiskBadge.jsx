import { LEVEL_META } from '../../utils/constants.js';

/** Indicator level pill: dot, label and optional score, never colour alone. */
export default function RiskBadge({ level, score, size = 'md', className = '' }) {
  const meta = LEVEL_META[level] ?? LEVEL_META.low;
  const sizing = size === 'sm' ? 'px-2.5 py-0.5 text-[12px]' : 'px-3 py-1 text-[13px]';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${meta.badge} ${sizing} ${className}`}
      title={`${meta.label} behavioural indicator (illustrative)`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
      {score !== undefined && score !== null && <span className="tabular-nums font-medium">· {score}</span>}
    </span>
  );
}
