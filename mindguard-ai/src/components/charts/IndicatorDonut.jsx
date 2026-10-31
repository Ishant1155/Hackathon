import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartTooltip from '../ui/ChartTooltip.jsx';
import { LEVEL_META } from '../../utils/constants.js';
import { fmt } from '../../utils/format.js';

/** Donut of indicator levels with a centre total and a text legend. */
export default function IndicatorDonut({ distribution, height = 220, showPrevious = true }) {
  const total = distribution.reduce((t, d) => t + d.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distribution}
              dataKey="count"
              nameKey="label"
              innerRadius="70%"
              outerRadius="94%"
              paddingAngle={3}
              cornerRadius={6}
              stroke="#FFFFFF"
              strokeWidth={2}
              animationDuration={900}
            >
              {distribution.map((d) => (
                <Cell key={d.level} fill={LEVEL_META[d.level].color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={(value) => `${value} ${value === 1 ? 'person' : 'people'} (${fmt((value / total) * 100, 0)}%)`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="metric text-[40px] leading-none">{total}</p>
            <p className="mt-1 text-[13px] font-medium text-brown">employees</p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-beige" aria-label="Indicator distribution">
        {distribution.map((d) => (
          <li key={d.level} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
            <span className="flex items-center gap-2.5 font-semibold text-espresso">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_META[d.level].color }} aria-hidden="true" />
              {d.label}
            </span>
            <span className="flex items-center gap-3 tabular-nums">
              {showPrevious && d.previousCount !== undefined && <span className="text-[13px] text-brown">was {d.previousCount}</span>}
              <span className="font-bold text-espresso">{d.count}</span>
              <span className="w-10 text-right text-[13px] text-brown">{fmt(d.percent, 0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
