/**
 * Aggregation helpers that turn daily activity records into period summaries.
 * Used by the mock backend. A real backend would perform the same
 * aggregation server-side and return the summaries directly.
 */

export function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sum(values) {
  return values.reduce((total, v) => total + (v ?? 0), 0);
}

export function mean(values) {
  const valid = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!valid.length) return null;
  return sum(valid) / valid.length;
}

/**
 * Summarise a list of daily records (one employee, one period).
 *
 * @param {Array<import('../data/mockData').DailyRecord>} records
 * @returns {PeriodSummary}
 *
 * @typedef {Object} PeriodSummary
 * @property {number} avgHours            Mean hours on weekdays
 * @property {number} breaksPerDay        Mean recorded breaks on weekdays
 * @property {number} productivity        Mean productivity score (0–100) on weekdays
 * @property {number} tasksPerDay         Mean tasks completed on weekdays
 * @property {number} overtimeHours       Total hours beyond 8 h on weekdays plus all weekend hours
 * @property {number} overtimePerWeek
 * @property {number} lateNightSessions   Count of sessions after 9 pm
 * @property {number} lateNightPerWeek
 * @property {number} weekendDays         Weekend days with recorded work
 * @property {number} weekendDaysPerWeek
 * @property {number} totalHours
 * @property {number} days                Calendar days in the period
 */
export function summarisePeriod(records) {
  const weekdays = records.filter((r) => !r.isWeekend);
  const weekendWorked = records.filter((r) => r.isWeekend && r.worked);
  const weeks = records.length / 7 || 1;

  const overtimeHours = sum(records.map((r) => r.overtime));
  const lateNightSessions = sum(records.map((r) => r.lateNight));

  return {
    avgHours: round(mean(weekdays.map((r) => r.hours)), 2),
    breaksPerDay: round(mean(weekdays.map((r) => r.breaks)), 2),
    productivity: round(mean(weekdays.map((r) => r.productivity)), 1),
    tasksPerDay: round(mean(weekdays.map((r) => r.tasksCompleted)), 2),
    overtimeHours: round(overtimeHours, 1),
    overtimePerWeek: round(overtimeHours / weeks, 2),
    lateNightSessions,
    lateNightPerWeek: round(lateNightSessions / weeks, 2),
    weekendDays: weekendWorked.length,
    weekendDaysPerWeek: round(weekendWorked.length / weeks, 2),
    totalHours: round(sum(records.map((r) => r.hours)), 1),
    days: records.length,
  };
}
