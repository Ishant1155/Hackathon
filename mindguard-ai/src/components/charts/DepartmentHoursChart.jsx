import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from '../ui/ChartTooltip.jsx';
import { axisProps, barCursor, gridProps, legendProps } from '../../utils/chartTheme.js';
import { COLORS } from '../../utils/constants.js';
import { fmt } from '../../utils/format.js';

/** Grouped bars: average weekday hours per department, current vs baseline. */
export default function DepartmentHoursChart({ departments, height = 300 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={departments} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4} barCategoryGap="26%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="department" {...axisProps} interval={0} />
          <YAxis {...axisProps} domain={[6, 'dataMax + 0.5']} tickFormatter={(v) => `${fmt(v, 0)}h`} allowDecimals={false} />
          <Tooltip
            cursor={barCursor}
            content={
              <ChartTooltip
                formatter={(value) => `${fmt(value, 2)} h/day`}
                labelFormatter={(label, payload) => {
                  const d = payload?.[0]?.payload;
                  return d ? `${label} · ${d.headcount} people · ${d.elevated} elevated` : label;
                }}
              />
            }
          />
          <Legend {...legendProps} />
          <ReferenceLine y={8} stroke={COLORS.brown} strokeOpacity={0.4} strokeDasharray="4 4" label={{ value: '8 h reference', position: 'insideTopRight', fill: COLORS.brown, fontSize: 12 }} />
          <Bar dataKey="previousAvgHours" name="Baseline (Sep)" fill={COLORS.beige} radius={[8, 8, 0, 0]} maxBarSize={30} animationDuration={900} />
          <Bar dataKey="avgHours" name="Current (Oct)" fill={COLORS.caramel} radius={[8, 8, 0, 0]} maxBarSize={30} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
