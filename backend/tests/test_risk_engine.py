import pytest
from app.services.risk_engine import ExplainableRiskEngine
from app.schemas.analysis import AnomalyResult


def test_risk_engine_healthy_scenario():
    engine = ExplainableRiskEngine()
    features = {
        "avg_hours_7d": 8.0,
        "avg_hours_14d": 8.0,
        "hours_change_ratio": 0.0,
        "late_night_count_14d": 0,
        "weekend_days_count_14d": 0,
        "avg_breaks_7d": 3.0,
        "task_completion_change_ratio": 0.05,
        "consecutive_extended_days": 0,
        "avg_recovery_hours_7d": 15.0,
    }
    anomaly = AnomalyResult(
        is_anomaly=False,
        anomaly_score=0.1,
        raw_decision_score=0.2,
        interpretation="Normal pattern"
    )

    assessment = engine.calculate_risk(features, anomaly, observation_days=30, total_records_available=30)
    assert assessment["overall_risk_score"] < 30.0
    assert assessment["risk_category"] == "Low concern"
    assert len(assessment["contributing_factors"]) == 5


def test_risk_engine_sustained_overwork_scenario():
    engine = ExplainableRiskEngine()
    features = {
        "avg_hours_7d": 13.5,
        "avg_hours_14d": 13.0,
        "hours_change_ratio": 0.65,
        "late_night_count_14d": 7,
        "weekend_days_count_14d": 4,
        "avg_breaks_7d": 0.5,
        "task_completion_change_ratio": -0.35,
        "consecutive_extended_days": 6,
        "avg_recovery_hours_7d": 8.0,
    }
    anomaly = AnomalyResult(
        is_anomaly=True,
        anomaly_score=0.88,
        raw_decision_score=-0.25,
        interpretation="Statistical outlier detected"
    )

    assessment = engine.calculate_risk(features, anomaly, observation_days=30, total_records_available=30)
    assert assessment["overall_risk_score"] >= 60.0
    assert assessment["risk_category"] in ["Elevated concern", "High priority for human review"]
    assert len(assessment["recommendations"]) > 0
    # Must contain actionable organizational recommendation
    assert any("workload" in r.lower() or "break" in r.lower() for r in assessment["recommendations"])
