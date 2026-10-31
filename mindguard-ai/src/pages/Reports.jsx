import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Printer } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ChartCard from '../components/ui/ChartCard.jsx';
import ChartTooltip from '../components/ui/ChartTooltip.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import TrendDelta from '../components/ui/TrendDelta.jsx';
import IndicatorDonut from '../components/charts/IndicatorDonut.jsx';
import { LogoMark } from '../components/brand/Logo.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useScrollToHash } from '../hooks/useScrollToHash.js';
import { getReportSummary } from '../services/api.js';
import { axisProps, barCursor, gridProps, legendProps } from '../utils/chartTheme.js';
import { DISCLAIMER, INSIGHT_TYPES, LEVEL_META } from '../utils/constants.js';
import { fmt, formatDate, formatSigned, pctChange } from '../utils/format.js';

const TREND_ROWS = [
  { key: 'avgHours', label: 'Average weekday hours', digits: 2, unit: ' h', goodDirection: 'down' },
  { key: 'breaksPerDay', label: 'Breaks per weekday', digits: 2, unit: '', goodDirection: 'up' },
  { key: 'productivity', label: 'Average productivity score', digits: 1, unit: '', goodDirection: 'up' },
  { key: 'overtimeHours', label: 'Total overtime hours', digits: 0, unit: ' h', goodDirection: 'down' },
  { key: 'lateNightSessions', label: 'Late-night sessions', digits: 0, unit: '', goodDirection: 'down' },
  { key: 'weekendDays', label: 'Weekend workdays (person-days)', digits: 0, unit: '', goodDirection: 'down' },
];

function buildSummary({ overview, trends, insights }) {
  const { kpis, departments } = overview;
  const busiest = [...departments].sort((a, b) => b.avgHours - a.avgHours)[0];
  const calmest = [...departments].sort((a, b) => a.avgScore - b.avgScore)[0];
  const checkIns = insights.filter((i) => i.severity === 'elevated').length;
  const positive = insights.filter((i) => i.severity === 'positive').length;
  return [
    `Average weekday hours rose from ${fmt(kpis.avgWorkingHours.previous, 2)} h to ${fmt(kpis.avgWorkingHours.current, 2)} h (${formatSigned(kpis.avgWorkingHours.changePct)}%).`,
    `${kpis.elevated.current} of ${kpis.totalEmployees} employees have an elevated indicator, up from ${kpis.elevated.previous} in the baseline period. A further ${kpis.moderate.current} are at a moderate level.`,
    `${busiest.department} has the longest average day (${fmt(busiest.avgHours, 1)} h). ${calmest.department} has the lowest average indicator score (${calmest.avgScore}).`,
    `Weekend workdays went from ${trends.summary.weekendDays.previous} to ${trends.summary.weekendDays.current}, and late-night sessions from ${trends.summary.lateNightSessions.previous} to ${trends.summary.lateNightSessions.current}.`,
    `${insights.length} observations were generated: ${checkIns} suggest a supportive check-in and ${positive} show a pattern moving back toward balance.`,
  ];
}

const TH = 'px-3 py-3 text-right text-[12px] font-bold tracking-[0.06em] text-brown uppercase';

function DepartmentTable({ departments }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-[15px]">
        <caption className="sr-only">Department summary for the current period</caption>
        <thead>
          <tr className="border-b border-beige">
            <th scope="col" className={`${TH} pl-0! text-left`}>Department</th>
            <th scope="col" className={TH}>People</th>
            <th scope="col" className={TH}>Avg hours</th>
            <th scope="col" className={TH}>vs baseline</th>
            <th scope="col" className={TH}>Overtime / wk</th>
            <th scope="col" className={TH}>Breaks / day</th>
            <th scope="col" className={TH}>Late nights</th>
            <th scope="col" className={TH}>Weekend days</th>
            <th scope="col" className={TH}>Avg score</th>
            <th scope="col" className={`${TH} pr-0!`}>Low / Mod / Elev</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {departments.map((d) => (
            <tr key={d.department} className="border-b border-beige/70">
              <th scope="row" className="py-3.5 pr-3 text-left font-bold text-espresso">{d.department}</th>
              <td className="px-3 py-3.5 text-right text-brown">{d.headcount}</td>
              <td className="px-3 py-3.5 text-right font-bold text-espresso">{fmt(d.avgHours, 2)} h</td>
              <td className="px-3 py-3.5 text-right">
                <TrendDelta value={pctChange(d.avgHours, d.previousAvgHours)} goodDirection="down" />
              </td>
              <td className="px-3 py-3.5 text-right text-espresso">{fmt(d.overtimePerWeek, 1)} h</td>
              <td className="px-3 py-3.5 text-right text-espresso">{fmt(d.breaksPerDay, 1)}</td>
              <td className="px-3 py-3.5 text-right text-espresso">{d.lateNightSessions}</td>
              <td className="px-3 py-3.5 text-right text-espresso">{d.weekendDays}</td>
              <td className="px-3 py-3.5 text-right font-bold text-espresso">
                {d.avgScore} <span className="text-[13px] font-normal text-brown">(was {d.previousAvgScore})</span>
              </td>
              <td className="py-3.5 pl-3 text-right text-espresso">
                {d.low} / {d.moderate} / <span className={d.elevated ? 'rounded-full bg-honey/25 px-1.5 font-bold' : ''}>{d.elevated}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepartmentLevelChart({ departments }) {
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={departments} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="department" {...axisProps} interval={0} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip cursor={barCursor} content={<ChartTooltip formatter={(v) => `${v} ${v === 1 ? 'person' : 'people'}`} />} />
          <Legend {...legendProps} />
          <Bar dataKey="low" name="Low" stackId="lvl" fill={LEVEL_META.low.color} maxBarSize={38} />
          <Bar dataKey="moderate" name="Moderate" stackId="lvl" fill={LEVEL_META.moderate.color} maxBarSize={38} />
          <Bar dataKey="elevated" name="Elevated" stackId="lvl" fill={LEVEL_META.elevated.color} radius={[8, 8, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Reports() {
  useDocumentTitle('Reports');
  const { data, meta, loading, error, reload } = useApi((opts) => getReportSummary(opts), []);
  useScrollToHash(Boolean(data));

  const typeCounts = data
    ? Object.entries(INSIGHT_TYPES).map(([key, t]) => ({ key, label: t.label, count: data.insights.filter((i) => i.type === key).length }))
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Department summaries"
        title="Reports"
        description="A printable summary for leadership and People teams. Print it, or choose “Save as PDF” in your browser’s print dialog."
        actions={
          <button type="button" className="btn-primary" onClick={() => window.print()} disabled={!data}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </button>
        }
      />

      {loading && <LoadingState label="Preparing report…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <article className="print-area space-y-6" aria-labelledby="report-title">
          <header className="card flex flex-col gap-6 p-7 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <LogoMark size={52} />
              <div>
                <p className="label-xs">Sisyphus report</p>
                <h2 id="report-title" className="mt-1 text-[30px] font-bold leading-tight tracking-tight">
                  Workplace Wellbeing Pattern Report
                </h2>
                <p className="mt-1.5 text-[15px] text-brown">
                  {meta?.organisation} · {data.trends.current.display} compared with {data.trends.previous.display}
                </p>
              </div>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1.5 text-[14px] sm:text-right">
              <dt className="text-brown">Generated</dt>
              <dd className="font-semibold text-espresso">{formatDate(meta?.generatedAt?.slice(0, 10), { year: 'numeric' })}</dd>
              <dt className="text-brown">Data</dt>
              <dd className="font-bold text-espresso">Simulated</dd>
              <dt className="text-brown">Employees</dt>
              <dd className="font-semibold text-espresso">{data.overview.kpis.totalEmployees}</dd>
            </dl>
          </header>

          <ChartCard id="report-summary" title="Executive summary" subtitle="Key changes this period">
            <ul className="space-y-3 text-[16px] leading-relaxed text-espresso">
              {buildSummary(data).map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-caramel" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard
            id="report-departments"
            title="Department summary"
            subtitle="Current period averages per department"
            footer="Overtime counts weekday hours beyond 8 h plus all weekend hours. Scores are illustrative."
          >
            <DepartmentTable departments={data.overview.departments} />
          </ChartCard>

          <div id="report-distribution" className="grid scroll-mt-24 gap-6 lg:grid-cols-3">
            <ChartCard title="Indicator distribution" subtitle="All employees, current period">
              <IndicatorDonut distribution={data.overview.distribution} height={190} />
            </ChartCard>
            <ChartCard className="lg:col-span-2" title="Indicator levels by department" subtitle="Number of people at each level">
              <DepartmentLevelChart departments={data.overview.departments} />
            </ChartCard>
          </div>

          <div id="report-trends" className="print-break grid scroll-mt-24 gap-6 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="Trend summary" subtitle={`${data.trends.current.display} vs ${data.trends.previous.display}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[15px]">
                  <caption className="sr-only">Trend summary</caption>
                  <thead>
                    <tr className="border-b border-beige">
                      <th scope="col" className={`${TH} pl-0! text-left`}>Metric</th>
                      <th scope="col" className={TH}>Previous</th>
                      <th scope="col" className={TH}>Current</th>
                      <th scope="col" className={`${TH} pr-0!`}>Change</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {TREND_ROWS.map((row) => {
                      const s = data.trends.summary[row.key];
                      return (
                        <tr key={row.key} className="border-b border-beige/70">
                          <th scope="row" className="py-3.5 pr-3 text-left font-bold text-espresso">{row.label}</th>
                          <td className="px-3 py-3.5 text-right text-brown">
                            {fmt(s.previous, row.digits)}
                            {row.unit}
                          </td>
                          <td className="px-3 py-3.5 text-right font-bold text-espresso">
                            {fmt(s.current, row.digits)}
                            {row.unit}
                          </td>
                          <td className="py-3.5 pl-3 text-right">
                            <TrendDelta value={s.changePct} goodDirection={row.goodDirection} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
            <ChartCard title="Observations by type" subtitle={`${data.insights.length} in total`}>
              <ul className="divide-y divide-beige text-[15px]">
                {typeCounts.map((t) => (
                  <li key={t.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-espresso">{t.label}</span>
                    <span className="font-bold tabular-nums text-espresso">{t.count}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>

          <ChartCard title="Method and limitations" tone="soft">
            <div className="grid gap-5 text-[15px] leading-relaxed text-brown md:grid-cols-2">
              <p>
                All employees and activity in this report are fictional and generated for a hackathon demonstration. The current period (Oct 1–30,
                2026) is compared with each person’s own baseline (Sep 1–30, 2026).
              </p>
              <p>
                The behavioural indicator combines working hours, breaks, late-night sessions, weekend work and productivity change with illustrative
                weights. Thresholds (Low below {meta?.thresholds?.moderate ?? 30}, Elevated from {meta?.thresholds?.elevated ?? 55}) are not clinically
                or scientifically validated.
              </p>
              <p>{DISCLAIMER} It should not be used for performance management or disciplinary decisions.</p>
              <p>
                Recommended use: share aggregate trends with teams, and use individual insights only to start voluntary, supportive conversations
                about workload.
              </p>
            </div>
          </ChartCard>
        </article>
      )}
    </>
  );
}
