"""Behavioural feature engineering.

Turns raw daily activity into one feature row per employee per
"as-of" date. Every feature is derived from the generated daily
records only. Missing values stay missing (None / NaN). They are never
treated as zero and never as evidence of healthy behaviour.

Definitions (window = calendar days ending on the as-of date, inclusive)
--------------------------------------------------------------------------
"workday"   scheduled workday, not planned leave, with recorded hours
"observed"  any day whose activity was captured (data_completeness != missing)

avg_hours_7d               mean working_hours over workdays in the last 7 days
avg_hours_30d              same over the last 30 days
hours_vs_expected_7d       avg_hours_7d − the employee's contracted expected_hours
avg_breaks_7d              mean break_count over workdays with a known break count
avg_break_duration_7d      mean average_break_minutes over workdays with breaks
avg_overtime_7d            mean overtime_hours over workdays (hours beyond expected)
night_sessions_7d          sum of late_night_sessions over observed days. Late-night
                           means after 21:00 for day shifts and 23:30 for late
                           shifts. Scheduled night-shift hours never count.
weekend_days_14d           unscheduled days with recorded work in the last 14 days
productivity_change        % change of mean productivity_score, last 7 days vs the
                           7 days before (each side needs 3 known values)
task_completion_rate       tasks_completed / tasks_assigned over the last 7 days
work_variability_7d        population std-dev of working_hours on workdays (≥3)
meeting_hours_7d           sum of meeting_minutes / 60 over observed days
consecutive_overtime_days  most recent run of scheduled workdays with
                           overtime ≥ 0.5 h (stops at the first missing value)
consecutive_workdays       most recent run of calendar days with recorded work

Personal baseline (used by the rule engine, not the model): the
previous 30-day period, i.e. days 30–59 before the as-of date. When
fewer than MIN_BASELINE_WORKDAYS workdays exist there, baseline values
are None and rules fall back to contracted hours or the reference
schedule.

Data sufficiency: a snapshot is "sufficient" when the employee has at
least MIN_HISTORY_DAYS observed days and MIN_RECENT_WORKDAYS workdays
in the last 7 days. Insufficient snapshots are excluded from training.

Run:  python -m app.ml.feature_engineering   (writes dataset/employee_features.csv)
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Optional

from app.core import config
from app.utils.helpers import (
    add_days,
    is_missing,
    mean,
    parse_bool,
    parse_datetime,
    parse_optional_float,
    parse_optional_int,
    pct_change,
    rnd,
    std,
    total,
)

FEATURE_COLUMNS = [
    "avg_hours_7d",
    "avg_hours_30d",
    "hours_vs_expected_7d",
    "avg_breaks_7d",
    "avg_break_duration_7d",
    "avg_overtime_7d",
    "night_sessions_7d",
    "weekend_days_14d",
    "productivity_change",
    "task_completion_rate",
    "work_variability_7d",
    "meeting_hours_7d",
    "consecutive_overtime_days",
    "consecutive_workdays",
]

BASELINE_COLUMNS = [
    "baseline_hours",
    "baseline_breaks",
    "baseline_night_7d",
    "baseline_weekend_14d",
    "baseline_productivity",
    "productivity_7d",
    "productivity_vs_baseline",
]

QUALITY_COLUMNS = ["history_days", "observed_days_7d", "workdays_7d", "baseline_workdays", "data_sufficiency"]

FEATURE_CSV_COLUMNS = ["employee_id", "as_of_date", *FEATURE_COLUMNS, *BASELINE_COLUMNS, *QUALITY_COLUMNS]


# ------------------------------------------------------------- normalising
NUMERIC_FLOAT = ["working_hours", "average_break_minutes", "productivity_score", "overtime_hours"]
NUMERIC_INT = [
    "break_count",
    "total_break_minutes",
    "late_night_sessions",
    "night_activity_minutes",
    "tasks_assigned",
    "tasks_completed",
    "tasks_pending",
    "meetings_count",
    "meeting_minutes",
]


def normalise_record(row: dict) -> dict:
    """Coerce a CSV/DB row into typed values, keeping blanks as None."""
    rec = dict(row)
    rec["date"] = str(row["date"])[:10]
    for key in NUMERIC_FLOAT:
        rec[key] = parse_optional_float(row.get(key))
    for key in NUMERIC_INT:
        rec[key] = parse_optional_int(row.get(key))
    rec["scheduled_workday"] = parse_bool(row.get("scheduled_workday"))
    rec["planned_leave"] = parse_bool(row.get("planned_leave"))
    ww = row.get("weekend_work")
    rec["weekend_work"] = None if ww in (None, "") else parse_bool(ww)
    rec["login_datetime"] = parse_datetime(row.get("login_datetime"))
    rec["logout_datetime"] = parse_datetime(row.get("logout_datetime"))
    rec["data_completeness"] = row.get("data_completeness") or "complete"
    return rec


def is_observed(r: dict) -> bool:
    return r["data_completeness"] != "missing"


def is_workday(r: dict) -> bool:
    return r["scheduled_workday"] and not r["planned_leave"] and not is_missing(r["working_hours"]) and r["working_hours"] > 0


def worked(r: dict) -> Optional[bool]:
    """True/False when known, None when the day was not captured."""
    if not is_observed(r):
        return None
    if r["planned_leave"]:
        return False
    if is_missing(r["working_hours"]):
        return True if r.get("login_datetime") else None
    return r["working_hours"] > 0


# ------------------------------------------------------------- windows
class EmployeeTimeline:
    """Daily records for one employee, indexed by ISO date."""

    def __init__(self, records: Iterable[dict]):
        self.records = sorted((normalise_record(r) if not isinstance(r.get("scheduled_workday"), bool) else r for r in records), key=lambda r: r["date"])
        self.by_date = {r["date"]: r for r in self.records}
        self.first_date = self.records[0]["date"] if self.records else None
        self.last_date = self.records[-1]["date"] if self.records else None

    def window(self, end: str, days: int, offset: int = 0) -> list[dict]:
        """Records in the `days`-day window ending `offset` days before `end`."""
        last = add_days(end, -offset)
        first = add_days(last, -(days - 1))
        return [r for r in self.records if first <= r["date"] <= last]

    def upto(self, end: str) -> list[dict]:
        return [r for r in self.records if r["date"] <= end]


def _workday_values(rows: list[dict], key: str) -> list[float]:
    return [r[key] for r in rows if is_workday(r) and not is_missing(r[key])]


def _night_sessions(rows: list[dict], min_observed: int) -> Optional[float]:
    obs = [r for r in rows if is_observed(r) and not is_missing(r["late_night_sessions"])]
    return float(total(r["late_night_sessions"] for r in obs)) if len(obs) >= min_observed else None


def _weekend_days(rows: list[dict], min_observed: int) -> Optional[float]:
    obs = [r for r in rows if is_observed(r) and r["weekend_work"] is not None]
    return float(sum(1 for r in obs if r["weekend_work"])) if len(obs) >= min_observed else None


def _mean_productivity(rows: list[dict], min_count: int = 3) -> Optional[float]:
    vals = _workday_values(rows, "productivity_score")
    return mean(vals) if len(vals) >= min_count else None


def _consecutive_overtime(tl: EmployeeTimeline, end: str, threshold: float) -> int:
    run = 0
    for r in reversed(tl.upto(end)):
        if not r["scheduled_workday"] or r["planned_leave"]:
            continue  # weekends and leave neither extend nor break the run
        ot = r["overtime_hours"]
        if is_missing(ot):
            break  # unknown day: stop counting instead of assuming
        if ot >= threshold:
            run += 1
        else:
            break
    return run


def _consecutive_workdays(tl: EmployeeTimeline, end: str) -> int:
    run = 0
    for r in reversed(tl.upto(end)):
        w = worked(r)
        if w:
            run += 1
        else:
            break
    return run


def compute_features(tl: EmployeeTimeline, as_of: str, expected_hours: float) -> dict:
    """One feature snapshot for an employee as of `as_of` (inclusive)."""
    w7 = tl.window(as_of, 7)
    w7_prev = tl.window(as_of, 7, offset=7)
    w14 = tl.window(as_of, 14)
    w30 = tl.window(as_of, 30)
    base = tl.window(as_of, 30, offset=30)  # previous 30-day period

    hours7 = _workday_values(w7, "working_hours")
    hours30 = _workday_values(w30, "working_hours")
    breaks7 = _workday_values(w7, "break_count")
    break_dur7 = _workday_values(w7, "average_break_minutes")
    ot7 = _workday_values(w7, "overtime_hours")
    observed7 = [r for r in w7 if is_observed(r)]

    avg_hours_7d = mean(hours7) if len(hours7) >= config.MIN_RECENT_WORKDAYS else None
    prod7 = _mean_productivity(w7)
    prod_prev = _mean_productivity(w7_prev)

    tasks_rows = [r for r in w7 if not is_missing(r["tasks_assigned"]) and not is_missing(r["tasks_completed"]) and r["tasks_assigned"] > 0]
    assigned = total(r["tasks_assigned"] for r in tasks_rows)
    completion = total(r["tasks_completed"] for r in tasks_rows) / assigned if assigned else None

    meeting_rows = [r for r in observed7 if not is_missing(r["meeting_minutes"])]

    # Personal baseline (previous 30-day period)
    base_hours = _workday_values(base, "working_hours")
    base_ok = len(base_hours) >= config.MIN_BASELINE_WORKDAYS
    base_breaks = _workday_values(base, "break_count")
    base_night = _night_sessions(base, 10)
    base_weekend = _weekend_days(base, 10)
    base_prod = _mean_productivity(base, 5)
    base_days = max(1, len([r for r in base if is_observed(r)]))

    history_days = len([r for r in tl.upto(as_of) if is_observed(r)])
    sufficient = history_days >= config.MIN_HISTORY_DAYS and len(hours7) >= config.MIN_RECENT_WORKDAYS

    return {
        "as_of_date": as_of,
        "avg_hours_7d": rnd(avg_hours_7d, 3),
        "avg_hours_30d": rnd(mean(hours30), 3) if len(hours30) >= config.MIN_BASELINE_WORKDAYS else None,
        "hours_vs_expected_7d": rnd(avg_hours_7d - expected_hours, 3) if avg_hours_7d is not None else None,
        "avg_breaks_7d": rnd(mean(breaks7), 3) if len(breaks7) >= config.MIN_RECENT_WORKDAYS else None,
        "avg_break_duration_7d": rnd(mean(break_dur7), 2) if len(break_dur7) >= 2 else None,
        "avg_overtime_7d": rnd(mean(ot7), 3) if len(ot7) >= config.MIN_RECENT_WORKDAYS else None,
        "night_sessions_7d": _night_sessions(w7, 4),
        "weekend_days_14d": _weekend_days(w14, 10),
        "productivity_change": rnd(pct_change(prod7, prod_prev), 2) if prod7 is not None and prod_prev is not None else None,
        "task_completion_rate": rnd(completion, 4),
        "work_variability_7d": rnd(std(hours7, 3), 3),
        "meeting_hours_7d": rnd(total(r["meeting_minutes"] for r in meeting_rows) / 60, 2) if len(meeting_rows) >= 4 else None,
        "consecutive_overtime_days": _consecutive_overtime(tl, as_of, config.OVERTIME_DAY_THRESHOLD),
        "consecutive_workdays": _consecutive_workdays(tl, as_of),
        # Baseline and context (rule engine only)
        "baseline_hours": rnd(mean(base_hours), 3) if base_ok else None,
        "baseline_breaks": rnd(mean(base_breaks), 3) if len(base_breaks) >= config.MIN_BASELINE_WORKDAYS else None,
        "baseline_night_7d": rnd(base_night / base_days * 7, 3) if base_ok and base_night is not None else None,
        "baseline_weekend_14d": rnd(base_weekend / base_days * 14, 3) if base_ok and base_weekend is not None else None,
        "baseline_productivity": rnd(base_prod, 2) if base_ok else None,
        "productivity_7d": rnd(prod7, 2),
        "productivity_vs_baseline": rnd(pct_change(prod7, base_prod), 2) if prod7 is not None and base_prod is not None and base_ok else None,
        "history_days": history_days,
        "observed_days_7d": len(observed7),
        "workdays_7d": len(hours7),
        "baseline_workdays": len(base_hours),
        "data_sufficiency": "sufficient" if sufficient else "insufficient_data",
    }


def build_feature_table(employees: list[dict], activity: list[dict], step: int = 1) -> list[dict]:
    """Feature snapshots for every employee and every `step`-th date."""
    by_emp: dict[str, list[dict]] = defaultdict(list)
    for r in activity:
        by_emp[r["employee_id"]].append(r)
    rows = []
    for emp in employees:
        tl = EmployeeTimeline(by_emp.get(emp["employee_id"], []))
        if not tl.records:
            continue
        expected = float(emp["expected_hours"])
        dates = [r["date"] for r in tl.records]
        for d in dates[::step]:
            feats = compute_features(tl, d, expected)
            rows.append({"employee_id": emp["employee_id"], **feats})
    return rows


def to_dataframe(rows: list[dict]):
    """pandas DataFrame with NaN for missing values (requires pandas)."""
    import pandas as pd

    return pd.DataFrame(rows, columns=FEATURE_CSV_COLUMNS)


def main(argv=None) -> None:
    from app.data.generator import read_csv, write_csv

    parser = argparse.ArgumentParser(description="Build employee_features.csv from the generated activity.")
    parser.add_argument("--dataset", type=Path, default=config.DATASET_DIR)
    parser.add_argument("--describe", action="store_true", help="print summary statistics with pandas")
    args = parser.parse_args(argv)
    employees = read_csv(args.dataset / "employees.csv")
    activity = read_csv(args.dataset / "employee_activity.csv")
    rows = build_feature_table(employees, activity)
    write_csv(args.dataset / "employee_features.csv", rows, FEATURE_CSV_COLUMNS)
    suff = sum(1 for r in rows if r["data_sufficiency"] == "sufficient")
    print(f"Wrote {len(rows)} feature snapshots ({suff} sufficient) to {args.dataset / 'employee_features.csv'}")
    if args.describe:
        df = to_dataframe([r for r in rows if r["data_sufficiency"] == "sufficient"])
        print(df[FEATURE_COLUMNS].describe().T.round(2).to_string())
        print("\nMissing values per feature (kept as NaN, never zero):")
        print(df[FEATURE_COLUMNS].isna().sum().to_string())


if __name__ == "__main__":
    main()
