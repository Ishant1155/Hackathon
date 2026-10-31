import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from '../ui/ChartTooltip.jsx';
import { activeDot, axisProps, gridProps, legendProps, lineCursor } from '../../utils/chartTheme.js';
import { COLORS } from '../../utils/constants.js';
import { fmt, formatDate } from '../../utils/format.js';

/**
 * Recent actual hours followed by the 7-day forecast with its 80%
 * interval. Weekdays only by default: weekend expectations are shown
 * separately (DailyForecast) because they are per-person averages that
 * include people who do not work.
 *
 * Accepts either organisation rows (`predictedHours`) or employee rows (`hours`).
 */
export function buildForecastSeries(history = [], days = [], { weekdaysOnly = true } = {}) {
  const hist = history.filter((d) => !weekdaysOnly || !d.isWeekend);
  const fc = days.filter((d) => !weekdaysOnly || !d.isWeekend);
  const rows = hist.map((d) => ({ date: d.date, label: formatDate(d.date, { weekday: 'short' }), actual: d.hours }));
  if (rows.length && fc.length) {
    const last = rows[rows.length - 1];
    last.predicted = last.actual; // connect the two lines
    last.band = [last.actual, last.actual];
  }
  fc.forEach((d) => {
    const predicted = d.predictedHours ?? d.hours;
    rows.push({
      date: d.date,
      label: formatDate(d.date, { weekday: 'short' }),
      predicted,
      band: d.lower != null && d.upper != null ? [d.lower, d.upper] : undefined,
      isForecast: true,
    });
  });
  return rows;
}

export default function ForecastChart({ history, days, height = 320, compact = false, reference = 8, showLegend = !compact }) {
  const data = buildForecastSeries(history, days);
  const firstForecast = data.find((d) => d.isForecast)?.label;
  const values = data.flatMap((d) => [d.actual, d.predicted, ...(d.band ?? [])]).filter((v) => v != null);
  const min = Math.floor(Math.min(reference, ...values) - 0.5);
  const max = Math.ceil(Math.max(reference, ...values) + 0.5);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: compact ? 4 : 12, left: compact ? -28 : -14, bottom: 0 }}>
          <defs>
            <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.caramel} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COLORS.caramel} stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval={compact ? 'preserveStartEnd' : 0} tick={{ ...axisProps.tick, fontSize: compact ? 11 : 12 }} />
          <YAxis {...axisProps} domain={[min, max]} tickFormatter={(v) => `${v}h`} hide={compact} />
          <Tooltip
            cursor={lineCursor}
            content={
              <ChartTooltip
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  return row ? `${formatDate(row.date, { weekday: 'long' })}${row.isForecast ? ' · forecast' : ''}` : '';
                }}
                formatter={(v) => (Array.isArray(v) ? `${fmt(v[0], 1)}–${fmt(v[1], 1)} h` : `${fmt(v, 1)} h`)}
              />
            }
          />
          {showLegend && <Legend {...legendProps} />}
          <ReferenceLine y={reference} stroke={COLORS.beige} strokeWidth={1.5} strokeDasharray="4 4" />
          {firstForecast && (
            <ReferenceLine
              x={firstForecast}
              stroke={COLORS.brown}
              strokeOpacity={0.35}
              strokeDasharray="3 3"
              label={compact ? undefined : { value: 'Forecast', position: 'insideTopRight', fill: COLORS.brown, fontSize: 12, fontWeight: 600 }}
            />
          )}
          <Area type="monotone" dataKey="band" name="80% range" stroke="none" fill="url(#fc-band)" activeDot={false} legendType="square" animationDuration={900} />
          <Line type="monotone" dataKey="actual" name="Recorded hours" stroke={COLORS.espresso} strokeWidth={2.5} dot={false} activeDot={activeDot} animationDuration={900} />
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted hours"
            stroke={COLORS.caramel}
            strokeWidth={3}
            strokeDasharray="6 5"
            dot={{ r: compact ? 2.5 : 3.5, fill: COLORS.caramel, strokeWidth: 0 }}
            activeDot={activeDot}
            animationDuration={1100}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
