import pytest
from app.ml.anomaly_detector import AnomalyDetectorService
from app.ml.features import extract_features_from_records


def test_anomaly_detector_training_and_prediction():
    detector = AnomalyDetectorService(contamination=0.10, random_state=42)

    # Synthetic normal samples
    normal_samples = []
    for _ in range(30):
        normal_samples.append({
            "avg_hours_7d": 8.0,
            "avg_hours_14d": 8.0,
            "hours_change_ratio": 0.0,
            "late_night_count_14d": 0,
            "weekend_days_count_14d": 0,
            "avg_breaks_7d": 3.0,
            "avg_break_duration_7d": 15.0,
            "task_completion_change_ratio": 0.0,
            "consecutive_extended_days": 0,
            "avg_recovery_hours_7d": 15.0,
        })

    # Add a couple outliers
    normal_samples.append({
        "avg_hours_7d": 14.5,
        "avg_hours_14d": 14.0,
        "hours_change_ratio": 0.75,
        "late_night_count_14d": 8,
        "weekend_days_count_14d": 4,
        "avg_breaks_7d": 0.5,
        "avg_break_duration_7d": 5.0,
        "task_completion_change_ratio": -0.45,
        "consecutive_extended_days": 7,
        "avg_recovery_hours_7d": 8.0,
    })

    success = detector.fit(normal_samples)
    assert success is True
    assert detector.is_trained is True

    # Test predicting on typical healthy vector
    healthy_pred = detector.predict(normal_samples[0])
    assert "is_anomaly" in healthy_pred
    assert "anomaly_score" in healthy_pred
    assert 0.0 <= healthy_pred["anomaly_score"] <= 1.0


def test_anomaly_detector_handles_unfitted():
    fresh_detector = AnomalyDetectorService()
    fresh_detector.is_trained = False
    fresh_detector.model = None

    dummy = {"avg_hours_7d": 8.0}
    res = fresh_detector.predict(dummy)
    assert res["is_anomaly"] is False
