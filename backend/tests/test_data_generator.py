import pytest
from app.services.data_generator import generate_synthetic_dataset


def test_synthetic_data_generation_counts():
    employees, records = generate_synthetic_dataset(employee_count=100, days=30, seed=42)
    assert len(employees) == 100
    assert len(records) == 3000


def test_demonstration_profiles_exist():
    employees, records = generate_synthetic_dataset(employee_count=100, days=30, seed=42)
    emp_map = {e["id"]: e for e in employees}

    assert "EMP-001" in emp_map
    assert emp_map["EMP-001"]["profile_type"] == "HEALTHY_DEMO"

    assert "EMP-002" in emp_map
    assert emp_map["EMP-002"]["profile_type"] == "OVERTIME_DEMO"

    assert "EMP-003" in emp_map
    assert emp_map["EMP-003"]["profile_type"] == "OVERWORK_DEMO"


def test_records_contain_required_fields():
    employees, records = generate_synthetic_dataset(employee_count=10, days=5, seed=42)
    first_record = records[0]

    required_keys = [
        "employee_id",
        "record_date",
        "day_of_week",
        "work_start_time",
        "work_end_time",
        "working_hours",
        "break_count",
        "avg_break_duration",
        "late_night_active",
        "weekend_work",
        "tasks_completed",
        "task_completion_trend",
        "workload_indicator",
        "recovery_hours",
    ]
    for key in required_keys:
        assert key in first_record
