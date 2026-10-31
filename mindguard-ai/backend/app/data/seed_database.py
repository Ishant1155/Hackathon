"""Load the generated CSV files into SQLite without creating duplicates.

Employees are upserted by employee_id, activity by (employee_id, date)
and labels by employee_id, so the script can run any number of times.

Run:  python -m app.data.seed_database
"""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.core import config
from app.data.generator import read_csv
from app.database import connection
from app.database.init_db import init_db
from app.database.models import DailyActivity, Employee, SimulationLabel
from app.utils.helpers import parse_bool, parse_datetime, parse_optional_float, parse_optional_int

FLOAT_COLS = ["working_hours", "average_break_minutes", "productivity_score", "overtime_hours"]
INT_COLS = ["break_count", "total_break_minutes", "late_night_sessions", "night_activity_minutes", "tasks_assigned", "tasks_completed", "tasks_pending", "meetings_count", "meeting_minutes"]


def _activity_values(row: dict) -> dict:
    values = {"employee_id": row["employee_id"], "date": date.fromisoformat(row["date"])}
    for c in FLOAT_COLS:
        values[c] = parse_optional_float(row.get(c))
    for c in INT_COLS:
        values[c] = parse_optional_int(row.get(c))
    values["login_datetime"] = parse_datetime(row.get("login_datetime"))
    values["logout_datetime"] = parse_datetime(row.get("logout_datetime"))
    values["weekend_work"] = None if row.get("weekend_work") in (None, "") else parse_bool(row["weekend_work"])
    values["scheduled_workday"] = parse_bool(row.get("scheduled_workday"))
    values["planned_leave"] = parse_bool(row.get("planned_leave"))
    values["data_completeness"] = row.get("data_completeness") or "complete"
    return values


def seed(dataset_dir: Path = config.DATASET_DIR, verbose: bool = True) -> dict:
    init_db()
    employees = read_csv(dataset_dir / "employees.csv")
    activity = read_csv(dataset_dir / "employee_activity.csv")
    labels_path = dataset_dir / "simulation_labels.csv"
    labels = read_csv(labels_path) if labels_path.exists() else []
    stats = {"employees_added": 0, "employees_updated": 0, "activity_added": 0, "activity_updated": 0, "labels_added": 0}

    with connection.session_scope() as db:
        existing = {e.employee_id: e for e in db.scalars(select(Employee))}
        for row in employees:
            values = {
                "name": row["name"],
                "department": row["department"],
                "designation": row["designation"],
                "work_arrangement": row["work_arrangement"],
                "shift_type": row["shift_type"],
                "expected_hours": float(row["expected_hours"]),
                "working_days": row["working_days"],
                "start_date": date.fromisoformat(row["start_date"]) if row.get("start_date") else None,
            }
            emp = existing.get(row["employee_id"])
            if emp:
                for k, v in values.items():
                    setattr(emp, k, v)
                stats["employees_updated"] += 1
            else:
                db.add(Employee(employee_id=row["employee_id"], **values))
                stats["employees_added"] += 1
        db.flush()

        current = {(a.employee_id, a.date): a for a in db.scalars(select(DailyActivity))}
        for row in activity:
            values = _activity_values(row)
            key = (values["employee_id"], values["date"])
            rec = current.get(key)
            if rec:
                for k, v in values.items():
                    setattr(rec, k, v)
                stats["activity_updated"] += 1
            else:
                rec = DailyActivity(**values)
                db.add(rec)
                current[key] = rec
                stats["activity_added"] += 1

        known_labels = {lab.employee_id: lab for lab in db.scalars(select(SimulationLabel))}
        for row in labels:
            ramp = date.fromisoformat(row["ramp_start_date"]) if row.get("ramp_start_date") else None
            lab = known_labels.get(row["employee_id"])
            if lab:
                lab.simulation_group, lab.ramp_start_date = row["simulation_group"], ramp
            else:
                db.add(SimulationLabel(employee_id=row["employee_id"], simulation_group=row["simulation_group"], ramp_start_date=ramp))
                stats["labels_added"] += 1

    if verbose:
        print(f"Seeded {connection.engine.url}: {stats}")
    return stats


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Seed SQLite from the generated CSV files.")
    parser.add_argument("--dataset", type=Path, default=config.DATASET_DIR)
    args = parser.parse_args(argv)
    seed(args.dataset)


if __name__ == "__main__":
    main()
