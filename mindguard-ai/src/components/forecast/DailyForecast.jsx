import { fmt, formatDate } from '../../utils/format.js';

/**
 * Seven day cards. Selecting a card reports its index through onSelect.
 * Accepts organisation rows (predictedHours, predictedOvertime) or
 * employee rows (hours, overtime, workProbability).
 */
export default function DailyForecast({ days, selected, onSelect, variant = 'org' }) {
  const values = days.filter((d) => !d.isWeekend).map((d) => d.predictedHours ?? d.hours);
  const max = Math.max(10, ...values);

  return (
    <div role="radiogroup" aria-label="Forecast day" className="grid grid-cols-7 gap-2 sm:gap-3">
      {days.map((d, i) => {
        const active = i === selected;
        const hours = d.predictedHours ?? d.hours;
        const overtime = d.predictedOvertime ?? d.overtime;
        const weekendText =
          variant === 'org' ? `${fmt(d.expectedWorkers, 0)} likely` : `${Math.round((d.workProbability ?? 0) * 100)}% chance`;
        return (
          <button
            key={d.date}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect?.(i)}
            aria-label={`${formatDate(d.date, { weekday: 'long' })}: ${d.isWeekend ? `weekend, ${weekendText}` : `${fmt(hours, 1)} hours predicted`}`}
            className={`group flex flex-col items-center rounded-[18px] border px-1 py-3 text-center transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:px-2 sm:py-4 ${
              active ? 'border-caramel bg-white shadow-[0_12px_28px_-16px_rgba(94,48,35,0.4)]' : 'border-beige bg-soft hover:border-caramel/50'
            }`}
          >
            <span className="text-[12px] font-bold tracking-wide text-brown uppercase">{formatDate(d.date, { weekday: 'short', month: undefined, day: undefined })}</span>
            <span className="text-[12px] text-brown">{formatDate(d.date)}</span>
            <span
              className={`mt-3 grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold tabular-nums sm:h-12 sm:w-12 ${
                d.isWeekend ? 'bg-cream text-brown' : active ? 'bg-espresso text-cream' : 'bg-white text-espresso ring-1 ring-beige'
              }`}
            >
              {d.isWeekend ? '–' : fmt(hours, 1)}
            </span>
            <span className="mt-3 hidden h-1.5 w-full max-w-14 overflow-hidden rounded-full bg-beige sm:block" aria-hidden="true">
              {!d.isWeekend && <span className="block h-full rounded-full bg-caramel" style={{ width: `${Math.min(100, (hours / max) * 100)}%` }} />}
            </span>
            <span className="mt-2 hidden text-[12px] text-brown sm:block">
              {d.isWeekend ? weekendText : `+${fmt(overtime, variant === 'org' ? 0 : 1)} h OT`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
