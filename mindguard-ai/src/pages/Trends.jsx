import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ChartCard from '../components/ui/ChartCard.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import PeriodComparisonChart from '../components/charts/PeriodComparisonChart.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getTrends } from '../services/api.js';
import { COLORS } from '../utils/constants.js';
import { fmt } from '../utils/format.js';

const RANGE_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
];

const SUMMARY_METRICS = [
  { key: 'avgHours', label: 'Weekday hours', unit: ' h', digits: 2, goodDirection: 'down' },
  { key: 'productivity', label: 'Productivity', unit: '', digits: 1, goodDirection: 'up' },
  { key: 'breaksPerDay', label: 'Breaks per day', unit: '', digits: 2, goodDirection: 'up' },
  { key: 'overtimeHours', label: 'Total overtime', unit: ' h', digits: 0, goodDirection: 'down' },
  { key: 'lateNightSessions', label: 'Late-night sessions', unit: '', digits: 0, goodDirection: 'down' },
  { key: 'weekendDays', label: 'Weekend workdays', unit: '', digits: 0, goodDirection: 'down' },
];

function SummaryGrid({ summary }) {
  return (
    <section aria-label="Period comparison summary" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {SUMMARY_METRICS.map((m) => {
        const s = summary[m.key];
        return (
          <div key={m.key} className="card p-5">
            <p className="text-[13px] font-semibold text-brown">{m.label}</p>
            <p className="metric mt-2 text-[30px] leading-none">
              {fmt(s.current, m.digits)}
              <span className="text-[15px] font-semibold tracking-normal text-brown">{m.unit}</span>
            </p>
            <p className="mt-1.5 text-[13px] tabular-nums text-brown">
              Previous {fmt(s.previous, m.digits)}
              {m.unit}
            </p>
            <TrendDelta className="mt-2" value={s.changePct} goodDirection={m.goodDirection} />
          </div>
        );
      })}
    </section>
  );
}

export default function Trends() {
  useDocumentTitle('Trends');
  const [params, setParams] = useSearchParams();
  const range = params.get('range') === '7' ? 7 : 30;
  const { data, loading, error, reload } = useApi((opts) => getTrends({ range, ...opts }), [range]);

  const setRange = (value) => {
    const next = new URLSearchParams(params);
    next.set('range', String(value));
    setParams(next, { replace: true });
  };

  const isRefreshing = loading && data;

  return (
    <>
      <PageHeader
        eyebrow="Period over period"
        title="Trends"
        description="Organisation-wide work patterns for the selected window compared with the window just before it. Weekday charts line up working day by working day."
        actions={<SegmentedControl label="Time range" options={RANGE_OPTIONS} value={range} onChange={setRange} />}
      >
        {data && (
          <p className="mt-4 text-[15px] text-brown">
            <span className="font-bold text-espresso">{data.current.display}</span> compared with{' '}
            <span className="font-bold text-espresso">{data.previous.display}</span>
          </p>
        )}
      </PageHeader>

      {loading && !data && <LoadingState label="Loading trends…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && !error && (
        <div className={`space-y-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : ''}`} aria-busy={isRefreshing || undefined}>
          <SummaryGrid summary={data.summary} />

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Working hours" subtitle="Average hours per person on each weekday" hint="Average across everyone who recorded work that day. The dashed line is the 8 h reference.">
              <PeriodComparisonChart data={data.daily} dataKey="hours" previousKey="previousHours" unit="h" digits={1} domain={[7, 10.5]} reference={8} />
            </ChartCard>
            <ChartCard title="Productivity" subtitle="Average simulated productivity score (0–100)">
              <PeriodComparisonChart data={data.daily} dataKey="productivity" previousKey="previousProductivity" color={COLORS.espresso} digits={1} domain={[65, 90]} />
            </ChartCard>
            <ChartCard title="Break frequency" subtitle="Average recorded breaks per person each weekday" hint="Breaks are recorded pauses of 10 minutes or more.">
              <PeriodComparisonChart data={data.daily} dataKey="breaks" previousKey="previousBreaks" color={COLORS.sage} digits={2} domain={[1.5, 4]} reference={3} />
            </ChartCard>
            <ChartCard title="Overtime" subtitle="Total weekday hours beyond 8 h, all employees">
              <PeriodComparisonChart data={data.daily} dataKey="overtime" previousKey="previousOvertime" type="bar" unit="h" digits={0} domain={[0, 'auto']} />
            </ChartCard>
            <ChartCard
              title="Weekend activity"
              subtitle="Employees who recorded work on each weekend day"
              hint="Weekend days are paired in order: the first weekend day of this window is compared with the first of the previous window."
            >
              <PeriodComparisonChart data={data.weekend} dataKey="activeEmployees" previousKey="previousActiveEmployees" type="bar" color={COLORS.honey} digits={0} domain={[0, 'auto']} />
            </ChartCard>
            <ChartCard title="Late-night sessions" subtitle="Sessions after 9 pm on each weekday, all employees">
              <PeriodComparisonChart data={data.daily} dataKey="lateNight" previousKey="previousLateNight" type="bar" color={COLORS.brown} digits={0} domain={[0, 'auto']} />
            </ChartCard>
          </div>

          <div className="card-soft flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-bold text-espresso">Where are these trends heading?</p>
              <p className="text-[15px] text-brown">The forecasting engine projects the same patterns seven days ahead.</p>
            </div>
            <Link to="/forecast" className="btn-primary">
              View 7-Day Forecast <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <p className="text-[13px] text-brown">All values come from simulated activity for 24 fictional employees.</p>
        </div>
      )}
    </>
  );
}
