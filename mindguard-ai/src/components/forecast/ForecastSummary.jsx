import { CalendarDays, Clock, Coffee, Timer } from 'lucide-react';
import TrendDelta from '../ui/TrendDelta.jsx';
import { fmt, pctChange } from '../../utils/format.js';

/**
 * Four headline predictions. Works with the organisation summary
 * (GET /analytics/forecast) and, via `variant="employee"`, with an
 * employee summary (GET /employees/{id}/forecast).
 */
export default function ForecastSummary({ summary, variant = 'org', className = '' }) {
  const org = variant === 'org';
  const tiles = [
    {
      key: 'hours',
      icon: Clock,
      label: 'Predicted hours',
      value: fmt(summary.predictedAvgHours, 1),
      unit: 'h / day',
      delta: pctChange(summary.predictedAvgHours, summary.recentAvgHours),
      deltaLabel: `vs ${fmt(summary.recentAvgHours, 1)} h recently`,
      good: 'down',
    },
    {
      key: 'overtime',
      icon: Timer,
      label: 'Predicted overtime',
      value: fmt(summary.predictedOvertime, 0),
      unit: org ? 'h total' : 'h',
      delta: org ? summary.overtimeChangePct : undefined,
      deltaLabel: org ? `vs ${fmt(summary.recentOvertime, 0)} h last 7 days` : undefined,
      note: org ? undefined : 'Over the next 7 days',
      good: 'down',
    },
    {
      key: 'breaks',
      icon: Coffee,
      label: 'Predicted breaks',
      value: fmt(summary.predictedBreaks, 1),
      unit: 'per day',
      delta: org ? pctChange(summary.predictedBreaks, summary.recentBreaks) : undefined,
      deltaLabel: org ? `vs ${fmt(summary.recentBreaks, 1)} recently` : undefined,
      note: org ? undefined : 'Recorded pauses of 10 min or more',
      good: 'up',
    },
    {
      key: 'weekend',
      icon: CalendarDays,
      label: 'Expected weekend work',
      value: fmt(org ? summary.expectedWeekendWorkers : summary.expectedWeekendDays, 1),
      unit: org ? 'person-days' : 'days',
      note: org ? 'Based on the last four weekends' : 'Likelihood-weighted, next weekend',
    },
  ];

  return (
    <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${className}`}>
      {tiles.map((t) => (
        <div key={t.key} className="card-soft p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-brown">
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </div>
          <p className="metric mt-3 text-[34px] leading-none">
            {t.value}
            <span className="ml-1.5 text-[15px] font-semibold tracking-normal text-brown">{t.unit}</span>
          </p>
          <div className="mt-3 min-h-6">
            {t.delta !== undefined ? (
              <TrendDelta value={t.delta} goodDirection={t.good} label={t.deltaLabel} />
            ) : (
              <p className="text-[13px] text-brown">{t.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
