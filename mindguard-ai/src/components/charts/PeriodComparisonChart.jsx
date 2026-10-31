import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from '../ui/ChartTooltip.jsx';
import { activeDot, axisProps, barCursor, gridProps, legendProps, lineCursor } from '../../utils/chartTheme.js';
import { COLORS } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';

/**
 * Current vs previous period on the same axis. Rows need `dataKey`,
 * `previousKey`, `date` and `previousDate` (for the tooltip).
 */
export default function PeriodComparisonChart({
  data,
  dataKey,
  previousKey,
  type = 'line',
  color = COLORS.caramel,
  unit = '',
  digits = 1,
  domain = ['auto', 'auto'],
  height = 260,
  xKey = 'label',
  reference,
}) {
  const format = (v) => `${Number(v).toFixed(digits)}${unit}`;
  const tooltip = (
    <ChartTooltip
      formatter={format}
      labelFormatter={(_, payload) => {
        const row = payload?.[0]?.payload;
        if (!row) return '';
        return row.previousDate ? `${formatDate(row.date)} vs ${formatDate(row.previousDate)}` : formatDate(row.date);
      }}
    />
  );
  const common = { data, margin: { top: 8, right: 8, left: -12, bottom: 0 } };
  // Keyed array: Recharts reads its direct children.
  const axes = [
    <CartesianGrid key="grid" {...gridProps} />,
    <XAxis key="x" dataKey={xKey} {...axisProps} minTickGap={18} />,
    <YAxis key="y" {...axisProps} domain={domain} tickFormatter={(v) => `${v}${unit}`} allowDecimals={digits > 0} />,
    <Legend key="legend" {...legendProps} />,
    reference !== undefined ? <ReferenceLine key="ref" y={reference} stroke={COLORS.brown} strokeOpacity={0.4} strokeDasharray="4 4" /> : null,
  ];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart {...common} barGap={3} barCategoryGap="22%">
            {axes}
            <Tooltip cursor={barCursor} content={tooltip} />
            <Bar dataKey={previousKey} name="Previous period" fill={COLORS.beige} radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={900} />
            <Bar dataKey={dataKey} name="Current period" fill={color} radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={900} />
          </BarChart>
        ) : (
          <LineChart {...common}>
            {axes}
            <Tooltip cursor={lineCursor} content={tooltip} />
            <Line type="monotone" dataKey={previousKey} name="Previous period" stroke="#C9AE94" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={activeDot} animationDuration={900} />
            <Line
              type="monotone"
              dataKey={dataKey}
              name="Current period"
              stroke={color}
              strokeWidth={3}
              dot={data.length <= 7 ? { r: 3.5, fill: color, strokeWidth: 0 } : false}
              activeDot={activeDot}
              animationDuration={900}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
