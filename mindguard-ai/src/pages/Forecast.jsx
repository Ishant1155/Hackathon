import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown, Cpu, Lightbulb } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ChartCard from '../components/ui/ChartCard.jsx';
import ChartTooltip from '../components/ui/ChartTooltip.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import DisclaimerBanner from '../components/ui/DisclaimerBanner.jsx';
import ForecastChart from '../components/forecast/ForecastChart.jsx';
import ForecastSummary from '../components/forecast/ForecastSummary.jsx';
import DailyForecast from '../components/forecast/DailyForecast.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getForecast } from '../services/api.js';
import { axisProps, barCursor, gridProps, legendProps } from '../utils/chartTheme.js';
import { COLORS, DEPARTMENTS, SEVERITY_META } from '../utils/constants.js';
import { fmt, formatDate } from '../utils/format.js';

const TREND_LABEL = { rising: 'Rising', easing: 'Easing', steady: 'Steady' };

function DayDetail({ day }) {
  const rows = day.isWeekend
    ? [
        { label: 'People likely to work', value: fmt(day.expectedWorkers, 1) },
        { label: 'Expected hours per person', value: `${fmt(day.predictedHours, 1)} h` },
        { label: 'Weekend hours (all counted as overtime)', value: `${fmt(day.predictedOvertime, 0)} h` },
      ]
    : [
        { label: 'Predicted hours per person', value: `${fmt(day.predictedHours, 2)} h` },
        { label: '80% range', value: `${fmt(day.lower, 1)}–${fmt(day.upper, 1)} h` },
        { label: 'Predicted overtime (all employees)', value: `${fmt(day.predictedOvertime, 0)} h` },
        { label: 'Predicted breaks per person', value: fmt(day.predictedBreaks, 1) },
        { label: 'Expected late-night sessions', value: fmt(day.expectedLateNights, 1) },
      ];
  return (
    <div className="card-soft p-6" aria-live="polite">
      <p className="label-xs">{day.isWeekend ? 'Weekend day' : 'Weekday'}</p>
      <p className="mt-1 text-2xl font-bold text-espresso">{formatDate(day.date, { weekday: 'long', year: 'numeric' })}</p>
      <dl className="mt-5 divide-y divide-beige">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-[15px] text-brown">{r.label}</dt>
            <dd className="text-[17px] font-bold tabular-nums text-espresso">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DepartmentForecastChart({ departments, highlight }) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={departments} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4} barCategoryGap="26%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="department" {...axisProps} interval={0} />
          <YAxis {...axisProps} domain={[7, 'dataMax + 0.5']} tickFormatter={(v) => `${fmt(v, 0)}h`} allowDecimals={false} />
          <Tooltip cursor={barCursor} content={<ChartTooltip formatter={(v) => `${fmt(v, 2)} h/day`} />} />
          <Legend {...legendProps} />
          <ReferenceLine y={8} stroke={COLORS.brown} strokeOpacity={0.4} strokeDasharray="4 4" />
          <Bar dataKey="recentAvgHours" name="Last two weeks" fill={COLORS.beige} radius={[8, 8, 0, 0]} maxBarSize={30} />
          <Bar
            dataKey="predictedAvgHours"
            name="Next 7 days"
            fill={COLORS.caramel}
            radius={[8, 8, 0, 0]}
            maxBarSize={30}
            shape={(props) => {
              const dim = highlight && props.payload.department !== highlight;
              return <rect x={props.x} y={props.y} width={props.width} height={props.height} rx={8} fill={COLORS.caramel} fillOpacity={dim ? 0.35 : 1} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Forecast() {
  useDocumentTitle('7-Day Forecast');
  const { data, loading, error, reload } = useApi((opts) => getForecast(opts), []);
  const [params, setParams] = useSearchParams();
  const dept = DEPARTMENTS.includes(params.get('dept')) ? params.get('dept') : '';
  const [selected, setSelected] = useState(2);

  const people = useMemo(() => (data?.employees ?? []).filter((p) => !dept || p.department === dept), [data, dept]);

  const setDept = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('dept', value);
    else next.delete('dept');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="AI Forecasting"
        title="The next seven days."
        description="Predicted hours, overtime and breaks for every person, built from their own recent history. Use it to spot pressure points early and rebalance work before it becomes the norm."
      >
        {data && (
          <p className="mt-4 text-[15px] text-brown">
            Forecast for <span className="font-bold text-espresso">{data.horizon.display}</span>, based on activity up to {formatDate(data.historyRange.end, { year: 'numeric' })}.
          </p>
        )}
      </PageHeader>

      {loading && !data && <LoadingState label="Running forecast…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className="space-y-6">
          <ForecastSummary summary={data.summary} />

          <ChartCard
            title="Predicted weekday hours"
            subtitle="Average per person: the last two weeks recorded, then the forecast with its 80% range"
            hint="The shaded band shows where 80% of outcomes are expected to fall. It widens further into the future because uncertainty grows."
          >
            <ForecastChart history={data.history} days={data.days} height={340} />
          </ChartCard>

          <section aria-labelledby="daily-heading" className="card p-6 sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="daily-heading" className="text-xl font-bold tracking-tight">
                  Day by day
                </h2>
                <p className="mt-1 text-[15px] text-brown">Select a day to see its full prediction.</p>
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <DailyForecast days={data.days} selected={selected} onSelect={setSelected} />
              <DayDetail day={data.days[selected]} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <ChartCard className="lg:col-span-3" title="Department forecast" subtitle="Predicted weekday hours per person, next 7 days vs the last two weeks">
              <DepartmentForecastChart departments={data.departments} highlight={dept} />
            </ChartCard>
            <ChartCard className="lg:col-span-2" title="What the model expects" subtitle="Plain-language insights generated from the forecast">
              <ul className="space-y-3">
                {data.insights.map((ins) => (
                  <li key={ins.id} className="flex gap-3 rounded-2xl bg-soft p-4">
                    <Lightbulb className="mt-0.5 h-[18px] w-[18px] shrink-0 text-caramel" aria-hidden="true" />
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${SEVERITY_META[ins.tone].className}`}>
                        {SEVERITY_META[ins.tone].label}
                      </span>
                      <p className="mt-1.5 text-[15px] font-bold leading-snug text-espresso">{ins.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-brown">{ins.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>

          <section aria-labelledby="people-heading" className="card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-beige p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <div>
                <h2 id="people-heading" className="text-xl font-bold tracking-tight">
                  Individual forecasts
                </h2>
                <p className="mt-1 text-[15px] text-brown">Sorted by predicted overtime. Select a person for their full forecast.</p>
              </div>
              <div className="relative">
                <label htmlFor="forecast-dept" className="sr-only">
                  Filter by department
                </label>
                <select id="forecast-dept" value={dept} onChange={(e) => setDept(e.target.value)} className="input cursor-pointer appearance-none rounded-full pr-10 font-semibold sm:w-52">
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown" aria-hidden="true" />
              </div>
            </div>
            {people.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[15px]">
                  <caption className="sr-only">Individual 7-day forecasts</caption>
                  <thead>
                    <tr className="text-left text-[12px] font-bold tracking-[0.06em] text-brown uppercase">
                      <th scope="col" className="px-6 py-3.5">Employee</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Recent</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Predicted</th>
                      <th scope="col" className="px-4 py-3.5">Trend</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Overtime</th>
                      <th scope="col" className="px-6 py-3.5 text-right">Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id} className="border-t border-beige/70 transition-colors hover:bg-soft">
                        <td className="px-6 py-3.5">
                          <Link to={`/employees/${p.id}#forecast`} className="flex items-center gap-3">
                            <Avatar name={p.name} size="sm" />
                            <span>
                              <span className="block font-bold text-espresso decoration-caramel decoration-2 underline-offset-4 hover:underline">{p.name}</span>
                              <span className="block text-[13px] text-brown">{p.department}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-brown">{fmt(p.recentAvgHours, 1)} h</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-espresso">{fmt(p.predictedAvgHours, 1)} h</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-2">
                            <TrendDelta value={p.change} suffix=" h" digits={2} goodDirection="down" />
                            <span className="text-[13px] font-semibold text-brown">{TREND_LABEL[p.trend]}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-espresso">{fmt(p.predictedOvertime, 1)} h</td>
                        <td className="px-6 py-3.5 text-right">
                          <RiskBadge level={p.indicator.level} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No employees in this department" action={<button type="button" className="btn-secondary" onClick={() => setDept('')}>Show all</button>} />
            )}
          </section>

          <ChartCard title="About the model" tone="soft">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-espresso ring-1 ring-beige">
                  <Cpu className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-espresso">{data.model.name}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-brown">{data.model.method}</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-espresso">Back-tested accuracy</p>
                <p className="mt-1 text-[14px] leading-relaxed text-brown">
                  Across {data.model.backtest.origins} rolling tests ({data.model.backtest.samples} weekday predictions) the average error was{' '}
                  <span className="font-bold text-espresso">±{fmt(data.model.backtest.maeHours, 2)} h</span> per day, compared with ±
                  {fmt(data.model.backtest.naiveMaeHours, 2)} h for a simple 10-day average.
                </p>
              </div>
              <div>
                <p className="font-bold text-espresso">Settings</p>
                <p className="mt-1 text-[14px] leading-relaxed text-brown">
                  α = {data.model.params.alpha}, β = {data.model.params.beta}, φ = {data.model.params.phi}. Interval: {Math.round(data.model.interval * 100)}%. Horizon:{' '}
                  {data.model.horizonDays} days.
                </p>
              </div>
            </div>
          </ChartCard>

          <DisclaimerBanner title="Estimates, not assessments">{data.model.disclaimer}</DisclaimerBanner>
        </div>
      )}
    </>
  );
}
