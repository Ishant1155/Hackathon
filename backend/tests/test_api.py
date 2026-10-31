import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_trained" in data


def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_simulated_employees" in data
    assert data["total_simulated_employees"] >= 100
    assert "requiring_review" in data
    assert "risk_distribution" in data


def test_employees_list():
    response = client.get("/api/employees?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 10
    assert data["total"] >= 100


def test_employee_detail_emp001():
    response = client.get("/api/employees/EMP-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "EMP-001"
    assert "contributing_factors" in data
    assert "recommendations" in data
    assert len(data["records"]) == 30


def test_employee_detail_not_found():
    response = client.get("/api/employees/EMP-99999")
    assert response.status_code == 404


def test_simulation_run_pipeline():
    payload = {
        "daily_working_hours": 13.5,
        "break_count": 1,
        "avg_break_duration": 10.0,
        "late_night_sessions_per_week": 5,
        "weekend_days_per_month": 4,
        "task_completion_trend": -30.0,
        "consecutive_extended_days": 5,
        "observation_days": 14
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_simulated"] is True
    assert "overall_risk_score" in data
    assert data["overall_risk_score"] >= 50.0
    assert "comparison_table" in data
    assert len(data["daily_timeline"]) == 14


def test_alert_lifecycle():
    # Fetch alerts
    response = client.get("/api/alerts")
    assert response.status_code == 200
    alerts = response.json()["items"]
    assert len(alerts) > 0

    first_alert_id = alerts[0]["id"]

    # Patch alert
    patch_payload = {
        "status": "Under Review",
        "reviewer_notes": "Reviewed with team lead. Workload redistribution in progress.",
        "follow_up_date": "2026-11-15",
        "follow_up_completed": False
    }
    patch_res = client.patch(f"/api/alerts/{first_alert_id}", json=patch_payload)
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "Under Review"
    assert "workload redistribution" in updated["reviewer_notes"].lower()

    # Check history audit trail
    hist_res = client.get(f"/api/alerts/{first_alert_id}/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) > 0
