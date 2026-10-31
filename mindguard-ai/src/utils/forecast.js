/**
 * Sisyphus – 7-day workload forecasting engine.
 *
 * Model: damped Holt linear trend (double exponential smoothing),
 * fitted separately to each employee's weekday hours and weekday
 * breaks, plus a weekend-participation model (smoothed share of
 * recent weekend days worked × typical weekend hours).
 *
 * Pure functions only, so the mock backend can run them in the
 * browser and a FastAPI service can later replace them behind
 * GET /analytics/forecast and GET /employees/{id}/forecast.
 *
 * Forecasts are statistical estimates from simulated activity. They
 * are not medical assessments and have not been validated against
 * real-world outcomes.
 */

import { clamp, mean, round, sum } from './metrics.js';

export const FORECAST_MODEL = Object.freeze({
  name: 'Damped Holt trend model',
  method:
    'Double exponential smoothing fitted to each person’s weekday history, with a separate model for weekend participation.',
  // Chosen by grid search on rolling back-tests over the simulated data.
  params: { alpha: 0.25, beta: 0.2, phi: 0.85 },
  horizonDays: 7,
  interval: 0.8,
  disclaimer:
    'Forecasts are statistical estimates based on simulated activity. They are not medical assessments and have not been validated against real outcomes.',
});

const Z_80 = 1.2816;
const DAY_MS = 86_400_000;

/** Fit a damped Holt model and return a forecaster. */
export function fitHolt(series, { alpha, beta, phi } = FORECAST_MODEL.params) {
  if (!series.length) return null;
  let level = series[0];
  let trend = 0;
  const errors = [];
  for (let t = 1; t < series.length; t += 1) {
    const predicted = level + phi * trend;
    errors.push(series[t] - predicted);
    const previousLevel = level;
    level = alpha * series[t] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - previousLevel) + (1 - beta) * phi * trend;
  }
  const recent = errors.slice(-20);
  const sd = recent.length ? Math.sqrt(mean(recent.map((e) => e * e))) : 0;
  return {
    level,
    trend,
    sd,
    /** Point forecast `h` steps ahead (h ≥ 1). */
    predict(h) {
      let damp = 0;
      for (let i = 1; i <= h; i += 1) damp += phi ** i;
      return level + trend * damp;
    },
  };
}

function erf(x) {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** E[max(0, X − threshold)] for X ~ Normal(mu, sd). Expected overtime. */
export function expectedExcess(mu, sd, threshold) {
  if (sd < 1e-6) return Math.max(0, mu - threshold);
  const z = (mu - threshold) / sd;
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return sd * pdf + (mu - threshold) * cdf;
}

function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function isWeekendIso(iso) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

/**
 * Forecast one employee's next `horizon` days from daily records.
 * @param {Array<import('../data/mockData.js').DailyRecord>} activity
 * @param {{ endIndex?: number, horizon?: number }} [options] forecast from records before endIndex
 */
export function forecastEmployee(activity, { endIndex = activity.length, horizon = FORECAST_MODEL.horizonDays } = {}) {
  const history = activity.slice(0, endIndex);
  const weekdays = history.filter((d) => !d.isWeekend);
  const hoursModel = fitHolt(weekdays.map((d) => d.hours));
  const breaksModel = fitHolt(weekdays.map((d) => d.breaks));

  const recentWeekdays = weekdays.slice(-10);
  const lateRate = mean(recentWeekdays.map((d) => d.lateNight)) ?? 0;

  const recentWeekend = history.filter((d) => d.isWeekend).slice(-8);
  const workedWeekend = recentWeekend.filter((d) => d.worked).length;
  const weekendProbability = (workedWeekend + 0.5) / (recentWeekend.length + 1);
  const weekendHours = mean(history.filter((d) => d.isWeekend && d.worked).map((d) => d.hours)) ?? 3.5;

  const lastDate = history[history.length - 1].date;
  const hoursSd = Math.max(hoursModel.sd, 0.3);
  let step = 0;

  const days = Array.from({ length: horizon }, (_, i) => {
    const date = addDays(lastDate, i + 1);
    if (isWeekendIso(date)) {
      const expectedHours = weekendProbability * weekendHours;
      return {
        date,
        isWeekend: true,
        workProbability: round(weekendProbability, 3),
        hours: round(weekendHours, 2),
        expectedHours: round(expectedHours, 2),
        lower: null,
        upper: null,
        overtime: round(expectedHours, 2),
        breaks: null,
        lateNight: 0,
      };
    }
    step += 1;
    const hours = clamp(hoursModel.predict(step), 6, 14);
    const spread = Z_80 * hoursSd * Math.sqrt(step);
    return {
      date,
      isWeekend: false,
      workProbability: 1,
      hours: round(hours, 2),
      expectedHours: round(hours, 2),
      lower: round(clamp(hours - spread, 4, 14), 2),
      upper: round(clamp(hours + spread, 6, 16), 2),
      overtime: round(expectedExcess(hours, hoursSd, 8), 2),
      breaks: round(clamp(breaksModel.predict(step), 0, 8), 2),
      lateNight: round(lateRate, 3),
    };
  });

  const predictedWeekdays = days.filter((d) => !d.isWeekend);
  const predictedAvgHours = mean(predictedWeekdays.map((d) => d.hours));
  const recentAvgHours = mean(recentWeekdays.map((d) => d.hours));
  const change = predictedAvgHours - recentAvgHours;

  return {
    days,
    summary: {
      predictedAvgHours: round(predictedAvgHours, 2),
      recentAvgHours: round(recentAvgHours, 2),
      change: round(change, 2),
      trend: change > 0.25 ? 'rising' : change < -0.25 ? 'easing' : 'steady',
      predictedOvertime: round(sum(days.map((d) => d.overtime)), 1),
      predictedBreaks: round(mean(predictedWeekdays.map((d) => d.breaks)), 2),
      expectedWeekendDays: round(sum(days.filter((d) => d.isWeekend).map((d) => d.workProbability)), 2),
      expectedLateNights: round(sum(days.map((d) => d.lateNight)), 1),
      residualSd: round(hoursModel.sd, 2),
      dailyTrend: round(hoursModel.trend, 3),
    },
  };
}

/**
 * Rolling back-test: from several past origins, forecast the following
 * `horizon` days and compare weekday hours with what actually
 * happened. A naive baseline (mean of the previous 10 weekdays) is
 * reported alongside for context.
 */
export function backtest(activities, horizon = FORECAST_MODEL.horizonDays, origins = [7, 14, 21]) {
  const modelErrors = [];
  const naiveErrors = [];
  origins.forEach((offset) => {
    activities.forEach((activity) => {
      const endIndex = activity.length - offset;
      const { days } = forecastEmployee(activity, { endIndex, horizon });
      const naive = mean(activity.slice(0, endIndex).filter((d) => !d.isWeekend).slice(-10).map((d) => d.hours));
      days.forEach((d, i) => {
        const actual = activity[endIndex + i];
        if (d.isWeekend || !actual) return;
        modelErrors.push(Math.abs(actual.hours - d.hours));
        naiveErrors.push(Math.abs(actual.hours - naive));
      });
    });
  });
  return {
    window: horizon,
    origins: origins.length,
    samples: modelErrors.length,
    maeHours: round(mean(modelErrors), 2),
    naiveMaeHours: round(mean(naiveErrors), 2),
  };
}
