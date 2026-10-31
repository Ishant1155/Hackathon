"""Feature engineering, indicator rules, recommendations and the anomaly model."""

from __future__ import annotations

import random
from datetime import date, timedelta

import pytest

from app.ml.feature_engineering import EmployeeTimeline, compute_features
from app.services.recommendation import generate_recommendations
from app.services.risk_engine import evaluate_features, evaluate_scenario

START = date(2026, 9, 1)


def day(i, hours=8.0, breaks=3, late=0, productivity=80.0, scheduled=None, leave=False, completeness="complete", overtime=None, meeting=60):
    d = START + timedelta(days=i)
    scheduled = d.weekday() < 5 if scheduled is None else scheduled
    return {
        "employee_id": "T-1",
        "date": d.isoformat(),
        "login_datetime": None,
        "logout_datetime": None,
        "working_hours": hours,
        "break_count": breaks,
        "total_break_minutes": None if breaks is None else breaks * 15,
        "average_break_minutes": 15.0 if breaks else None,
        "late_night_sessions": late,
        "night_activity_minutes": late * 40 if late is not None else None,
        "weekend_work": (not scheduled and bool(hours)) if hours is not None else None,
        "tasks_assigned": 6,
        "tasks_completed": 5,
        "tasks_pending": 1,
        "productivity_score": productivity if scheduled else None,
        "meetings_count": 2,
        "meeting_minutes": meeting,
        "overtime_hours": overtime if overtime is not None else (None if hours is None else max(0.0, hours - 8) if scheduled else hours),
        "scheduled_workday": scheduled,
        "planned_leave": leave,
        "data_completeness": completeness,
    }


def steady_history(n=60):
    rows = []
    for i in range(n):
        d = START + timedelta(days=i)
        rows.append(day(i) if d.weekday() < 5 else day(i, hours=0.0, breaks=0, productivity=None))
    return rows


def as_of(n=60):
    return (START + timedelta(days=n - 1)).isoformat()


# ------------------------------------------------------------ features
def test_features_steady_pattern():
    f = compute_features(EmployeeTimeline(steady_history()), as_of(), 8.0)
    assert f["data_sufficiency"] == "sufficient"
    assert f["avg_hours_7d"] == pytest.approx(8.0)
    assert f["avg_breaks_7d"] == pytest.approx(3.0)
    assert f["night_sessions_7d"] == 0
    assert f["weekend_days_14d"] == 0
    assert f["productivity_change"] == pytest.approx(0.0)
    assert f["consecutive_overtime_days"] == 0
    assert f["baseline_hours"] == pytest.approx(8.0)


def test_missing_values_are_not_zero():
    rows = steady_history()
    for r in rows[-7:]:
        if r["scheduled_workday"]:
            r["break_count"] = None
    f = compute_features(EmployeeTimeline(rows), as_of(), 8.0)
    assert f["avg_breaks_7d"] is None  # unknown, not 0 breaks


def test_insufficient_history():
    f = compute_features(EmployeeTimeline(steady_history(9)), as_of(9), 8.0)
    assert f["data_sufficiency"] == "insufficient_data"
    result = evaluate_features(f, 8.0)
    assert result["indicator_score"] is None
    assert result["data_sufficiency"] == "insufficient_data"
    assert result["indicator_level"] == "Insufficient data"


def test_mostly_missing_recent_data_is_insufficient():
    rows = steady_history()
    for r in rows[-7:]:
        for k in ("working_hours", "break_count", "late_night_sessions", "productivity_score", "overtime_hours", "weekend_work"):
            r[k] = None
        r["data_completeness"] = "missing"
    result = evaluate_features(compute_features(EmployeeTimeline(rows), as_of(), 8.0), 8.0)
    assert result["indicator_score"] is None


def test_consecutive_overtime_and_workdays():
    rows = steady_history()
    for r in rows[-10:]:
        if r["scheduled_workday"]:
            r["working_hours"], r["overtime_hours"] = 10.0, 2.0
    f = compute_features(EmployeeTimeline(rows), as_of(), 8.0)
    weekdays_in_last_10 = sum(1 for r in rows[-10:] if r["scheduled_workday"])
    assert f["consecutive_overtime_days"] == weekdays_in_last_10
    assert f["consecutive_workdays"] >= 1


def test_productivity_change_compares_consecutive_weeks():
    rows = steady_history()
    for r in rows[-7:]:
        if r["scheduled_workday"]:
            r["productivity_score"] = 60.0
    f = compute_features(EmployeeTimeline(rows), as_of(), 8.0)
    assert f["productivity_change"] == pytest.approx(-25.0)


# --------------------------------------------------------------- rules
def overworked_history():
    rows = steady_history()
    for r in rows[-14:]:
        if r["scheduled_workday"]:
            r.update(working_hours=11.0, overtime_hours=3.0, break_count=1, late_night_sessions=1, productivity_score=62.0)
        else:
            r.update(working_hours=4.0, overtime_hours=4.0, weekend_work=True, break_count=0)
    return rows


def test_indicator_all_factors_elevated():
    result = evaluate_features(compute_features(EmployeeTimeline(overworked_history()), as_of(), 8.0), 8.0)
    keys = {f["key"] for f in result["contributing_factors"]}
    assert keys == {"avgWorkingHours", "dailyBreaks", "lateNightSessions", "productivityChange", "weekendDays"}
    assert result["indicator_score"] == 100
    assert result["indicator_level"] == "Elevated"
    for f in result["contributing_factors"]:
        assert f["contribution"] == f["points"] > 0
        assert f["explanation"]


def test_indicator_steady_is_low():
    result = evaluate_features(compute_features(EmployeeTimeline(steady_history()), as_of(), 8.0), 8.0)
    assert result["indicator_score"] == 0
    assert result["indicator_level"] == "Low"
    assert result["contributing_factors"] == []


def test_scheduled_night_shift_is_not_late_night_activity():
    # A night-shift worker's scheduled hours are recorded with late_night_sessions = 0 by the generator.
    from app.data.generator import generate

    employees, activity, _ = generate(n_employees=100, n_days=30, seed=42)
    night = {e["employee_id"] for e in employees if e["shift_type"] == "night"}
    assert night
    assert all(r["late_night_sessions"] in (0, None) for r in activity if r["employee_id"] in night)


def test_long_baseline_is_not_flagged_without_change():
    rows = steady_history()
    for r in rows:
        if r["scheduled_workday"]:
            r.update(working_hours=9.6, overtime_hours=1.6)
    result = evaluate_features(compute_features(EmployeeTimeline(rows), as_of(), 8.0), 8.0)
    hours = next(f for f in result["factors"] if f["key"] == "avgWorkingHours")
    assert hours["points"] == 0  # 1.6 h over contract but unchanged from personal baseline


def test_level_thresholds():
    from app.services.risk_engine import level_for

    assert level_for(0) == "low" and level_for(29) == "low"
    assert level_for(30) == "moderate" and level_for(59) == "moderate"
    assert level_for(60) == "elevated" and level_for(100) == "elevated"
    assert level_for(None) == "insufficient_data"


def test_scenario_matches_reference():
    healthy = evaluate_scenario({"avgWorkingHours": 8, "dailyBreaks": 3, "lateNightSessions": 0, "weekendDays": 0, "productivityChange": 0})
    assert healthy["indicator_score"] == 0 and healthy["is_simulation"] is True
    heavy = evaluate_scenario({"avgWorkingHours": 10.5, "dailyBreaks": 1, "lateNightSessions": 4, "weekendDays": 3, "productivityChange": -15})
    assert heavy["indicator_score"] == 100 and heavy["indicator_level"] == "Elevated"
    partial = evaluate_scenario({"avgWorkingHours": 10, "dailyBreaks": 3, "lateNightSessions": 0, "weekendDays": 0, "productivityChange": 0})
    assert partial["indicator_score"] == 25 and partial["indicator_level"] == "Low"


# ------------------------------------------------------- recommendations
MEDICAL_WORDS = ("burnout", "depress", "anxiety", "diagnos", "mental", "illness", "disorder", "stress")


def test_recommendations_follow_detected_factors():
    result = evaluate_scenario({"avgWorkingHours": 8, "dailyBreaks": 1, "lateNightSessions": 0, "weekendDays": 0, "productivityChange": 0})
    recs = generate_recommendations(result)
    keys = [r["key"] for r in recs]
    assert keys == ["dailyBreaks"]
    assert recs[0]["recommendation"] == "Encourage regular protected breaks."


def test_recommendations_never_medical():
    heavy = evaluate_scenario({"avgWorkingHours": 12, "dailyBreaks": 0, "lateNightSessions": 6, "weekendDays": 2, "productivityChange": -30})
    text = " ".join(f"{r['recommendation']} {r['rationale']} {' '.join(r['actions'])}" for r in generate_recommendations(heavy)).lower()
    assert not any(w in text for w in MEDICAL_WORDS)


def test_recommendations_for_insufficient_data():
    f = compute_features(EmployeeTimeline(steady_history(5)), as_of(5), 8.0)
    recs = generate_recommendations(evaluate_features(f, 8.0))
    assert recs[0]["key"] == "data"


# --------------------------------------------------------- anomaly model
def _normal_rows(n, rng):
    return [
        {
            "avg_hours_7d": rng.gauss(8.1, 0.3),
            "hours_vs_expected_7d": rng.gauss(0.1, 0.3),
            "avg_breaks_7d": rng.gauss(3.4, 0.4),
            "avg_overtime_7d": abs(rng.gauss(0.2, 0.15)),
            "night_sessions_7d": rng.choice([0, 0, 0, 1]),
            "weekend_days_14d": rng.choice([0, 0, 0, 1]),
            "productivity_change": rng.gauss(0, 4),
            "work_variability_7d": abs(rng.gauss(0.45, 0.1)),
            "meeting_hours_7d": rng.gauss(7, 2),
            "consecutive_overtime_days": rng.choice([0, 0, 1]),
        }
        for _ in range(n)
    ]


def test_anomaly_detector_flags_outlier_and_handles_missing(tmp_path):
    from app.ml.anomaly_detector import AnomalyDetector

    rng = random.Random(0)
    det = AnomalyDetector.train(_normal_rows(300, rng))
    outlier = {"avg_hours_7d": 11.5, "hours_vs_expected_7d": 3.5, "avg_breaks_7d": 0.5, "avg_overtime_7d": 3.5, "night_sessions_7d": 4,
               "weekend_days_14d": 4, "productivity_change": -20, "work_variability_7d": 0.6, "meeting_hours_7d": 12, "consecutive_overtime_days": 12}
    normal = _normal_rows(1, random.Random(99))[0]
    partial = {**outlier, "avg_breaks_7d": None, "productivity_change": None}
    out_pred, norm_pred, part_pred = det.predict([outlier, normal, partial])
    assert out_pred["prediction"] == -1 and out_pred["detected"] is True
    assert norm_pred["prediction"] == 1
    assert out_pred["anomalyScore"] > norm_pred["anomalyScore"]
    assert part_pred["missingInputs"] == ["avg_breaks_7d", "productivity_change"]
    assert out_pred["drivers"]

    path = det.save(tmp_path / "m.pkl")
    again = AnomalyDetector.load(path)
    assert again.feature_columns == det.feature_columns
    assert again.predict([outlier])[0]["prediction"] == -1


def test_model_inputs_exclude_identifiers():
    from app.core.config import MODEL_FEATURES

    for banned in ("employee_id", "name", "department", "date", "as_of_date", "simulation_group"):
        assert banned not in MODEL_FEATURES


def test_training_report_uses_held_out_employees(pipeline):
    ev = pipeline["report"]["evaluation"]
    assert ev["test_employees"] > 0 and ev["train_employees"] > 0
    assert ev["test_snapshots"] > 0
    assert pipeline["report"]["limitations"]
