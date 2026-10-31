import { Link } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, CalendarClock, Clock, FlaskConical, Gauge, HeartHandshake, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ChartCard from '../components/ui/ChartCard.jsx';
import ChartTooltip from '../components/ui/ChartTooltip.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import DisclaimerBanner from '../components/ui/DisclaimerBanner.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import InsightCard from '../components/insights/InsightCard.jsx';
import IndicatorDonut from '../components/charts/IndicatorDonut.jsx';
import DepartmentHoursChart from '../components/charts/DepartmentHoursChart.jsx';
import ForecastChart from '../components/forecast/ForecastChart.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getForecast, getOverview } from '../services/api.js';
import { activeDot, axisProps, gridProps, legendProps, lineCursor } from '../utils/chartTheme.js';
import { COLORS } from '../utils/constants.js';
import { fmt, formatDate, pctChange, pluralise } from '../utils/format.js';

function WeeklyHoursChart({ data }) {
  const firstCurrent = data.find((d) => d.period === 'current')?.label;
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.caramel} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COLORS.caramel} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} domain={[7, 12]} tickFormatter={(v) => `${v}h`} />
          <Tooltip
            cursor={lineCursor}
            content={
              <ChartTooltip
                labelFormatter={(_, payload) => `Week ending ${formatDate(payload?.[0]?.payload.weekEnding, { year: 'numeric' })}`}
                formatter={(v) => `${fmt(v, 2)} h/day`}
              />
            }
          />
          <Legend {...legendProps} />
          {firstCurrent && (
            <ReferenceLine
              x={firstCurrent}
              stroke={COLORS.brown}
              strokeOpacity={0.35}
              strokeDasharray="3 3"
              label={{ value: 'Current period', position: 'insideTopRight', fill: COLORS.brown, fontSize: 12, fontWeight: 600 }}
            />
          )}
          <ReferenceLine y={8} stroke={COLORS.brown} strokeOpacity={0.35} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="avgHours" name="All employees" stroke={COLORS.caramel} strokeWidth={3} fill="url(#hoursFill)" activeDot={activeDot} animationDuration={900} />
          <Line
            type="monotone"
            dataKey="elevatedGroupHours"
            name="Employees with elevated indicators"
            stroke={COLORS.espresso}
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={activeDot}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CheckInList({ people }) {
  if (!people.length) {
    return <EmptyState icon={HeartHandshake} title="No check-ins suggested" message="Every pattern is close to the reference schedule this period." />;
  }
  return (
    <ul className="-mx-2 divide-y divide-beige">
      {people.map((p) => (
        <li key={p.id}>
          <Link to={`/employees/${p.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-soft">
            <Avatar name={p.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-espresso">{p.name}</p>
              <p className="truncate text-[13px] text-brown">
                {p.department} · {p.reasons.join(', ').toLowerCase()}
              </p>
            </div>
            <RiskBadge level={p.indicator.level} score={p.indicator.score} size="sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ForecastTeaser() {
  const { data, loading, error, reload } = useApi((opts) => getForecast(opts), []);
  return (
    <section className="card overflow-hidden" aria-labelledby="teaser-heading">
      <div className="grid lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col justify-between gap-6 bg-soft p-7">
          <div>
            <p className="eyebrow inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> 7-Day Forecast
            </p>
            <h2 id="teaser-heading" className="mt-2 text-[28px] font-bold leading-tight tracking-tight">
              {data ? `${fmt(data.summary.predictedAvgHours, 1)} h a day expected next week.` : 'Next week, forecast.'}
            </h2>
            {data && (
              <div className="mt-4 space-y-2 text-[15px] text-brown">
                <TrendDelta value={pctChange(data.summary.predictedAvgHours, data.summary.recentAvgHours)} goodDirection="down" label="vs the last two weeks" />
                <p>
                  {fmt(data.summary.predictedOvertime, 0)} h of overtime and {pluralise(data.summary.above10h, 'person', 'people')} forecast at 10 h or more.
                </p>
              </div>
            )}
          </div>
          <Link to="/forecast" className="btn-secondary self-start">
            Open forecast <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="p-5 sm:p-7">
          {loading && !data && <LoadingState variant="block" className="h-[220px]" label="Loading forecast…" />}
          {error && <ErrorState error={error} onRetry={reload} className="border-0 shadow-none" />}
          {data && <ForecastChart history={data.history} days={data.days} height={240} />}
        </div>
      </div>
    </section>
  );
}

export default function Overview() {
  useDocumentTitle('Overview');
  const { data, meta, loading, error, reload } = useApi((opts) => getOverview(opts), []);
  const moderateAt = meta?.thresholds?.moderate ?? 30;
  const elevatedAt = meta?.thresholds?.elevated ?? 55;

  return (
    <>
      <PageHeader
        eyebrow="October 2026 · Simulated organisation"
        title="Wellbeing overview"
        description="Here is how work patterns are changing across the organisation compared with the September baseline."
        actions={
          <>
            <Link to="/reports" className="btn-secondary">
              View report
            </Link>
            <Link to="/simulation" className="btn-primary">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Simulation Lab
            </Link>
          </>
        }
      />

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className="space-y-6">
          <section aria-label="Key indicators" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total employees"
              value={data.kpis.totalEmployees}
              icon={Users}
              accent="brown"
              footer={<span className="text-[13px] text-brown">Across {data.kpis.departments} departments</span>}
            />
            <StatCard
              label="Elevated indicators"
              value={data.kpis.elevated.current}
              icon={Activity}
              accent="honey"
              delta={data.kpis.elevated.current - data.kpis.elevated.previous}
              deltaSuffix=""
              deltaDigits={0}
              deltaLabel={`vs ${data.kpis.elevated.previous} in Sep`}
              hint={`Employees whose illustrative indicator score is ${elevatedAt} or above. A prompt for a supportive conversation, not a diagnosis.`}
            />
            <StatCard
              label="Avg working hours"
              value={fmt(data.kpis.avgWorkingHours.current, 1)}
              unit="h / day"
              icon={Clock}
              accent="caramel"
              delta={data.kpis.avgWorkingHours.changePct}
              goodDirection="down"
              deltaLabel={`vs ${fmt(data.kpis.avgWorkingHours.previous, 1)} h`}
              hint="Mean weekday working hours per employee for Oct 1–30, compared with Sep 1–30."
            />
            <StatCard
              label="Avg productivity"
              value={fmt(data.kpis.avgProductivity.current, 1)}
              unit="/ 100"
              icon={Gauge}
              accent="sage"
              delta={data.kpis.avgProductivity.changePct}
              goodDirection="up"
              deltaLabel={`vs ${fmt(data.kpis.avgProductivity.previous, 1)}`}
              hint="Simulated task-output score. Shown to give context to working hours, not to rate individuals."
            />
          </section>

          <ForecastTeaser />

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Weekly working hours"
              subtitle="Average weekday hours per employee, last 8 weeks"
              hint="Each point averages the weekdays in the 7 days ending on that date. The dashed horizontal line is the illustrative 8 h reference."
            >
              <WeeklyHoursChart data={data.weeklyHours} />
            </ChartCard>
            <ChartCard title="Indicator distribution" subtitle="Employees by illustrative level" hint={`Demo thresholds: Low below ${moderateAt}, Moderate ${moderateAt}–${elevatedAt - 1}, Elevated ${elevatedAt} and above. Not clinically validated.`}>
              <IndicatorDonut distribution={data.distribution} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Department workload"
              subtitle="Average weekday hours, current period vs baseline"
              footer="Hover a department to see headcount and how many people have elevated indicators."
            >
              <DepartmentHoursChart departments={data.departments} />
            </ChartCard>
            <ChartCard
              title="May benefit from a check-in"
              subtitle={pluralise(data.checkIns.length, 'person', 'people')}
              hint="People with moderate or elevated indicators. Approach with an open, supportive conversation about workload."
              action={
                <Link to="/employees?sort=score&dir=desc" className="btn-ghost btn-sm">
                  View all
                </Link>
              }
            >
              <CheckInList people={data.checkIns.slice(0, 6)} />
            </ChartCard>
          </div>

          <section aria-labelledby="recent-heading">
            <div className="mb-4 mt-4 flex items-end justify-between gap-3">
              <div>
                <h2 id="recent-heading" className="text-[28px] font-bold tracking-tight">
                  Recent insights
                </h2>
                <p className="mt-1 text-[15px] text-brown">Explainable observations from the latest period.</p>
              </div>
              <Link to="/insights" className="btn-ghost btn-sm">
                All insights <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {data.recentInsights.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {data.recentInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} variant="compact" />
                ))}
              </div>
            ) : (
              <div className="card">
                <EmptyState title="No new insights" message="Nothing has changed enough to report this period." />
              </div>
            )}
          </section>

          <DisclaimerBanner>
            Sisyphus looks at simulated work patterns such as hours, breaks and weekend activity. It does not assess health, and scores use
            illustrative thresholds. Use these insights to start supportive conversations about workload.
          </DisclaimerBanner>
        </div>
      )}
    </>
  );
}
