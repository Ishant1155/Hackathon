"""7-day workload forecasting (powers the frontend's 7-Day Forecast page).

Python port of the frontend's src/utils/forecast.js so both modes agree:
a damped Holt linear-trend model (double exponential smoothing) fitted
to each employee's workday hours and breaks, plus a rest-day
participation model (smoothed share of recent rest days worked).

Respects each employee's own schedule: scheduled days use the hours
model, non-scheduled days use the participation model. Missing values
are skipped, not treated as zero. Employees with fewer than
MIN_FORECAST_WORKDAYS recorded workdays are not forecast.

Forecasts are statistical estimates from synthetic activity, not
medical or performance assessments.
"""

from __future__ import annotations

import math
from typing import Optional

from app.ml.feature_engineering import EmployeeTimeline, is_workday
from app.utils.helpers import add_days, clamp, mean, rnd, total

FORECAST_MODEL = {
    "name": "Damped Holt trend model",
    "method": "Double exponential smoothing fitted to each person's recorded workdays, with a separate model for rest-day work.",
    # Grid-searched on rolling back-tests over the synthetic data (see BACKEND_IMPLEMENTATION.md).
    "params": {"alpha": 0.15, "beta": 0.1, "phi": 0.85},
    "horizonDays": 7,
    "interval": 0.8,
    "disclaimer": "Forecasts are statistical estimates based on synthetic activity. They are not medical assessments and have not been validated against real outcomes.",
}
MIN_FORECAST_WORKDAYS = 5
Z_80 = 1.2816
WEEKDAY_CODES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class InsufficientHistory(ValueError):
    pass


class Holt:
    def __init__(self, series: list[float], alpha: float, beta: float, phi: float):
        self.phi = phi
        self.level = series[0]
        self.trend = 0.0
        errors = []
        for x in series[1:]:
            predicted = self.level + phi * self.trend
            errors.append(x - predicted)
            prev = self.level
            self.level = alpha * x + (1 - alpha) * (self.level + phi * self.trend)
            self.trend = beta * (self.level - prev) + (1 - beta) * phi * self.trend
        recent = errors[-20:]
        self.sd = math.sqrt(mean(e * e for e in recent)) if recent else 0.0

    def predict(self, h: int) -> float:
        return self.level + self.trend * sum(self.phi**i for i in range(1, h + 1))


def fit_holt(series: list[float], params: Optional[dict] = None) -> Holt:
    p = params or FORECAST_MODEL["params"]
    return Holt(series, p["alpha"], p["beta"], p["phi"])


def _erf(x: float) -> float:
    return math.erf(x)


def expected_excess(mu: float, sd: float, threshold: float) -> float:
    """E[max(0, X − threshold)] for X ~ Normal(mu, sd): expected overtime."""
    if sd < 1e-6:
        return max(0.0, mu - threshold)
    z = (mu - threshold) / sd
    pdf = math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)
    cdf = 0.5 * (1 + _erf(z / math.sqrt(2)))
    return sd * pdf + (mu - threshold) * cdf


def forecast_employee(tl: EmployeeTimeline, expected_hours: float, working_days: list[str], end_date: Optional[str] = None, horizon: int = 7) -> dict:
    history = [r for r in tl.records if end_date is None or r["date"] <= end_date]
    workdays = [r for r in history if is_workday(r)]
    if len(workdays) < MIN_FORECAST_WORKDAYS:
        raise InsufficientHistory(f"Needs at least {MIN_FORECAST_WORKDAYS} recorded workdays to forecast; found {len(workdays)}.")

    hours_model = fit_holt([r["working_hours"] for r in workdays])
    break_series = [r["break_count"] for r in workdays if r["break_count"] is not None]
    breaks_model = fit_holt(break_series) if len(break_series) >= 3 else None
    recent = workdays[-10:]
    late_vals = [r["late_night_sessions"] for r in recent if r["late_night_sessions"] is not None]
    late_rate = mean(late_vals) or 0.0

    rest = [r for r in history if not r["scheduled_workday"] and r["data_completeness"] != "missing"][-8:]
    worked_rest = [r for r in rest if (r["working_hours"] or 0) > 0]
    rest_probability = (len(worked_rest) + 0.5) / (len(rest) + 1)
    rest_hours = mean(r["working_hours"] for r in history if not r["scheduled_workday"] and (r["working_hours"] or 0) > 0) or 3.5

    last_date = history[-1]["date"]
    sd = max(hours_model.sd, 0.3)
    step = 0
    days = []
    for i in range(1, horizon + 1):
        d = add_days(last_date, i)
        scheduled = WEEKDAY_CODES[_weekday(d)] in working_days
        if not scheduled:
            exp = rest_probability * rest_hours
            days.append({"date": d, "isWeekend": True, "workProbability": rnd(rest_probability, 3), "hours": rnd(rest_hours, 2), "expectedHours": rnd(exp, 2),
                         "lower": None, "upper": None, "overtime": rnd(exp, 2), "breaks": None, "lateNight": 0})
            continue
        step += 1
        h = clamp(hours_model.predict(step), 4, 14)
        spread = Z_80 * sd * math.sqrt(step)
        days.append({"date": d, "isWeekend": False, "workProbability": 1, "hours": rnd(h, 2), "expectedHours": rnd(h, 2),
                     "lower": rnd(clamp(h - spread, 4, 14), 2), "upper": rnd(clamp(h + spread, 4, 16), 2),
                     "overtime": rnd(expected_excess(h, sd, expected_hours), 2),
                     "breaks": rnd(clamp(breaks_model.predict(step), 0, 8), 2) if breaks_model else None,
                     "lateNight": rnd(late_rate, 3)})

    predicted = [d for d in days if not d["isWeekend"]]
    pred_avg = mean(d["hours"] for d in predicted)
    recent_avg = mean(r["working_hours"] for r in recent)
    change = (pred_avg - recent_avg) if pred_avg is not None and recent_avg is not None else 0.0
    return {
        "days": days,
        "summary": {
            "predictedAvgHours": rnd(pred_avg, 2),
            "recentAvgHours": rnd(recent_avg, 2),
            "change": rnd(change, 2),
            "trend": "rising" if change > 0.25 else "easing" if change < -0.25 else "steady",
            "predictedOvertime": rnd(total(d["overtime"] for d in days), 1),
            "predictedBreaks": rnd(mean(d["breaks"] for d in predicted), 2),
            "expectedWeekendDays": rnd(total(d["workProbability"] for d in days if d["isWeekend"]), 2),
            "expectedLateNights": rnd(total(d["lateNight"] for d in days), 1),
            "residualSd": rnd(hours_model.sd, 2),
            "dailyTrend": rnd(hours_model.trend, 3),
        },
    }


def _weekday(iso_date: str) -> int:
    from app.utils.helpers import to_date

    return to_date(iso_date).weekday()


def backtest(items: list[tuple], horizon: int = 7, origins=(7, 14, 21)) -> dict:
    """Rolling back-test. items = [(timeline, expected_hours, working_days)]."""
    model_err, naive_err = [], []
    for offset in origins:
        for tl, expected, wd in items:
            if len(tl.records) <= offset:
                continue
            cut = tl.records[-offset - 1]["date"]
            try:
                fc = forecast_employee(tl, expected, wd, end_date=cut, horizon=horizon)
            except InsufficientHistory:
                continue
            past = [r for r in tl.records if r["date"] <= cut and is_workday(r)][-10:]
            naive = mean(r["working_hours"] for r in past)
            for d in fc["days"]:
                actual = tl.by_date.get(d["date"])
                if d["isWeekend"] or not actual or not is_workday(actual):
                    continue
                model_err.append(abs(actual["working_hours"] - d["hours"]))
                naive_err.append(abs(actual["working_hours"] - naive))
    return {"window": horizon, "origins": len(origins), "samples": len(model_err), "maeHours": rnd(mean(model_err), 2), "naiveMaeHours": rnd(mean(naive_err), 2)}
