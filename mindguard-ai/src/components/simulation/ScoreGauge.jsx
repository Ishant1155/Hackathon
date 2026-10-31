import { LEVEL_META } from '../../utils/constants.js';

/** Semicircular gauge for the 0–100 illustrative score, with threshold ticks. */
export default function ScoreGauge({ score, level, thresholds }) {
  const meta = LEVEL_META[level] ?? LEVEL_META.low;
  const value = Math.max(0, Math.min(100, score));
  const arc = 'M 20 110 A 90 90 0 0 1 200 110';

  const tick = (pct) => {
    const angle = Math.PI * (1 - pct / 100);
    return {
      x1: 110 + 99 * Math.cos(angle),
      y1: 110 - 99 * Math.sin(angle),
      x2: 110 + 107 * Math.cos(angle),
      y2: 110 - 107 * Math.sin(angle),
    };
  };

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 220 124" className="w-full" role="img" aria-label={`Illustrative score ${value} out of 100, ${meta.label} level`}>
        <path d={arc} fill="none" stroke="#E8D8C6" strokeWidth="14" strokeLinecap="round" pathLength="100" />
        <path
          d={arc}
          fill="none"
          stroke={meta.color}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value} 100`}
          style={{ transition: 'stroke-dasharray 400ms cubic-bezier(0.22,1,0.36,1), stroke 300ms ease-out' }}
        />
        {[thresholds.moderate, thresholds.elevated].map((t) => (
          <line key={t} {...tick(t)} stroke="#895737" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center" aria-hidden="true">
        <p className="metric text-[60px] leading-none">{value}</p>
        <p className="mt-1 text-[13px] font-medium text-brown">out of 100</p>
      </div>
    </div>
  );
}
