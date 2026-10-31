"""Explainable behavioural indicator engine (rule-based).

This is deliberately independent from the Isolation Forest model:
- the ML model says whether a pattern is *unusual*;
- this engine says *which understandable behaviours* changed, and by how much.

The anomaly prediction is never converted into an indicator score.

Rules compare each employee with their own personal baseline wherever
enough history exists (previous 30-day period), otherwise with their
contracted hours or the reference schedule. Scheduled night-shift hours
are never counted as late-night activity (handled in the features).

Missing values are "unknown": they add no points but are reported, and
too many unknowns (or too little history) produce `insufficient_data`
instead of a score. Missing data is never read as healthy behaviour.

All thresholds live in app.core.config.IndicatorRules. They are
illustrative demonstration assumptions, not validated medical or
psychological thresholds.
"""

from __future__ import annotations

from typing import Optional

from app.core.config import RULES, IndicatorRules
from app.utils.helpers import is_missing, rnd

LEVEL_LABELS = {"low": "Low", "moderate": "Moderate", "elevated": "Elevated", "insufficient_data": "Insufficient data"}

# Keys match the frontend Simulation Lab slider keys.
FACTOR_KEYS = ["avgWorkingHours", "dailyBreaks", "lateNightSessions", "productivityChange", "weekendDays"]

DISCLAIMER = (
    "Illustrative demo score. The rules and thresholds are demonstration assumptions, not validated medical or "
    "psychological thresholds, and must not be used to assess any individual."
)


def level_for(score: Optional[int], rules: IndicatorRules = RULES) -> str:
    if score is None:
        return "insufficient_data"
    if score >= rules.elevated_threshold:
        return "elevated"
    if score >= rules.moderate_threshold:
        return "moderate"
    return "low"


def _factor(key, label, value, unit, points, max_points, explanation, status=None, baseline=None, reference=None):
    status = status or ("contributing" if points > 0 else "neutral")
    return {
        # Frontend fields
        "key": key,
        "label": label,
        "value": value,
        "unit": unit,
        "points": points,
        "maxPoints": max_points,
        "status": status,
        "explanation": explanation,
        # API-spec aliases
        "factor": label,
        "contribution": points,
        "observed_value": value,
        "baseline_value": baseline,
        "reference_value": reference,
    }


def _unknown(key, label, unit, max_points, what):
    return _factor(key, label, None, unit, 0, max_points, f"Not enough recorded {what} to assess this factor.", status="unknown")


# ----------------------------------------------------------------- factors
def _hours_factor(avg_hours, expected, baseline, rules):
    if is_missing(avg_hours):
        return _unknown("avgWorkingHours", "Extended working hours", "h / day", rules.hours_points, "working hours")
    over_expected = avg_hours - expected
    over_baseline = None if is_missing(baseline) else avg_hours - baseline
    flagged = (over_expected >= rules.hours_over_expected and (over_baseline is None or over_baseline >= rules.hours_over_baseline)) or (
        over_expected >= rules.hours_sustained_over_expected
    )
    v = rnd(avg_hours, 1)
    if flagged:
        if over_baseline is not None and over_baseline >= rules.hours_over_baseline:
            why = f"{v} h/day is {rnd(over_baseline, 1)} h above this person's baseline of {rnd(baseline, 1)} h and {rnd(over_expected, 1)} h above their contracted {expected:g} h."
        else:
            why = f"{v} h/day is {rnd(over_expected, 1)} h above the contracted {expected:g} h, a sustained long-hours pattern."
    else:
        ref = f"baseline of {rnd(baseline, 1)} h" if over_baseline is not None else f"contracted {expected:g} h"
        why = f"{v} h/day is within the expected range (contracted {expected:g} h; compared with the {ref})."
    return _factor("avgWorkingHours", "Extended working hours", v, "h / day", rules.hours_points if flagged else 0, rules.hours_points, why, baseline=rnd(baseline, 2), reference=expected)


def _breaks_factor(avg_breaks, baseline, rules):
    if is_missing(avg_breaks):
        return _unknown("dailyBreaks", "Low recorded break frequency", "breaks / day", rules.breaks_points, "breaks")
    drop = None if is_missing(baseline) else baseline - avg_breaks
    low = avg_breaks < rules.min_breaks
    dropped = drop is not None and drop >= rules.breaks_drop_from_baseline and avg_breaks < rules.breaks_drop_ceiling
    v = rnd(avg_breaks, 1)
    if low:
        why = f"{v} recorded breaks per workday is below the {rules.min_breaks:g}-break reference."
    elif dropped:
        why = f"Breaks fell from {rnd(baseline, 1)} to {v} per workday compared with this person's baseline."
    else:
        why = f"{v} breaks per workday is within the usual range."
    flagged = low or dropped
    return _factor("dailyBreaks", "Low recorded break frequency", v, "breaks / day", rules.breaks_points if flagged else 0, rules.breaks_points, why, baseline=rnd(baseline, 2), reference=rules.min_breaks)


def _night_factor(sessions_7d, baseline_7d, rules, per="per 7 days"):
    if is_missing(sessions_7d):
        return _unknown("lateNightSessions", "Increased late-night activity", per, rules.night_points, "evening activity")
    increase = None if is_missing(baseline_7d) else sessions_7d - baseline_7d
    flagged = sessions_7d >= rules.min_night_sessions_7d and (increase is None or increase >= rules.night_over_baseline_7d)
    v = rnd(sessions_7d, 1)
    if flagged:
        base_txt = f", up from about {rnd(baseline_7d, 1)} in the baseline period" if increase is not None else ""
        why = f"{v:g} work sessions after the late-night cut-off in the last 7 days{base_txt}. Scheduled night shifts are not counted."
    elif sessions_7d >= rules.min_night_sessions_7d:
        why = f"{v:g} late sessions in 7 days, similar to this person's usual pattern ({rnd(baseline_7d, 1)})."
    else:
        why = f"{v:g} late-night sessions in the last 7 days; evenings appear protected."
    return _factor("lateNightSessions", "Increased late-night activity", v, per, rules.night_points if flagged else 0, rules.night_points, why, baseline=rnd(baseline_7d, 2), reference=rules.min_night_sessions_7d)


def _productivity_factor(change_pct, compared_with, rules):
    if is_missing(change_pct):
        return _unknown("productivityChange", "Significant productivity decline", "% change", rules.productivity_points, "productivity scores")
    flagged = change_pct <= -rules.productivity_decline_pct
    v = rnd(change_pct, 1)
    if flagged:
        why = f"Productivity is {abs(v):g}% lower than {compared_with}. Check whether workload or task complexity has changed; this is not a performance judgement."
    else:
        why = f"Productivity changed by {v:+g}% compared with {compared_with}, within the usual range."
    return _factor("productivityChange", "Significant productivity decline", v, "% change", rules.productivity_points if flagged else 0, rules.productivity_points, why, reference=-rules.productivity_decline_pct)


def _weekend_factor(days_14d, baseline_14d, rules, unit="days / 14 days"):
    if is_missing(days_14d):
        return _unknown("weekendDays", "Increased weekend activity", unit, rules.weekend_points, "weekend activity")
    increase = None if is_missing(baseline_14d) else days_14d - baseline_14d
    flagged = days_14d >= rules.min_weekend_days_14d and (increase is None or increase >= rules.weekend_over_baseline_14d)
    v = rnd(days_14d, 1)
    if flagged:
        base_txt = f", up from about {rnd(baseline_14d, 1)} usually" if increase is not None else ""
        why = f"Work recorded on {v:g} non-scheduled days in the last 14 days{base_txt}."
    else:
        why = f"{v:g} non-scheduled days worked in the last 14 days, within the usual range."
    return _factor("weekendDays", "Increased weekend activity", v, unit, rules.weekend_points if flagged else 0, rules.weekend_points, why, baseline=rnd(baseline_14d, 2), reference=rules.min_weekend_days_14d)


# --------------------------------------------------------------- summaries
def _summary(level: str, factors: list[dict], simulation: bool) -> str:
    drivers = [f["label"].lower() for f in sorted(factors, key=lambda f: -f["points"]) if f["points"] > 0][:2]
    text = " and ".join(drivers)
    subject = "this hypothetical scenario" if simulation else "the recent pattern"
    if level == "insufficient_data":
        return "There is not enough recorded activity to calculate an indicator. Missing data is not treated as a healthy pattern."
    if level == "elevated":
        return f"Several behaviours in {subject} differ from the expected pattern, mainly {text}. This may warrant a supportive conversation about workload, not a judgement about the person."
    if level == "moderate":
        return f"Some behaviours in {subject} differ from the expected pattern, mainly {text}. A light-touch check-in about priorities could help."
    if drivers:
        return f"{subject[0].upper() + subject[1:]} is close to the expected pattern. {text[0].upper() + text[1:]} adds a little, but not enough to suggest sustained overwork."
    return f"{subject[0].upper() + subject[1:]} matches the expected pattern. No factors add to the score."


def _result(factors: list[dict], sufficiency: str, rules: IndicatorRules, simulation: bool = False) -> dict:
    factors = sorted(factors, key=lambda f: (-f["points"], FACTOR_KEYS.index(f["key"])))
    unknown = [f for f in factors if f["status"] == "unknown"]
    if sufficiency != "sufficient" or len(unknown) > rules.max_unknown_factors:
        sufficiency = "insufficient_data"
        score = None
    else:
        score = int(min(rules.max_score, sum(f["points"] for f in factors)))
    level = level_for(score, rules)
    return {
        # API-spec fields
        "indicator_score": score,
        "indicator_level": LEVEL_LABELS[level],
        "contributing_factors": [f for f in factors if f["points"] > 0],
        "data_sufficiency": sufficiency,
        "unknown_factors": [f["key"] for f in unknown],
        # Frontend fields
        "score": score,
        "level": level,
        "levelLabel": LEVEL_LABELS[level],
        "factors": factors,
        "summary": _summary(level, factors, simulation),
        "thresholds": {"moderate": rules.moderate_threshold, "elevated": rules.elevated_threshold},
        "disclaimer": DISCLAIMER,
    }


def evaluate_features(features: dict, expected_hours: float, rules: IndicatorRules = RULES) -> dict:
    """Score one employee feature snapshot against their personal baseline."""
    prod = features.get("productivity_vs_baseline")
    compared = "this person's baseline period"
    if is_missing(prod):
        prod = features.get("productivity_change")
        compared = "the previous 7 days"
    factors = [
        _hours_factor(features.get("avg_hours_7d"), expected_hours, features.get("baseline_hours"), rules),
        _breaks_factor(features.get("avg_breaks_7d"), features.get("baseline_breaks"), rules),
        _night_factor(features.get("night_sessions_7d"), features.get("baseline_night_7d"), rules),
        _productivity_factor(prod, compared, rules),
        _weekend_factor(features.get("weekend_days_14d"), features.get("baseline_weekend_14d"), rules),
    ]
    return _result(factors, features.get("data_sufficiency", "insufficient_data"), rules)


def evaluate_scenario(inputs: dict, rules: IndicatorRules = RULES) -> dict:
    """Score hypothetical Simulation Lab inputs with the same rules.

    inputs (validated by the schema):
        avgWorkingHours     h per scheduled day
        dailyBreaks         breaks per day
        lateNightSessions   per week
        weekendDays         non-scheduled days worked per week
        productivityChange  % vs baseline
    There is no personal baseline for a hypothetical person, so the
    reference schedule (8 h, 3 breaks) is used.
    """
    factors = [
        _hours_factor(inputs["avgWorkingHours"], rules.reference_hours, None, rules),
        _breaks_factor(inputs["dailyBreaks"], rules.reference_breaks, rules),
        _night_factor(inputs["lateNightSessions"], None, rules, per="per week"),
        _productivity_factor(inputs["productivityChange"], "the baseline", rules),
        _weekend_factor(inputs["weekendDays"] * 2, None, rules, unit="days / 14 days"),
    ]
    # Report the weekend factor in the slider's own unit.
    for f in factors:
        if f["key"] == "weekendDays":
            f["value"] = rnd(inputs["weekendDays"], 1)
            f["observed_value"] = f["value"]
            f["unit"] = "days / week"
    result = _result(factors, "sufficient", rules, simulation=True)
    result["is_simulation"] = True
    return result


def rules_table(rules: IndicatorRules = RULES) -> list[dict]:
    """Human-readable rule list for the Simulation Lab 'How the score works' table."""
    return [
        {"key": "avgWorkingHours", "label": "Extended working hours", "points": rules.hours_points,
         "rule": f"≥ {rules.hours_over_expected:g} h/day above contracted hours and ≥ {rules.hours_over_baseline:g} h above personal baseline (or ≥ {rules.hours_sustained_over_expected:g} h above contracted hours)"},
        {"key": "dailyBreaks", "label": "Low recorded break frequency", "points": rules.breaks_points,
         "rule": f"fewer than {rules.min_breaks:g} breaks per workday, or {rules.breaks_drop_from_baseline:g}+ fewer than baseline"},
        {"key": "lateNightSessions", "label": "Increased late-night activity", "points": rules.night_points,
         "rule": f"{rules.min_night_sessions_7d:g}+ sessions after the late-night cut-off in 7 days, and {rules.night_over_baseline_7d:g}+ above baseline"},
        {"key": "productivityChange", "label": "Significant productivity decline", "points": rules.productivity_points,
         "rule": f"productivity {rules.productivity_decline_pct:g}% or more below baseline"},
        {"key": "weekendDays", "label": "Increased weekend activity", "points": rules.weekend_points,
         "rule": f"{rules.min_weekend_days_14d:g}+ non-scheduled days worked in 14 days, and {rules.weekend_over_baseline_14d:g}+ above baseline"},
    ]
