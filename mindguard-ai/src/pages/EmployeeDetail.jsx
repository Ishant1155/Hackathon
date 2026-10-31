import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, Briefcase, CalendarClock, CalendarDays, HeartHandshake, MapPin, UserX } from 'lucide-react';
import ChartCard from '../components/ui/ChartCard.jsx';
import ChartTooltip from '../components/ui/ChartTooltip.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import DisclaimerBanner from '../components/ui/DisclaimerBanner.jsx';
import InsightCard from '../components/insights/InsightCard.jsx';
import FactorBreakdown from '../components/charts/FactorBreakdown.jsx';
import AnomalyCard from '../components/analysis/AnomalyCard.jsx';
import ForecastChart from '../components/forecast/ForecastChart.jsx';
import ForecastSummary from '../components/forecast/ForecastSummary.jsx';
import DailyForecast from '../components/forecast/DailyForecast.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useScrollToHash } from '../hooks/useScrollToHash.js';
import { getEmployeeById, getEmployeeForecast, getEmployeeHistory } from '../services/api.js';
import { activeDot, axisProps, barCursor, gridProps, legendProps, lineCursor } from '../utils/chartTheme.js';
import { COLORS, LEVEL_META } from '../utils/constants.js';
import { fmt, formatDate, formatWeekday, pctChange } from '../utils/format.js';

const COMPARISON_METRICS = [
  { key: 'avgHours', label: 'Weekday hours', unit: 'h', digits: 1, goodDirection: 'down' },
  { key: 'breaksPerDay', label: 'Breaks per day', unit: '', digits: 1, goodDirection: 'up' },
  { key: 'lateNightSessions', label: 'Late-night sessions', unit: '', digits: 0, goodDirection: 'down' },
  { key: 'weekendDays', label: 'Weekend days worked', unit: '', digits: 0, goodDirection: 'down' },
  { key: 'productivity', label: 'Productivity score', unit: '', digits: 1, goodDirection: 'up' },
  { key: 'tasksPerDay', label: 'Tasks per day', unit: '', digits: 1, goodDirection: 'up' },
];

function BaselineComparison({ current, baseline }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {COMPARISON_METRICS.map((m) => {
        const cur = current[m.key];
        const base = baseline[m.key];
        const isCount = m.digits === 0;
        return (
          <div key={m.key} className="card-soft p-4">
            <p className="text-[13px] font-semibold text-brown">{m.label}</p>
            <p className="metric mt-2 text-[28px] leading-none">
              {fmt(cur, m.digits)}
              {m.unit && <span className="ml-0.5 text-[15px] font-semibold text-brown">{m.unit}</span>}
            </p>
            <p className="mt-1.5 text-[13px] tabular-nums text-brown">
              Baseline {fmt(base, m.digits)}
              {m.unit}
            </p>
            <TrendDelta
              className="mt-2"
              value={isCount ? cur - base : pctChange(cur, base)}
              suffix={isCount ? '' : '%'}
              digits={isCount ? 0 : 1}
              goodDirection={m.goodDirection}
            />
          </div>
        );
      })}
    </div>
  );
}

function DailyHoursChart({ daily, baselineHours }) {
  return (
    <div className="h-[270px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => formatDate(d)} minTickGap={24} />
          <YAxis {...axisProps} domain={[0, 14]} tickFormatter={(v) => `${v}h`} />
          <Tooltip
            cursor={barCursor}
            content={
              <ChartTooltip
                labelFormatter={(_, payload) => {
                  const d = payload?.[0]?.payload;
                  if (!d) return '';
                  const tags = [d.isWeekend && 'weekend', d.lateNight && 'late-night session'].filter(Boolean);
                  return `${formatWeekday(d.date)}${tags.length ? ` · ${tags.join(', ')}` : ''}`;
                }}
                formatter={(v, name) => (name === 'Breaks' ? `${v}` : `${fmt(v, 1)} h`)}
              />
            }
          />
          <Legend {...legendProps} />
          <ReferenceLine
            y={baselineHours}
            stroke={COLORS.brown}
            strokeOpacity={0.5}
            strokeDasharray="4 4"
            label={{ value: `Baseline ${fmt(baselineHours, 1)} h`, position: 'insideTopLeft', fill: COLORS.brown, fontSize: 12, fontWeight: 600 }}
          />
          <Bar dataKey="hours" name="Hours worked" radius={[5, 5, 0, 0]} maxBarSize={18} fill={COLORS.caramel} animationDuration={900}>
            {daily.map((d) => (
              <Cell key={d.date} fill={d.isWeekend ? COLORS.honey : d.lateNight ? COLORS.brown : COLORS.caramel} fillOpacity={d.hours ? 1 : 0} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="breaks" name="Breaks" stroke={COLORS.sage} strokeWidth={2} dot={false} activeDot={activeDot} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-brown">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-caramel" />Weekday</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brown" />Weekday with late-night session</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-honey" />Weekend work</span>
      </p>
    </div>
  );
}

function WeeklyTrendChart({ weekly }) {
  const firstCurrent = weekly.find((w) => w.period === 'current')?.label;
  return (
    <div className="h-[270px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weekly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis yAxisId="hours" {...axisProps} domain={[6, 13]} tickFormatter={(v) => `${v}h`} />
          <YAxis yAxisId="breaks" orientation="right" {...axisProps} domain={[0, 6]} />
          <Tooltip
            cursor={lineCursor}
            content={
              <ChartTooltip
                labelFormatter={(label, p) => `Week ending ${label}${p?.[0]?.payload.period === 'current' ? '' : ' (baseline)'}`}
                formatter={(v, name) => (name.startsWith('Avg hours') ? `${fmt(v, 1)} h` : fmt(v, 1))}
              />
            }
          />
          <Legend {...legendProps} />
          {firstCurrent && <ReferenceLine yAxisId="hours" x={firstCurrent} stroke={COLORS.brown} strokeOpacity={0.35} strokeDasharray="3 3" />}
          <Line yAxisId="hours" type="monotone" dataKey="avgHours" name="Avg hours / day" stroke={COLORS.caramel} strokeWidth={3} dot={{ r: 3.5, fill: COLORS.caramel, strokeWidth: 0 }} activeDot={activeDot} />
          <Line yAxisId="breaks" type="monotone" dataKey="breaksPerDay" name="Breaks / day" stroke={COLORS.sage} strokeWidth={2.5} dot={{ r: 3.5, fill: COLORS.sage, strokeWidth: 0 }} activeDot={activeDot} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmployeeForecast({ id, firstName }) {
  const { data, loading, error, reload } = useApi((opts) => getEmployeeForecast(id, opts), [id]);
  const [selected, setSelected] = useState(2);
  useScrollToHash(Boolean(data));

  return (
    <section id="forecast" aria-labelledby="emp-forecast-heading" className="card scroll-mt-24 p-6 sm:p-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow inline-flex items-center gap-2">
            <CalendarClock className="h-4 w-4" aria-hidden="true" /> 7-Day Forecast
          </p>
          <h2 id="emp-forecast-heading" className="mt-1 text-2xl font-bold tracking-tight">
            {data ? `${firstName}’s next seven days` : 'Next seven days'}
          </h2>
          {data && <p className="mt-1 text-[15px] text-brown">{data.horizon.display} · based on {firstName}’s own history</p>}
        </div>
        {data && (
          <span className="rounded-full bg-cream px-3 py-1 text-[13px] font-semibold text-espresso">
            Trend: {data.summary.trend === 'rising' ? 'rising' : data.summary.trend === 'easing' ? 'easing' : 'steady'}
          </span>
        )}
      </div>
      {loading && !data && <LoadingState variant="block" className="h-[360px]" label="Loading forecast…" />}
      {error && <ErrorState error={error} onRetry={reload} className="border-0 shadow-none" />}
      {data && (
        <div className="space-y-6">
          <ForecastSummary summary={data.summary} variant="employee" />
          <ForecastChart history={data.history} days={data.days} height={280} />
          <DailyForecast days={data.days} selected={selected} onSelect={setSelected} variant="employee" />
          <p className="text-[13px] text-brown">{data.model.disclaimer}</p>
        </div>
      )}
    </section>
  );
}

const CHECK_IN_TIPS = [
  'Open with curiosity: ask how the last few weeks have felt, rather than presenting the numbers.',
  'Talk about workload and priorities together, and agree what could be paused, shared or rescheduled.',
  'Mention support that is already available, such as flexible hours or wellbeing resources.',
  'Agree a follow-up and let the person decide what they want to share.',
];

export default function EmployeeDetail() {
  const { id } = useParams();
  const employee = useApi((opts) => getEmployeeById(id, opts), [id]);
  const history = useApi((opts) => getEmployeeHistory(id, opts), [id]);
  useDocumentTitle(employee.data?.name ?? 'Employee profile');

  const backLink = (
    <Link to="/employees" className="btn-ghost no-print -ml-3 mb-4">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Employees
    </Link>
  );

  if (employee.loading) {
    return (
      <>
        {backLink}
        <LoadingState label="Loading employee profile…" />
      </>
    );
  }

  if (employee.error) {
    const notFound = employee.error.status === 404;
    return (
      <>
        {backLink}
        {notFound ? (
          <div className="card">
            <EmptyState
              icon={UserX}
              title="Employee not found"
              message={`There is no simulated employee with the ID “${id}”.`}
              action={
                <Link to="/employees" className="btn-secondary">
                  Browse the directory
                </Link>
              }
            />
          </div>
        ) : (
          <ErrorState error={employee.error} onRetry={employee.reload} />
        )}
      </>
    );
  }

  const emp = employee.data;
  const firstName = emp.name.split(' ')[0];
  const hasScore = emp.indicator.score !== null && emp.indicator.score !== undefined;
  const scoreChange = hasScore && emp.indicator.previousScore != null ? emp.indicator.score - emp.indicator.previousScore : null;
  const levelMeta = LEVEL_META[emp.indicator.level];

  return (
    <>
      {backLink}

      <section className="card mb-6 overflow-hidden">
        <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <Avatar name={emp.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em] sm:text-[44px]">{emp.name}</h1>
                <RiskBadge level={emp.indicator.level} />
              </div>
              <p className="mt-1 text-[13px] font-semibold text-brown">{emp.id} · simulated profile</p>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-brown">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Role</dt>
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  <dd>
                    {emp.designation}, {emp.department}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Work location</dt>
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <dd>{emp.location}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Start date</dt>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <dd>Joined {formatDate(emp.startDate, { year: 'numeric' })}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex items-center gap-6 rounded-[22px] bg-soft px-6 py-5">
            <div>
              <p className="label-xs">Illustrative indicator</p>
              <p className="metric mt-1 text-[52px] leading-none">
                {hasScore ? emp.indicator.score : '–'}
                <span className="ml-1 text-lg font-semibold tracking-normal text-brown">/ 100</span>
              </p>
            </div>
            <div className="border-l border-beige pl-6 text-[15px]">
              <p className="text-brown">
                Baseline <span className="font-bold text-espresso tabular-nums">{emp.indicator.previousScore ?? '–'}</span>
              </p>
              <TrendDelta value={scoreChange} suffix=" pts" digits={0} goodDirection="down" className="mt-1.5" />
              <p className="mt-2 max-w-[13rem] text-[13px] text-brown">{levelMeta.description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <ChartCard title="Baseline comparison" subtitle={`Oct 1–30 compared with ${firstName}’s own Sep 1–30 baseline`}>
          <BaselineComparison current={emp.metrics} baseline={emp.baseline} />
        </ChartCard>

        {/* Only the FastAPI backend returns `anomaly` (Isolation Forest output). */}
        {emp.anomaly && <AnomalyCard employeeId={emp.id} anomaly={emp.anomaly} />}

        <EmployeeForecast id={emp.id} firstName={firstName} />

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard title="Daily activity" subtitle="Hours and breaks for each day of the current period" hint="Bars show recorded hours. The dashed line is the person's September weekday average.">
            {history.loading && <LoadingState variant="block" className="h-[270px]" />}
            {history.error && <ErrorState error={history.error} onRetry={history.reload} className="border-0 shadow-none" />}
            {history.data && <DailyHoursChart daily={history.data.daily} baselineHours={history.data.baseline.avgHours} />}
          </ChartCard>
          <ChartCard title="Weekly trend" subtitle="Eight weeks, including four baseline weeks" hint="The dashed vertical line marks the start of the current period.">
            {history.loading && <LoadingState variant="block" className="h-[270px]" />}
            {history.error && <ErrorState error={history.error} onRetry={history.reload} className="border-0 shadow-none" />}
            {history.data && <WeeklyTrendChart weekly={history.data.weekly} />}
          </ChartCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <ChartCard className="lg:col-span-2" title="What shapes the indicator" subtitle="Points each factor adds (illustrative weights)" footer={emp.disclaimer}>
            <FactorBreakdown factors={emp.factors} />
          </ChartCard>

          <div className="space-y-6 lg:col-span-3">
            <section aria-labelledby="employee-insights-heading">
              <h2 id="employee-insights-heading" className="mb-4 text-2xl font-bold tracking-tight">
                Explanatory insights
              </h2>
              {emp.insights.length ? (
                <div className="grid gap-5">
                  {emp.insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} showEmployee={false} />
                  ))}
                </div>
              ) : (
                <div className="card">
                  <EmptyState icon={HeartHandshake} title="No notable changes" message={`${firstName}'s work pattern this period is close to their own baseline.`} />
                </div>
              )}
            </section>

            {emp.indicator.level !== 'low' && (
              <ChartCard title="Preparing a supportive check-in" subtitle="General suggestions, not a script" tone="soft">
                <ul className="space-y-3 text-[15px] text-espresso">
                  {CHECK_IN_TIPS.map((tip) => (
                    <li key={tip} className="flex gap-3">
                      <HeartHandshake className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brown" aria-hidden="true" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </ChartCard>
            )}
          </div>
        </div>

        <DisclaimerBanner>
          This profile describes simulated work patterns for a fictional person. It is not a health, performance or medical assessment, and the
          indicator thresholds are illustrative.
        </DisclaimerBanner>
      </div>
    </>
  );
}
