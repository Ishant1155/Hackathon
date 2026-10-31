"""Synthetic data generation and database seeding."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from sqlalchemy import func, select


def test_generator_default_sizes_and_groups():
    from app.data.generator import generate

    employees, activity, labels = generate(n_employees=100, n_days=30, seed=7)
    assert len(employees) == 100
    assert len(activity) == 3000
    assert Counter(lab["simulation_group"] for lab in labels) == {"healthy": 60, "occasional_overtime": 25, "sustained_overwork": 15}
    assert {e["department"] for e in employees} == {"Engineering", "Marketing", "HR", "Finance", "Operations", "Sales"}


def test_generator_is_reproducible():
    from app.data.generator import generate

    a = generate(n_employees=10, n_days=20, seed=3)
    b = generate(n_employees=10, n_days=20, seed=3)
    assert a == b


def test_labels_are_not_in_employee_profiles():
    from app.data.generator import EMPLOYEE_FIELDS, generate

    employees, _, _ = generate(n_employees=10, n_days=20, seed=1)
    assert "simulation_group" not in EMPLOYEE_FIELDS
    assert all("simulation_group" not in e for e in employees)


def test_timestamps_are_consistent_with_hours():
    from app.data.generator import generate

    _, activity, _ = generate(n_employees=30, n_days=30, seed=11)
    checked = 0
    for r in activity:
        if r["login_datetime"] and r["logout_datetime"] and r["working_hours"] is not None:
            assert isinstance(r["login_datetime"], datetime)
            span_min = (r["logout_datetime"] - r["login_datetime"]).total_seconds() / 60
            work_min = r["working_hours"] * 60 + (r["total_break_minutes"] or 0)
            assert span_min >= work_min - 1
            checked += 1
    assert checked > 500


def test_missing_values_are_none_not_zero():
    from app.data.generator import generate

    _, activity, _ = generate(n_employees=40, n_days=40, seed=5)
    missing = [r for r in activity if r["data_completeness"] == "missing"]
    partial = [r for r in activity if r["data_completeness"] == "partial"]
    assert missing and partial
    assert all(r["working_hours"] is None and r["break_count"] is None for r in missing)
    assert all(any(r[k] is None for k in ("break_count", "productivity_score", "working_hours")) for r in partial)


def test_sustained_group_ramps_up():
    from app.data.generator import generate

    employees, activity, labels = generate(n_employees=60, n_days=60, seed=9)
    group = {lab["employee_id"]: lab["simulation_group"] for lab in labels}
    dates = sorted({r["date"] for r in activity})

    def avg(rows):
        vals = [r["working_hours"] for r in rows if r["working_hours"] and r["scheduled_workday"] and not r["planned_leave"]]
        return sum(vals) / len(vals)

    sustained = [r for r in activity if group[r["employee_id"]] == "sustained_overwork"]
    early = avg([r for r in sustained if r["date"] < dates[14]])
    late = avg([r for r in sustained if r["date"] >= dates[-14]])
    assert late - early > 1.5


def test_seed_twice_creates_no_duplicates(pipeline):
    from app.core import config
    from app.data.seed_database import seed
    from app.database.connection import SessionLocal
    from app.database.models import DailyActivity, Employee, SimulationLabel

    with SessionLocal() as db:
        before = (db.scalar(select(func.count()).select_from(Employee)), db.scalar(select(func.count()).select_from(DailyActivity)))
    stats = seed(config.DATASET_DIR, verbose=False)
    assert stats["employees_added"] == 0 and stats["activity_added"] == 0
    with SessionLocal() as db:
        after = (db.scalar(select(func.count()).select_from(Employee)), db.scalar(select(func.count()).select_from(DailyActivity)))
        assert db.scalar(select(func.count()).select_from(SimulationLabel)) == before[0]
    assert before == after


def test_database_keeps_nulls(pipeline):
    from app.database.connection import SessionLocal
    from app.database.models import DailyActivity

    with SessionLocal() as db:
        rows = db.scalars(select(DailyActivity).where(DailyActivity.data_completeness == "missing")).all()
    assert rows
    assert all(r.working_hours is None for r in rows)
