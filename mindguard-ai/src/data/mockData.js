/**
 * Sisyphus – SIMULATED DATASET
 * ------------------------------------------------------------------
 * Every person, ID and number in this file is fictional and generated
 * for demonstration purposes. No real personal information is used.
 *
 * Only the mock backend (src/services/mockBackend.js) may import this
 * file. Pages and components must go through src/services/api.js.
 *
 * Structure
 *  - 24 fictional employees across 6 departments
 *  - 60 days of daily activity per employee, generated with a seeded
 *    PRNG so the data is identical on every load:
 *      previous period: 2026-09-01 → 2026-09-30 (baseline)
 *      current period:  2026-10-01 → 2026-10-30
 *  - Indicator scores and levels are derived from the current-period
 *    activity with the same illustrative formula used by the
 *    Simulation Lab (src/utils/simulation.js), so the table, profiles
 *    and charts always agree with each other.
 */

import { computeIndicatorScore } from '../utils/simulation.js';
import { summarisePeriod, round, clamp } from '../utils/metrics.js';
import { pctChange } from '../utils/format.js';

export const DATA_NOTICE =
  'All employees and activity shown are simulated for demonstration. No real personal data is used.';

export const ORGANISATION = {
  name: 'Northwind Labs (fictional)',
  timezone: 'UTC',
};

export const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];

export const PERIODS = {
  current: { start: '2026-10-01', end: '2026-10-30', label: 'Current period' },
  previous: { start: '2026-09-01', end: '2026-09-30', label: 'Previous period (baseline)' },
  dataStart: '2026-09-01',
  dataEnd: '2026-10-30',
  generatedAt: '2026-10-31T06:00:00Z',
};

/**
 * Work-pattern profiles. `base` describes the September baseline and
 * `current` the October pattern the person ramps into over ~10 days.
 *   hours        average weekday hours
 *   breaks       average breaks per weekday
 *   late         late-night (after 9 pm) sessions per week
 *   weekend      probability of working on any given weekend day
 *   productivity average productivity score (0–100)
 *   tasks        average tasks completed per weekday at baseline
 */
const PROFILES = {
  steady: {
    base: { hours: 8.0, breaks: 3.6, late: 0.2, weekend: 0.03, productivity: 79, tasks: 6 },
    current: { hours: 8.1, breaks: 3.5, late: 0.2, weekend: 0.04, productivity: 80 },
  },
  steadyLight: {
    base: { hours: 7.6, breaks: 4.2, late: 0, weekend: 0, productivity: 77, tasks: 5 },
    current: { hours: 7.7, breaks: 4.1, late: 0.1, weekend: 0.02, productivity: 78 },
  },
  busy: {
    base: { hours: 8.4, breaks: 3.0, late: 0.5, weekend: 0.08, productivity: 81, tasks: 7 },
    current: { hours: 9.8, breaks: 1.9, late: 1.6, weekend: 0.22, productivity: 76 },
  },
  campaign: {
    base: { hours: 8.3, breaks: 3.2, late: 0.4, weekend: 0.05, productivity: 80, tasks: 6 },
    current: { hours: 9.5, breaks: 2.2, late: 2.8, weekend: 0.18, productivity: 75 },
  },
  weekend: {
    base: { hours: 8.2, breaks: 3.2, late: 0.3, weekend: 0.1, productivity: 78, tasks: 6 },
    current: { hours: 8.9, breaks: 2.6, late: 1.0, weekend: 0.72, productivity: 75 },
  },
  sustained: {
    base: { hours: 8.9, breaks: 2.6, late: 0.8, weekend: 0.15, productivity: 82, tasks: 7 },
    current: { hours: 11.1, breaks: 1.1, late: 3.4, weekend: 0.55, productivity: 68 },
  },
  improving: {
    base: { hours: 9.8, breaks: 1.9, late: 2.0, weekend: 0.35, productivity: 72, tasks: 6 },
    current: { hours: 8.4, breaks: 3.1, late: 0.4, weekend: 0.06, productivity: 79 },
  },
};

const EMPLOYEE_SEED = [
  // Engineering
  { id: 'MG-1001', name: 'Aria Castellano', department: 'Engineering', designation: 'Senior Software Engineer', location: 'Remote', startDate: '2021-03-15', profile: 'sustained' },
  { id: 'MG-1002', name: 'Tobias Lindqvist', department: 'Engineering', designation: 'Backend Engineer', location: 'Hybrid', startDate: '2022-08-01', profile: 'steady' },
  { id: 'MG-1003', name: 'Priya Ramanathan', department: 'Engineering', designation: 'Engineering Manager', location: 'Office', startDate: '2019-11-04', profile: 'busy' },
  { id: 'MG-1004', name: 'Kenji Moriyama', department: 'Engineering', designation: 'Frontend Engineer', location: 'Remote', startDate: '2023-02-20', profile: 'steadyLight' },
  // Marketing
  { id: 'MG-1005', name: 'Leila Haddad', department: 'Marketing', designation: 'Marketing Lead', location: 'Hybrid', startDate: '2020-06-08', profile: 'campaign' },
  { id: 'MG-1006', name: 'Owen Fairbanks', department: 'Marketing', designation: 'Content Strategist', location: 'Remote', startDate: '2022-01-10', profile: 'steady' },
  { id: 'MG-1007', name: 'Sofia Marchetti', department: 'Marketing', designation: 'Growth Analyst', location: 'Office', startDate: '2021-09-27', profile: 'improving' },
  { id: 'MG-1008', name: 'Rafael Quintero', department: 'Marketing', designation: 'Brand Designer', location: 'Hybrid', startDate: '2023-05-02', profile: 'steadyLight' },
  // HR
  { id: 'MG-1009', name: 'Hannah Osei', department: 'HR', designation: 'HR Business Partner', location: 'Office', startDate: '2018-04-16', profile: 'busy' },
  { id: 'MG-1010', name: 'Marcus Bellamy', department: 'HR', designation: 'Talent Acquisition Specialist', location: 'Hybrid', startDate: '2022-10-03', profile: 'steady' },
  { id: 'MG-1011', name: 'Ingrid Solberg', department: 'HR', designation: 'People Operations Coordinator', location: 'Office', startDate: '2024-01-08', profile: 'steadyLight' },
  { id: 'MG-1012', name: 'Nadia Petrova', department: 'HR', designation: 'Learning & Development Lead', location: 'Remote', startDate: '2020-02-24', profile: 'steady' },
  // Finance
  { id: 'MG-1013', name: 'Elliot Grayson', department: 'Finance', designation: 'Financial Analyst', location: 'Office', startDate: '2021-07-12', profile: 'sustained' },
  { id: 'MG-1014', name: 'Mei-Lin Zhao', department: 'Finance', designation: 'Finance Manager', location: 'Hybrid', startDate: '2017-09-18', profile: 'busy' },
  { id: 'MG-1015', name: 'Samuel Adeyemi', department: 'Finance', designation: 'Accounts Payable Specialist', location: 'Office', startDate: '2023-03-06', profile: 'steady' },
  { id: 'MG-1016', name: 'Clara Whitfield', department: 'Finance', designation: 'FP&A Analyst', location: 'Remote', startDate: '2022-05-23', profile: 'weekend' },
  // Operations
  { id: 'MG-1017', name: 'Diego Fernandes', department: 'Operations', designation: 'Operations Manager', location: 'Office', startDate: '2019-01-14', profile: 'sustained' },
  { id: 'MG-1018', name: 'Amara Nwosu', department: 'Operations', designation: 'Logistics Coordinator', location: 'Office', startDate: '2023-08-21', profile: 'steady' },
  { id: 'MG-1019', name: 'Felix Brandt', department: 'Operations', designation: 'Supply Chain Analyst', location: 'Hybrid', startDate: '2021-11-29', profile: 'weekend' },
  { id: 'MG-1020', name: 'Yuki Tanabe', department: 'Operations', designation: 'Process Improvement Lead', location: 'Remote', startDate: '2020-10-05', profile: 'improving' },
  // Sales
  { id: 'MG-1021', name: 'Isabella Moreau', department: 'Sales', designation: 'Account Executive', location: 'Hybrid', startDate: '2022-02-14', profile: 'sustained' },
  { id: 'MG-1022', name: 'Jonah Whitaker', department: 'Sales', designation: 'Sales Development Representative', location: 'Office', startDate: '2024-04-01', profile: 'steady' },
  { id: 'MG-1023', name: 'Zara Ahmed', department: 'Sales', designation: 'Regional Sales Manager', location: 'Office', startDate: '2018-08-20', profile: 'campaign' },
  { id: 'MG-1024', name: 'Lucas Ferreira', department: 'Sales', designation: 'Customer Success Manager', location: 'Remote', startDate: '2021-05-17', profile: 'steadyLight' },
];

/* ---------------------------------------------------------------- */
/* Deterministic generation                                          */
/* ---------------------------------------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id) {
  return [...id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);
}

const DAY_MS = 86_400_000;

function buildDateRange(startIso, endIso) {
  const out = [];
  for (let t = Date.parse(`${startIso}T00:00:00Z`); t <= Date.parse(`${endIso}T00:00:00Z`); t += DAY_MS) {
    out.push(new Date(t));
  }
  return out;
}

const DATES = buildDateRange(PERIODS.dataStart, PERIODS.dataEnd);
const CURRENT_START_INDEX = DATES.findIndex((d) => d.toISOString().slice(0, 10) === PERIODS.current.start);
const RAMP_DAYS = 10;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @typedef {Object} DailyRecord
 * @property {string}  date            ISO date
 * @property {boolean} isWeekend
 * @property {boolean} worked          any recorded work that day
 * @property {number}  hours           recorded working hours
 * @property {number}  breaks          recorded breaks (≥10 min)
 * @property {number|null} productivity score 0–100, weekdays only
 * @property {number}  tasksCompleted
 * @property {number}  overtime        weekday hours beyond 8 h, or all hours on a weekend
 * @property {number}  lateNight       sessions after 9 pm (0 or 1)
 * @property {boolean} simulated       always true
 */
function generateActivity(employee) {
  const rand = mulberry32(seedFromId(employee.id));
  const noise = (spread) => (rand() * 2 - 1) * spread;
  const { base, current } = PROFILES[employee.profile];

  return DATES.map((date, index) => {
    const iso = date.toISOString().slice(0, 10);
    const dow = date.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    // Previous period follows the baseline; the current period ramps
    // into the new pattern over the first RAMP_DAYS days.
    const t = index < CURRENT_START_INDEX ? 0 : Math.min(1, (index - CURRENT_START_INDEX + 1) / RAMP_DAYS);
    const p = {
      hours: lerp(base.hours, current.hours, t),
      breaks: lerp(base.breaks, current.breaks, t),
      late: lerp(base.late, current.late, t),
      weekend: lerp(base.weekend, current.weekend, t),
      productivity: lerp(base.productivity, current.productivity, t),
    };

    if (isWeekend) {
      const worked = rand() < p.weekend;
      const hours = worked ? round(2 + rand() * 3.5, 1) : 0;
      return {
        date: iso,
        isWeekend,
        worked,
        hours,
        breaks: worked && rand() < 0.4 ? 1 : 0,
        productivity: null,
        tasksCompleted: worked ? 1 + Math.floor(rand() * 3) : 0,
        overtime: hours, // all weekend hours count as overtime
        lateNight: 0,
        simulated: true,
      };
    }

    const hours = round(clamp(p.hours + noise(0.7), 6, 14), 1);
    const breaks = Math.round(clamp(p.breaks + noise(0.9), 0, 8));
    const productivity = Math.round(clamp(p.productivity + noise(5), 40, 98));
    const tasksCompleted = Math.max(0, Math.round(base.tasks * (productivity / base.productivity) + noise(1.2)));
    const lateNight = rand() < p.late / 5 ? 1 : 0;

    return {
      date: iso,
      isWeekend,
      worked: true,
      hours,
      breaks,
      productivity,
      tasksCompleted,
      overtime: round(Math.max(0, hours - 8), 1),
      lateNight,
      simulated: true,
    };
  });
}

function toIndicatorInputs(summary, baseline) {
  return {
    avgWorkingHours: summary.avgHours,
    dailyBreaks: summary.breaksPerDay,
    lateNightSessions: summary.lateNightPerWeek,
    weekendDays: summary.weekendDaysPerWeek,
    productivityChange: baseline ? round(pctChange(summary.productivity, baseline.productivity), 1) : 0,
  };
}

/** Daily activity keyed by employee ID (60 days each). */
export const activityByEmployee = {};

/**
 * Employee records with current-period metrics, baseline metrics and
 * the derived (illustrative) indicator.
 */
export const employees = EMPLOYEE_SEED.map((seed) => {
  const activity = generateActivity(seed);
  activityByEmployee[seed.id] = activity;

  const currentSummary = summarisePeriod(activity.slice(CURRENT_START_INDEX));
  const baselineSummary = summarisePeriod(activity.slice(0, CURRENT_START_INDEX));

  const currentResult = computeIndicatorScore(toIndicatorInputs(currentSummary, baselineSummary));
  const baselineResult = computeIndicatorScore(toIndicatorInputs(baselineSummary, null));

  const { profile, ...publicFields } = seed;
  return {
    ...publicFields,
    simulated: true,
    metrics: currentSummary,
    baseline: baselineSummary,
    indicator: {
      score: currentResult.score,
      level: currentResult.level,
      levelLabel: currentResult.levelLabel,
      previousScore: baselineResult.score,
      previousLevel: baselineResult.level,
      productivityChange: currentResult.inputs.productivityChange,
    },
  };
});

export const CURRENT_PERIOD_START_INDEX = CURRENT_START_INDEX;
