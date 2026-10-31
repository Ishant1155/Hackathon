/**
 * In-browser mock of the future FastAPI backend.
 *
 * Each exported handler returns exactly the `data` payload the real
 * endpoint is expected to return, so switching USE_MOCK_DATA off in
 * api.js needs no changes in pages. Response shapes are documented in
 * src/services/README.md and in the JSDoc of api.js.
 *
 * This is the ONLY module allowed to import src/data/mockData.js.
 */

import {
  employees,
  activityByEmployee,
  PERIODS,
  DEPARTMENTS,
  DATA_NOTICE,
  ORGANISATION,
  CURRENT_PERIOD_START_INDEX,
} from '../data/mockData.js';
import { computeIndicatorScore, SCORE_THRESHOLDS, SIMULATION_DISCLAIMER } from '../utils/simulation.js';
import { backtest, FORECAST_MODEL, forecastEmployee } from '../utils/forecast.js';
import { mean, round, sum, summarisePeriod } from '../utils/metrics.js';
import { pctChange, formatDate, formatRange } from '../utils/format.js';

export class MockHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'MockHttpError';
    this.status = status;
  }
}

const LEVELS = ['low', 'moderate', 'elevated'];
const LEVEL_LABELS = { low: 'Low', moderate: 'Moderate', elevated: 'Elevated' };

export function buildMeta(extra = {}) {
  return {
    simulated: true,
    notice: DATA_NOTICE,
    organisation: ORGANISATION.name,
    generatedAt: PERIODS.generatedAt,
    period: { current: PERIODS.current, previous: PERIODS.previous },
    thresholds: { ...SCORE_THRESHOLDS, illustrative: true },
    ...extra,
  };
}

function compare(current, previous, digits = 1) {
  return {
    current: round(current, digits),
    previous: round(previous, digits),
    change: round(current - previous, digits),
    changePct: round(pctChange(current, previous), 1),
  };
}

/* ---------------------------------------------------------------- */
/* Insights                                                          */
/* ---------------------------------------------------------------- */

const COMPARISON = {
  current: { ...PERIODS.current, display: formatRange(PERIODS.current.start, PERIODS.current.end) },
  previous: { ...PERIODS.previous, display: formatRange(PERIODS.previous.start, PERIODS.previous.end) },
};

/**
 * Illustrative rules that turn metric changes into plain-language
 * observations. Thresholds are demo values, not validated cut-offs.
 */
function buildEmployeeInsights(emp) {
  const c = emp.metrics;
  const b = emp.baseline;
  const first = emp.name.split(' ')[0];
  const out = [];
  const severityFor = (strong) => (strong || emp.indicator.level === 'elevated' ? 'elevated' : 'moderate');

  const push = (type, payload) =>
    out.push({
      id: `${emp.id}-${type}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      designation: emp.designation,
      indicatorLevel: emp.indicator.level,
      type,
      comparison: COMPARISON,
      detectedAt: PERIODS.current.end,
      simulated: true,
      ...payload,
    });

  const hoursDelta = c.avgHours - b.avgHours;
  if (hoursDelta >= 0.75 && c.avgHours >= 8.75) {
    push('hours', {
      severity: severityFor(c.avgHours >= 10),
      title: 'Longer working days',
      metric: { label: 'Average weekday hours', unit: 'h', ...compare(c.avgHours, b.avgHours) },
      whatChanged: `${first}'s average weekday rose from ${round(b.avgHours, 1)} h to ${round(c.avgHours, 1)} h (+${round(hoursDelta, 1)} h a day).`,
      whyItMatters:
        'Long days that continue for several weeks leave less time to recover. A check-in can show whether the workload, deadlines or staffing need adjusting.',
      suggestion: 'Review current priorities together and agree what can be deferred or shared.',
    });
  }

  const breakDelta = b.breaksPerDay - c.breaksPerDay;
  if (breakDelta >= 0.75 && c.breaksPerDay < 3) {
    push('breaks', {
      severity: severityFor(c.breaksPerDay < 1.5),
      title: 'Fewer recorded breaks',
      metric: { label: 'Breaks per weekday', unit: '', ...compare(c.breaksPerDay, b.breaksPerDay) },
      whatChanged: `Recorded breaks fell from ${round(b.breaksPerDay, 1)} to ${round(c.breaksPerDay, 1)} per day.`,
      whyItMatters:
        'Regular short pauses help people sustain focus. Fewer breaks can mean meetings are back-to-back or the day is too full.',
      suggestion: 'Ask whether the calendar leaves room for pauses and whether any recurring meetings could be shortened.',
    });
  }

  if (c.lateNightSessions >= 4 && c.lateNightSessions >= b.lateNightSessions + 2) {
    push('lateNight', {
      severity: severityFor(c.lateNightSessions >= 9),
      title: 'More late-night activity',
      metric: { label: 'Sessions after 9 pm', unit: '', ...compare(c.lateNightSessions, b.lateNightSessions, 0) },
      whatChanged: `${c.lateNightSessions} work sessions after 9 pm this period, compared with ${b.lateNightSessions} in the baseline period.`,
      whyItMatters:
        'Regular late sessions can cut into rest and personal time. They sometimes reflect time-zone overlap or deadlines that could be planned differently.',
      suggestion: 'Check whether late work is expected, and whether core hours or hand-offs could be adjusted.',
    });
  }

  if (c.weekendDays >= 3 && c.weekendDays >= b.weekendDays + 2) {
    push('weekend', {
      severity: severityFor(c.weekendDays >= 4),
      title: 'Regular weekend work',
      metric: { label: 'Weekend days worked', unit: 'days', ...compare(c.weekendDays, b.weekendDays, 0) },
      whatChanged: `${first} recorded work on ${c.weekendDays} of 8 weekend days, up from ${b.weekendDays} in the baseline period.`,
      whyItMatters:
        'Weekends are usually the main recovery time. Repeated weekend work may mean weekday capacity is not enough for the current workload.',
      suggestion: 'Discuss whether weekend work is voluntary and whether the weekly plan is realistic.',
    });
  }

  const taskPct = pctChange(c.tasksPerDay, b.tasksPerDay);
  if (taskPct <= -10) {
    push('tasks', {
      severity: severityFor(taskPct <= -15 && hoursDelta > 1),
      title: 'Change in task completion',
      metric: { label: 'Tasks completed per weekday', unit: '', ...compare(c.tasksPerDay, b.tasksPerDay) },
      whatChanged: `Tasks completed per day changed by ${round(taskPct, 0)}% (${round(b.tasksPerDay, 1)} → ${round(c.tasksPerDay, 1)})${hoursDelta > 0.5 ? ' while hours went up' : ''}.`,
      whyItMatters:
        'Lower output alongside longer hours can mean tasks have grown in scope or the pace is hard to keep up. This is not a performance judgement.',
      suggestion: 'Ask about blockers and whether task estimates or scope have changed recently.',
    });
  }

  const scoreDrop = emp.indicator.previousScore - emp.indicator.score;
  if (scoreDrop >= 15) {
    push('improvement', {
      severity: 'positive',
      title: 'Pattern moving back toward balance',
      metric: { label: 'Illustrative indicator score', unit: '', ...compare(emp.indicator.score, emp.indicator.previousScore, 0) },
      whatChanged: `Hours, breaks and evening work have moved back toward the reference schedule (score ${emp.indicator.previousScore} → ${emp.indicator.score}).`,
      whyItMatters: 'Recognising positive change helps teams see which workload adjustments are working.',
      suggestion: 'Acknowledge the change and capture what helped so it can be shared with the team.',
    });
  }

  return out;
}

const SEVERITY_ORDER = { elevated: 0, moderate: 1, positive: 2 };
const ALL_INSIGHTS = employees
  .flatMap(buildEmployeeInsights)
  .sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      Math.abs(b.metric.changePct) - Math.abs(a.metric.changePct),
  );

/* ---------------------------------------------------------------- */
/* Helpers over activity                                             */
/* ---------------------------------------------------------------- */

function factorsFor(emp) {
  return computeIndicatorScore({
    avgWorkingHours: emp.metrics.avgHours,
    dailyBreaks: emp.metrics.breaksPerDay,
    lateNightSessions: emp.metrics.lateNightPerWeek,
    weekendDays: emp.metrics.weekendDaysPerWeek,
    productivityChange: emp.indicator.productivityChange,
  }).factors;
}

function findEmployee(id) {
  const emp = employees.find((e) => e.id.toLowerCase() === String(id).toLowerCase());
  if (!emp) throw new MockHttpError(404, `Employee "${id}" was not found.`);
  return emp;
}

const dayIndex = (iso) => activityByEmployee[employees[0].id].findIndex((d) => d.date === iso);

/** Org-wide aggregate for a single day index. */
function aggregateDay(index) {
  const records = employees.map((e) => activityByEmployee[e.id][index]);
  const workers = records.filter((r) => r.worked);
  const isWeekend = records[0].isWeekend;
  return {
    date: records[0].date,
    isWeekend,
    hours: round(mean(workers.map((r) => r.hours)), 2),
    productivity: isWeekend ? null : round(mean(records.map((r) => r.productivity)), 1),
    breaks: round(mean(workers.map((r) => r.breaks)), 2),
    overtime: round(sum(records.map((r) => r.overtime)), 1),
    lateNight: sum(records.map((r) => r.lateNight)),
    activeEmployees: workers.length,
    weekendHours: isWeekend ? round(sum(records.map((r) => r.hours)), 1) : 0,
  };
}

function orgSummary(startIdx, endIdx) {
  const per = employees.map((e) => summarisePeriod(activityByEmployee[e.id].slice(startIdx, endIdx)));
  return {
    avgHours: round(mean(per.map((s) => s.avgHours)), 2),
    productivity: round(mean(per.map((s) => s.productivity)), 1),
    breaksPerDay: round(mean(per.map((s) => s.breaksPerDay)), 2),
    overtimeHours: round(sum(per.map((s) => s.overtimeHours)), 1),
    lateNightSessions: sum(per.map((s) => s.lateNightSessions)),
    weekendDays: sum(per.map((s) => s.weekendDays)),
    tasksPerDay: round(mean(per.map((s) => s.tasksPerDay)), 2),
  };
}

function compareSummaries(cur, prev) {
  return Object.fromEntries(Object.keys(cur).map((k) => [k, compare(cur[k], prev[k], 2)]));
}

/* ---------------------------------------------------------------- */
/* Endpoint handlers                                                 */
/* ---------------------------------------------------------------- */

/** GET /employees */
export function listEmployees() {
  return employees.map((e) => ({ ...e }));
}

/** GET /employees/{id} */
export function getEmployee(id) {
  const emp = findEmployee(id);
  return {
    ...emp,
    factors: factorsFor(emp),
    insights: ALL_INSIGHTS.filter((i) => i.employeeId === emp.id),
    disclaimer: SIMULATION_DISCLAIMER,
  };
}

/** GET /employees/{id}/history */
export function getEmployeeHistory(id) {
  const emp = findEmployee(id);
  const activity = activityByEmployee[emp.id];
  const current = activity.slice(CURRENT_PERIOD_START_INDEX);
  const previous = activity.slice(0, CURRENT_PERIOD_START_INDEX);

  // Weekly buckets over the full 60 days, newest last. Weeks end on the last data day.
  const weekly = [];
  for (let end = activity.length; end - 7 >= 0; end -= 7) {
    const slice = activity.slice(end - 7, end);
    const s = summarisePeriod(slice);
    weekly.unshift({
      weekEnding: slice[slice.length - 1].date,
      label: formatDate(slice[slice.length - 1].date),
      period: end > CURRENT_PERIOD_START_INDEX + 3 ? 'current' : 'previous',
      avgHours: s.avgHours,
      breaksPerDay: s.breaksPerDay,
      productivity: s.productivity,
      overtimeHours: s.overtimeHours,
      lateNightSessions: s.lateNightSessions,
      weekendDays: s.weekendDays,
    });
  }

  return {
    employeeId: emp.id,
    range: { start: current[0].date, end: current[current.length - 1].date },
    baseline: emp.baseline,
    current: emp.metrics,
    daily: current.map((d, i) => ({
      ...d,
      baselineHours: emp.baseline.avgHours,
      previousDate: previous[i]?.date ?? null,
      previousHours: previous[i]?.hours ?? null,
    })),
    weekly,
  };
}

/** GET /analytics/insights */
export function listInsights() {
  return ALL_INSIGHTS.map((i) => ({ ...i }));
}

/** GET /analytics/overview */
export function getOverview() {
  const total = employees.length;
  const count = (level, key = 'level') => employees.filter((e) => e.indicator[key] === level).length;

  const prevSummary = orgSummary(0, CURRENT_PERIOD_START_INDEX);
  const curSummary = orgSummary(CURRENT_PERIOD_START_INDEX);

  // 8 weekly points ending on the last data day.
  const lastIndex = activityByEmployee[employees[0].id].length;
  const elevatedIds = new Set(employees.filter((e) => e.indicator.level === 'elevated').map((e) => e.id));
  const weeklyHours = [];
  for (let w = 7; w >= 0; w -= 1) {
    const end = lastIndex - w * 7;
    const start = end - 7;
    const per = employees.map((e) => ({ id: e.id, s: summarisePeriod(activityByEmployee[e.id].slice(start, end)) }));
    const endDate = activityByEmployee[employees[0].id][end - 1].date;
    weeklyHours.push({
      weekEnding: endDate,
      label: formatDate(endDate),
      period: end - CURRENT_PERIOD_START_INDEX > 3 ? 'current' : 'previous',
      avgHours: round(mean(per.map((p) => p.s.avgHours)), 2),
      elevatedGroupHours: round(mean(per.filter((p) => elevatedIds.has(p.id)).map((p) => p.s.avgHours)), 2),
      overtimePerEmployee: round(mean(per.map((p) => p.s.overtimeHours)), 2),
      reference: 8,
    });
  }

  const distribution = LEVELS.map((level) => ({
    level,
    label: LEVEL_LABELS[level],
    count: count(level),
    previousCount: count(level, 'previousLevel'),
    percent: round((count(level) / total) * 100, 1),
  }));

  const departments = DEPARTMENTS.map((department) => {
    const members = employees.filter((e) => e.department === department);
    return {
      department,
      headcount: members.length,
      avgHours: round(mean(members.map((e) => e.metrics.avgHours)), 2),
      previousAvgHours: round(mean(members.map((e) => e.baseline.avgHours)), 2),
      overtimePerWeek: round(mean(members.map((e) => e.metrics.overtimePerWeek)), 2),
      breaksPerDay: round(mean(members.map((e) => e.metrics.breaksPerDay)), 2),
      productivity: round(mean(members.map((e) => e.metrics.productivity)), 1),
      lateNightSessions: sum(members.map((e) => e.metrics.lateNightSessions)),
      weekendDays: sum(members.map((e) => e.metrics.weekendDays)),
      avgScore: round(mean(members.map((e) => e.indicator.score)), 0),
      previousAvgScore: round(mean(members.map((e) => e.indicator.previousScore)), 0),
      low: members.filter((e) => e.indicator.level === 'low').length,
      moderate: members.filter((e) => e.indicator.level === 'moderate').length,
      elevated: members.filter((e) => e.indicator.level === 'elevated').length,
    };
  });

  const checkIns = employees
    .filter((e) => e.indicator.level !== 'low')
    .sort((a, b) => b.indicator.score - a.indicator.score)
    .map((e) => ({
      id: e.id,
      name: e.name,
      department: e.department,
      designation: e.designation,
      indicator: e.indicator,
      avgHours: e.metrics.avgHours,
      reasons: factorsFor(e)
        .filter((f) => f.points > 0)
        .slice(0, 2)
        .map((f) => f.label),
    }));

  return {
    kpis: {
      totalEmployees: total,
      departments: DEPARTMENTS.length,
      elevated: { current: count('elevated'), previous: count('elevated', 'previousLevel') },
      moderate: { current: count('moderate'), previous: count('moderate', 'previousLevel') },
      avgWorkingHours: compare(curSummary.avgHours, prevSummary.avgHours, 2),
      avgProductivity: compare(curSummary.productivity, prevSummary.productivity, 1),
    },
    weeklyHours,
    distribution,
    departments,
    recentInsights: ALL_INSIGHTS.slice(0, 4),
    checkIns,
  };
}

/**
 * GET /analytics/trends?range=7|30
 * Weekday series are aligned by working-day index so the current and
 * previous periods overlay cleanly. Weekend days are reported
 * separately in `weekend`.
 */
export function getTrends({ range = 30 } = {}) {
  const days = Number(range) === 7 ? 7 : 30;
  const endIso = PERIODS.current.end;
  const endIdx = dayIndex(endIso) + 1;
  const curStart = endIdx - days;
  const prevStart = curStart - days;

  const cur = Array.from({ length: days }, (_, i) => aggregateDay(curStart + i));
  const prev = Array.from({ length: days }, (_, i) => aggregateDay(prevStart + i));

  const curWeekdays = cur.filter((d) => !d.isWeekend);
  const prevWeekdays = prev.filter((d) => !d.isWeekend);
  const daily = curWeekdays.map((d, i) => {
    const p = prevWeekdays[i] ?? {};
    return {
      date: d.date,
      label: formatDate(d.date),
      previousDate: p.date ?? null,
      hours: d.hours,
      previousHours: p.hours ?? null,
      productivity: d.productivity,
      previousProductivity: p.productivity ?? null,
      breaks: d.breaks,
      previousBreaks: p.breaks ?? null,
      overtime: d.overtime,
      previousOvertime: p.overtime ?? null,
      lateNight: d.lateNight,
      previousLateNight: p.lateNight ?? null,
    };
  });

  const curWeekend = cur.filter((d) => d.isWeekend);
  const prevWeekend = prev.filter((d) => d.isWeekend);
  const weekend = curWeekend.map((d, i) => ({
    date: d.date,
    label: formatDate(d.date, { weekday: 'short' }),
    previousDate: prevWeekend[i]?.date ?? null,
    activeEmployees: d.activeEmployees,
    previousActiveEmployees: prevWeekend[i]?.activeEmployees ?? null,
    hours: d.weekendHours,
    previousHours: prevWeekend[i]?.weekendHours ?? null,
  }));

  const summary = compareSummaries(orgSummary(curStart, endIdx), orgSummary(prevStart, curStart));

  return {
    range: days,
    current: { start: cur[0].date, end: cur[cur.length - 1].date, display: formatRange(cur[0].date, cur[cur.length - 1].date) },
    previous: { start: prev[0].date, end: prev[prev.length - 1].date, display: formatRange(prev[0].date, prev[prev.length - 1].date) },
    summary,
    daily,
    weekend,
  };
}

/** POST /simulate */
export function simulate(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new MockHttpError(422, 'Simulation payload must be an object.');
  }
  return computeIndicatorScore(payload);
}

/* ---------------------------------------------------------------- */
/* Forecasting                                                       */
/* ---------------------------------------------------------------- */

const FORECASTS = Object.fromEntries(employees.map((e) => [e.id, forecastEmployee(activityByEmployee[e.id])]));
const BACKTEST = backtest(employees.map((e) => activityByEmployee[e.id]));
const HISTORY_DAYS = 14;

function modelMeta() {
  return { ...FORECAST_MODEL, backtest: BACKTEST };
}

function recentActuals(ids) {
  const activity = activityByEmployee[ids[0]];
  const start = activity.length - HISTORY_DAYS;
  return activity.slice(start).map((day, i) => {
    const records = ids.map((id) => activityByEmployee[id][start + i]);
    const workers = records.filter((r) => r.worked);
    return {
      date: day.date,
      label: formatDate(day.date, { weekday: 'short' }),
      isWeekend: day.isWeekend,
      hours: day.isWeekend ? round(mean(records.map((r) => r.hours)), 2) : round(mean(workers.map((r) => r.hours)), 2),
      overtime: round(sum(records.map((r) => r.overtime)), 1),
      breaks: day.isWeekend ? null : round(mean(records.map((r) => r.breaks)), 2),
    };
  });
}

/** Aggregate per-employee forecasts into one series. Weekend hours are expected hours per person. */
function aggregateForecast(ids) {
  const per = ids.map((id) => FORECASTS[id]);
  return per[0].days.map((day, i) => {
    const rows = per.map((f) => f.days[i]);
    return {
      date: day.date,
      label: formatDate(day.date, { weekday: 'short' }),
      weekday: formatDate(day.date, { weekday: 'long', month: undefined, day: undefined }),
      isWeekend: day.isWeekend,
      predictedHours: round(mean(rows.map((r) => r.expectedHours)), 2),
      lower: day.isWeekend ? null : round(mean(rows.map((r) => r.lower)), 2),
      upper: day.isWeekend ? null : round(mean(rows.map((r) => r.upper)), 2),
      predictedOvertime: round(sum(rows.map((r) => r.overtime)), 1),
      predictedBreaks: day.isWeekend ? null : round(mean(rows.map((r) => r.breaks)), 2),
      expectedWorkers: round(sum(rows.map((r) => r.workProbability)), 1),
      expectedLateNights: round(sum(rows.map((r) => r.lateNight)), 1),
    };
  });
}

function summariseForecast(ids, days, history) {
  const per = ids.map((id) => FORECASTS[id].summary);
  const weekdays = days.filter((d) => !d.isWeekend);
  const recentWeekdays = history.filter((d) => !d.isWeekend).slice(-5);
  const predictedAvgHours = mean(per.map((s) => s.predictedAvgHours));
  const recentAvgHours = mean(per.map((s) => s.recentAvgHours));
  const recentOvertime = sum(history.slice(-7).map((d) => d.overtime));
  const predictedOvertime = sum(days.map((d) => d.predictedOvertime));
  const peak = [...weekdays].sort((a, b) => b.predictedHours - a.predictedHours)[0];
  return {
    predictedAvgHours: round(predictedAvgHours, 2),
    recentAvgHours: round(recentAvgHours, 2),
    change: round(predictedAvgHours - recentAvgHours, 2),
    changePct: round(pctChange(predictedAvgHours, recentAvgHours), 1),
    predictedOvertime: round(predictedOvertime, 1),
    recentOvertime: round(recentOvertime, 1),
    overtimeChangePct: round(pctChange(predictedOvertime, recentOvertime), 1),
    predictedBreaks: round(mean(weekdays.map((d) => d.predictedBreaks)), 2),
    recentBreaks: round(mean(recentWeekdays.map((d) => d.breaks)), 2),
    expectedWeekendWorkers: round(sum(days.filter((d) => d.isWeekend).map((d) => d.expectedWorkers)), 1),
    expectedLateNights: round(sum(days.map((d) => d.expectedLateNights)), 1),
    peakDay: peak ? { date: peak.date, label: peak.weekday, hours: peak.predictedHours } : null,
    rising: per.filter((s) => s.trend === 'rising').length,
    easing: per.filter((s) => s.trend === 'easing').length,
    above10h: per.filter((s) => s.predictedAvgHours >= 10).length,
  };
}

function forecastInsights(summary, people, departments) {
  const out = [];
  const longDays = people.filter((p) => p.predictedAvgHours >= 10);
  if (longDays.length) {
    out.push({
      id: 'fc-long-days',
      tone: 'elevated',
      title: `${longDays.length} ${longDays.length === 1 ? 'person is' : 'people are'} forecast to average 10 h or more`,
      detail: `The model expects ${longDays
        .slice(0, 3)
        .map((p) => p.name.split(' ')[0])
        .join(', ')}${longDays.length > 3 ? ' and others' : ''} to keep working long days next week. Reviewing their priorities now could prevent the pattern from continuing.`,
    });
  }
  const busiestDept = [...departments].sort((a, b) => b.predictedAvgHours - a.predictedAvgHours)[0];
  out.push({
    id: 'fc-dept',
    tone: busiestDept.predictedAvgHours >= 9 ? 'moderate' : 'positive',
    title: `${busiestDept.department} has the heaviest forecast`,
    detail:
      Math.abs(busiestDept.predictedAvgHours - busiestDept.recentAvgHours) < 0.15
        ? `${busiestDept.department} is expected to keep averaging about ${fmtHours(busiestDept.predictedAvgHours)} per weekday, the same high level as the last two weeks.`
        : `${busiestDept.department} is expected to average ${fmtHours(busiestDept.predictedAvgHours)} per weekday, compared with ${fmtHours(busiestDept.recentAvgHours)} over the last two weeks.`,
  });
  out.push({
    id: 'fc-overtime',
    tone: summary.predictedOvertime > summary.recentOvertime * 1.05 ? 'moderate' : 'positive',
    title:
      summary.predictedOvertime > summary.recentOvertime * 1.05
        ? 'Overtime is expected to increase'
        : 'Overtime is expected to hold steady',
    detail: `About ${Math.round(summary.predictedOvertime)} overtime hours are forecast across the organisation, against ${Math.round(summary.recentOvertime)} in the last 7 days.`,
  });
  if (summary.expectedWeekendWorkers >= 1) {
    out.push({
      id: 'fc-weekend',
      tone: summary.expectedWeekendWorkers >= 6 ? 'moderate' : 'positive',
      title: 'Weekend work is likely to continue',
      detail: `Based on recent weekends, about ${Math.round(summary.expectedWeekendWorkers)} person-days of weekend work are expected. Checking whether deadlines fall on Mondays may help.`,
    });
  }
  const easing = people.filter((p) => p.trend === 'easing');
  if (easing.length) {
    out.push({
      id: 'fc-easing',
      tone: 'positive',
      title: `${easing.length} ${easing.length === 1 ? 'person’s' : 'people’s'} workload is easing`,
      detail: `Hours are forecast to fall for ${easing.map((p) => p.name.split(' ')[0]).slice(0, 3).join(', ')}. It may be worth noting what changed.`,
    });
  }
  return out;
}

function fmtHours(h) {
  return `${round(h, 1)} h`;
}

/** GET /analytics/forecast */
export function getForecast() {
  const ids = employees.map((e) => e.id);
  const days = aggregateForecast(ids);
  const history = recentActuals(ids);
  const summary = summariseForecast(ids, days, history);

  const people = employees
    .map((e) => ({
      id: e.id,
      name: e.name,
      department: e.department,
      designation: e.designation,
      indicator: e.indicator,
      ...FORECASTS[e.id].summary,
    }))
    .sort((a, b) => b.predictedOvertime - a.predictedOvertime);

  const departments = DEPARTMENTS.map((department) => {
    const members = employees.filter((e) => e.department === department).map((e) => e.id);
    const s = members.map((id) => FORECASTS[id].summary);
    return {
      department,
      headcount: members.length,
      predictedAvgHours: round(mean(s.map((x) => x.predictedAvgHours)), 2),
      recentAvgHours: round(mean(s.map((x) => x.recentAvgHours)), 2),
      change: round(mean(s.map((x) => x.change)), 2),
      predictedOvertime: round(sum(s.map((x) => x.predictedOvertime)), 1),
    };
  });

  return {
    model: modelMeta(),
    historyRange: { start: history[0].date, end: history[history.length - 1].date },
    horizon: { start: days[0].date, end: days[days.length - 1].date, display: formatRange(days[0].date, days[days.length - 1].date) },
    days,
    history,
    summary,
    departments,
    employees: people,
    insights: forecastInsights(summary, people, departments),
  };
}

/** GET /employees/{id}/forecast */
export function getEmployeeForecast(id) {
  const emp = findEmployee(id);
  const f = FORECASTS[emp.id];
  const activity = activityByEmployee[emp.id];
  return {
    employeeId: emp.id,
    model: modelMeta(),
    horizon: { start: f.days[0].date, end: f.days[f.days.length - 1].date, display: formatRange(f.days[0].date, f.days[f.days.length - 1].date) },
    days: f.days.map((d) => ({ ...d, label: formatDate(d.date, { weekday: 'short' }) })),
    history: activity.slice(-HISTORY_DAYS).map((d) => ({
      date: d.date,
      label: formatDate(d.date, { weekday: 'short' }),
      isWeekend: d.isWeekend,
      hours: d.hours,
      breaks: d.isWeekend ? null : d.breaks,
      overtime: d.overtime,
    })),
    summary: f.summary,
  };
}
