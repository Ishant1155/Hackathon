/**
 * Sisyphus – illustrative behavioural indicator scoring.
 *
 * IMPORTANT: The weights, caps and thresholds below were chosen for a
 * hackathon demonstration. They are NOT clinically or scientifically
 * validated and must not be used to assess real people. The score
 * describes work *patterns* only and is not a measure of health.
 *
 * This module is pure (no React, no I/O) so it can run in the browser
 * for the mock API and later be replaced by `POST /simulate` on the
 * FastAPI backend without changing any page code.
 */

import { clamp, round } from './metrics.js';

export const SIMULATION_DISCLAIMER =
  'Illustrative demo score. The weights and thresholds are not clinically or scientifically validated and must not be used to assess any individual.';

/** Illustrative level boundaries on the 0–100 scale. */
export const SCORE_THRESHOLDS = Object.freeze({ moderate: 30, elevated: 55 });

/** Reference values used to explain contributions. Illustrative only. */
export const REFERENCE = Object.freeze({
  workingHours: 8,
  dailyBreaks: 3,
});

/** Weight model: points per unit and the cap for each factor. Caps sum to 100. */
export const FACTOR_WEIGHTS = Object.freeze({
  avgWorkingHours: { perUnit: 8, max: 30 }, // per hour above 8 h/day
  dailyBreaks: { perUnit: 7, max: 20 }, // per break below 3/day
  lateNightSessions: { perUnit: 5, max: 20 }, // per session per week
  weekendDays: { perUnit: 10, max: 15 }, // per weekend day per week
  productivityChange: { perUnit: 0.75, max: 15 }, // per % decline vs baseline
});

export const SLIDER_CONFIG = [
  {
    key: 'avgWorkingHours',
    label: 'Average working hours',
    unit: 'h / day',
    min: 6,
    max: 14,
    step: 0.5,
    help: 'Average length of a weekday. The demo uses 8 h as a reference point.',
  },
  {
    key: 'dailyBreaks',
    label: 'Daily break count',
    unit: 'breaks / day',
    min: 0,
    max: 8,
    step: 1,
    help: 'Recorded pauses of 10 minutes or more. Fewer than 3 adds to the score.',
  },
  {
    key: 'lateNightSessions',
    label: 'Late-night sessions',
    unit: 'per week',
    min: 0,
    max: 7,
    step: 1,
    help: 'Work sessions recorded after 9 pm.',
  },
  {
    key: 'weekendDays',
    label: 'Weekend working days',
    unit: 'days / week',
    min: 0,
    max: 2,
    step: 0.5,
    help: 'Average weekend days with recorded work. 0.5 means every other weekend.',
  },
  {
    key: 'productivityChange',
    label: 'Productivity change',
    unit: '% vs baseline',
    min: -40,
    max: 20,
    step: 1,
    help: 'Change in task output compared with the person’s own earlier baseline.',
  },
];

export const DEFAULT_INPUTS = Object.freeze({
  avgWorkingHours: 8,
  dailyBreaks: 3,
  lateNightSessions: 0,
  weekendDays: 0,
  productivityChange: 0,
});

export const SIMULATION_PRESETS = [
  {
    id: 'healthy',
    name: 'Healthy Schedule',
    description: 'Regular 8-hour days, frequent breaks, evenings and weekends free.',
    inputs: { avgWorkingHours: 8, dailyBreaks: 4, lateNightSessions: 0, weekendDays: 0, productivityChange: 2 },
  },
  {
    id: 'occasional',
    name: 'Occasional Overtime',
    description: 'Longer days during a busy period, with the odd late evening and weekend.',
    inputs: { avgWorkingHours: 9.5, dailyBreaks: 3, lateNightSessions: 1, weekendDays: 0.5, productivityChange: -2 },
  },
  {
    id: 'sustained',
    name: 'Sustained Overwork',
    description: 'Long days, few breaks, regular late nights and weekend work over several weeks.',
    inputs: { avgWorkingHours: 11.5, dailyBreaks: 1, lateNightSessions: 4, weekendDays: 2, productivityChange: -18 },
  },
  {
    id: 'weekend',
    name: 'Weekend Catch-up',
    description: 'Slightly longer weekdays with fewer breaks, and most weekends used to catch up.',
    inputs: { avgWorkingHours: 9, dailyBreaks: 2, lateNightSessions: 1, weekendDays: 2, productivityChange: -2 },
  },
];

const LEVEL_LABELS = { low: 'Low', moderate: 'Moderate', elevated: 'Elevated' };

export function getIndicatorLevel(score) {
  if (score >= SCORE_THRESHOLDS.elevated) return 'elevated';
  if (score >= SCORE_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

/** Coerce any payload into valid numeric inputs within slider bounds. */
export function sanitiseInputs(raw = {}) {
  return SLIDER_CONFIG.reduce((acc, { key, min, max }) => {
    const value = Number(raw[key]);
    acc[key] = Number.isFinite(value) ? clamp(value, min, max) : DEFAULT_INPUTS[key];
    return acc;
  }, {});
}

function capped(key, units) {
  const { perUnit, max } = FACTOR_WEIGHTS[key];
  return round(clamp(units * perUnit, 0, max), 1);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Compute an illustrative behavioural indicator score.
 *
 * @param {SimulationInputs} rawInputs
 * @returns {SimulationResult}
 *
 * @typedef {Object} SimulationInputs
 * @property {number} avgWorkingHours     hours per weekday (6–14)
 * @property {number} dailyBreaks         breaks per weekday (0–8)
 * @property {number} lateNightSessions   sessions after 9 pm per week (0–7)
 * @property {number} weekendDays         weekend days worked per week (0–2)
 * @property {number} productivityChange  % change vs baseline (−40 to +20)
 *
 * @typedef {Object} SimulationFactor
 * @property {string} key
 * @property {string} label
 * @property {number} value
 * @property {string} unit
 * @property {number} points
 * @property {number} maxPoints
 * @property {'contributing'|'neutral'} status
 * @property {string} explanation
 *
 * @typedef {Object} SimulationResult
 * @property {number} score               0–100, rounded
 * @property {'low'|'moderate'|'elevated'} level
 * @property {string} levelLabel
 * @property {SimulationFactor[]} factors sorted by points, highest first
 * @property {string} summary
 * @property {string} disclaimer
 * @property {SimulationInputs} inputs    sanitised inputs used for the calculation
 * @property {{moderate:number, elevated:number}} thresholds
 */
export function computeIndicatorScore(rawInputs) {
  const i = sanitiseInputs(rawInputs);

  const hoursAbove = Math.max(0, i.avgWorkingHours - REFERENCE.workingHours);
  const breaksBelow = Math.max(0, REFERENCE.dailyBreaks - i.dailyBreaks);
  const productivityDecline = Math.max(0, -i.productivityChange);

  const hoursPts = capped('avgWorkingHours', hoursAbove);
  const breakPts = capped('dailyBreaks', breaksBelow);
  const latePts = capped('lateNightSessions', i.lateNightSessions);
  const weekendPts = capped('weekendDays', i.weekendDays);
  const prodPts = capped('productivityChange', productivityDecline);

  const h = round(i.avgWorkingHours, 1);
  const b = round(i.dailyBreaks, 1);
  const l = round(i.lateNightSessions, 1);
  const w = round(i.weekendDays, 1);
  const p = round(i.productivityChange, 1);

  const factors = [
    {
      key: 'avgWorkingHours',
      label: 'Working hours',
      value: h,
      unit: 'h / day',
      points: hoursPts,
      maxPoints: FACTOR_WEIGHTS.avgWorkingHours.max,
      explanation:
        hoursPts > 0
          ? `${h} h/day is ${round(hoursAbove, 1)} h above the 8 h reference used in this demo.`
          : `${h} h/day is at or below the 8 h reference, so it adds nothing.`,
    },
    {
      key: 'dailyBreaks',
      label: 'Break frequency',
      value: b,
      unit: 'breaks / day',
      points: breakPts,
      maxPoints: FACTOR_WEIGHTS.dailyBreaks.max,
      explanation:
        breakPts > 0
          ? `${plural(b, 'break')} per day is below the 3-break reference, leaving fewer recovery pauses.`
          : `${plural(b, 'break')} per day meets the 3-break reference, so it adds nothing.`,
    },
    {
      key: 'lateNightSessions',
      label: 'Late-night activity',
      value: l,
      unit: 'per week',
      points: latePts,
      maxPoints: FACTOR_WEIGHTS.lateNightSessions.max,
      explanation:
        latePts > 0
          ? `${plural(l, 'session')} after 9 pm each week add 5 points per session (capped at 20).`
          : 'No late-night sessions, so evenings appear protected.',
    },
    {
      key: 'weekendDays',
      label: 'Weekend work',
      value: w,
      unit: 'days / week',
      points: weekendPts,
      maxPoints: FACTOR_WEIGHTS.weekendDays.max,
      explanation:
        weekendPts > 0
          ? `Working ${w} weekend day${w === 1 ? '' : 's'} per week reduces time for rest (10 points per day, capped at 15).`
          : 'No weekend work, so weekends appear protected.',
    },
    {
      key: 'productivityChange',
      label: 'Productivity change',
      value: p,
      unit: '% vs baseline',
      points: prodPts,
      maxPoints: FACTOR_WEIGHTS.productivityChange.max,
      explanation:
        prodPts > 0
          ? `Output is ${Math.abs(p)}% below baseline. A drop alongside longer hours can mean the workload is not sustainable.`
          : `Output is ${p > 0 ? `${p}% above` : 'in line with'} baseline, so it adds nothing.`,
    },
  ]
    .map((f) => ({ ...f, status: f.points > 0 ? 'contributing' : 'neutral' }))
    .sort((a, b2) => b2.points - a.points);

  const score = Math.round(clamp(factors.reduce((t, f) => t + f.points, 0), 0, 100));
  const level = getIndicatorLevel(score);
  const drivers = factors.filter((f) => f.points > 0).slice(0, 2).map((f) => f.label.toLowerCase());
  const driverText = drivers.length === 2 ? `${drivers[0]} and ${drivers[1]}` : drivers[0];

  let summary;
  if (level === 'elevated') {
    summary = `Several patterns combine to suggest sustained overwork in this hypothetical scenario, driven mostly by ${driverText}. In a real workplace this would prompt a supportive conversation about workload, not a judgement about the person.`;
  } else if (level === 'moderate') {
    summary = `Some patterns move away from the reference schedule, mainly ${driverText}. A light-touch check-in about priorities and workload could be helpful.`;
  } else if (drivers.length) {
    summary = `The pattern stays close to the reference schedule. ${driverText[0].toUpperCase()}${driverText.slice(1)} add${drivers.length === 1 ? 's' : ''} a little, but not enough to suggest sustained overwork.`;
  } else {
    summary = 'The pattern matches the illustrative reference schedule. No factors add to the score.';
  }

  return {
    score,
    level,
    levelLabel: LEVEL_LABELS[level],
    factors,
    summary,
    disclaimer: SIMULATION_DISCLAIMER,
    inputs: i,
    thresholds: { ...SCORE_THRESHOLDS },
  };
}
