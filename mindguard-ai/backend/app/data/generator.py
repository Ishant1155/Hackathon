"""Synthetic workforce generator for Sisyphus.

Everything here is fictional and generated from a fixed random seed.
No external datasets or real personal data are used.

Outputs (backend/dataset/):
    employees.csv           employee profiles (model-safe, no labels)
    employee_activity.csv   one row per employee per calendar day
    simulation_labels.csv   ground-truth simulation group per employee.
                            Kept separate on purpose: it is only used to
                            evaluate the model and is never a model input.

Run:  python -m app.data.generator [--employees 100] [--days 60] [--seed 42]

The default of 60 days lets the frontend compare the latest 30 days with
the previous 30 (Trends 30-day view, September baseline). Use --days 30
for a 3,000-record dataset; every endpoint still works.
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path

from app.core import config
from app.utils.helpers import clamp, rnd

EMPLOYEE_FIELDS = [
    "employee_id",
    "name",
    "department",
    "designation",
    "work_arrangement",
    "shift_type",
    "expected_hours",
    "working_days",
    "start_date",
]

ACTIVITY_FIELDS = [
    "employee_id",
    "date",
    "login_datetime",
    "logout_datetime",
    "working_hours",
    "break_count",
    "total_break_minutes",
    "average_break_minutes",
    "late_night_sessions",
    "night_activity_minutes",
    "weekend_work",
    "tasks_assigned",
    "tasks_completed",
    "tasks_pending",
    "productivity_score",
    "meetings_count",
    "meeting_minutes",
    "overtime_hours",
    "scheduled_workday",
    "planned_leave",
    "data_completeness",
]

LABEL_FIELDS = ["employee_id", "simulation_group", "ramp_start_date", "synthetic"]

FIRST_NAMES = [
    "Aria", "Tobias", "Priya", "Kenji", "Leila", "Owen", "Sofia", "Rafael", "Hannah", "Marcus", "Ingrid", "Nadia",
    "Elliot", "Mei-Lin", "Samuel", "Clara", "Diego", "Amara", "Felix", "Yuki", "Isabella", "Jonah", "Zara", "Lucas",
    "Noor", "Mateo", "Freya", "Ravi", "Lena", "Omar", "Elise", "Kai", "Tamsin", "Arjun", "Beatriz", "Callum",
    "Dalia", "Emeka", "Fiona", "Gideon", "Hana", "Idris", "Juno", "Kofi", "Lucia", "Milo", "Nia", "Oskar",
    "Paloma", "Quentin", "Rosa", "Silas", "Talia", "Umar", "Vera", "Wren", "Xavier", "Yara", "Zeke", "Anouk",
]
LAST_NAMES = [
    "Castellano", "Lindqvist", "Ramanathan", "Moriyama", "Haddad", "Fairbanks", "Marchetti", "Quintero", "Osei",
    "Bellamy", "Solberg", "Petrova", "Grayson", "Zhao", "Adeyemi", "Whitfield", "Fernandes", "Nwosu", "Brandt",
    "Tanabe", "Moreau", "Whitaker", "Ahmed", "Ferreira", "Okafor", "Varga", "Holloway", "Iyer", "Kowalczyk",
    "Delacroix", "Abernathy", "Sorensen", "Takeda", "Mbeki", "Navarro", "Ellery", "Pemberton", "Rasmussen",
    "Valente", "Achterberg", "Bukowski", "Carrow", "Dunmore", "Esposito", "Falkner", "Greaves", "Halvorsen",
]

DESIGNATIONS = {
    "Engineering": ["Software Engineer", "Senior Software Engineer", "Backend Engineer", "Frontend Engineer", "QA Engineer", "Engineering Manager", "Site Reliability Engineer"],
    "Marketing": ["Marketing Lead", "Content Strategist", "Growth Analyst", "Brand Designer", "Campaign Manager", "SEO Specialist"],
    "HR": ["HR Business Partner", "Talent Acquisition Specialist", "People Operations Coordinator", "Learning & Development Lead", "Payroll Specialist"],
    "Finance": ["Financial Analyst", "Finance Manager", "Accounts Payable Specialist", "FP&A Analyst", "Treasury Analyst"],
    "Operations": ["Operations Manager", "Logistics Coordinator", "Supply Chain Analyst", "Process Improvement Lead", "Facilities Coordinator"],
    "Sales": ["Account Executive", "Sales Development Representative", "Regional Sales Manager", "Customer Success Manager", "Sales Operations Analyst"],
}

WEEKDAY_CODES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Shift definitions: scheduled start (hour) and the hour after which activity
# counts as "late-night" for that shift. Night-shift work is scheduled, so it is
# never counted as late-night activity.
SHIFTS = {
    "day": {"start": 8.75, "night_window": 21.0},
    "late": {"start": 12.5, "night_window": 23.5},
    "night": {"start": 21.5, "night_window": None},
}


@dataclass
class Profile:
    """Hidden per-employee behaviour parameters (never written to employees.csv)."""

    group: str
    base_hours_offset: float
    hours_noise: float
    base_breaks: float
    break_minutes: float
    base_late: float  # probability of a late-night session on a workday
    base_weekend: float  # probability of working an unscheduled day
    base_productivity: float
    base_tasks: float
    meetings: float
    spike_probability: float = 0.0
    ramp_start: int = 10**6  # day index where sustained overwork begins
    ramp_length: int = 1
    target_hours_offset: float = 0.0
    target_breaks: float = 0.0
    target_late: float = 0.0
    target_weekend: float = 0.0
    productivity_drop: float = 0.0
    data_gap_rate: float = 0.015
    partial_rate: float = 0.04


def _make_profile(group: str, rng: random.Random, n_days: int) -> Profile:
    if group == "healthy":
        return Profile(
            group=group,
            base_hours_offset=rng.gauss(0.05, 0.25),
            hours_noise=rng.uniform(0.3, 0.55),
            base_breaks=rng.uniform(3.0, 4.6),
            break_minutes=rng.uniform(12, 22),
            base_late=rng.uniform(0.0, 0.04),
            base_weekend=rng.uniform(0.0, 0.04),
            base_productivity=rng.uniform(72, 86),
            base_tasks=rng.uniform(4.5, 7.5),
            meetings=rng.uniform(1.0, 3.5),
            spike_probability=0.04,
        )
    if group == "occasional_overtime":
        return Profile(
            group=group,
            base_hours_offset=rng.gauss(0.55, 0.25),
            hours_noise=rng.uniform(0.5, 0.85),
            base_breaks=rng.uniform(2.4, 3.6),
            break_minutes=rng.uniform(10, 18),
            base_late=rng.uniform(0.05, 0.14),
            base_weekend=rng.uniform(0.06, 0.16),
            base_productivity=rng.uniform(72, 86),
            base_tasks=rng.uniform(5, 8),
            meetings=rng.uniform(2.0, 4.5),
            spike_probability=rng.uniform(0.15, 0.28),
        )
    # sustained_overwork: normal start, then a gradual ramp into long days
    ramp_start = int(n_days * rng.uniform(0.38, 0.5))
    return Profile(
        group=group,
        base_hours_offset=rng.gauss(0.35, 0.25),
        hours_noise=rng.uniform(0.4, 0.7),
        base_breaks=rng.uniform(2.6, 3.6),
        break_minutes=rng.uniform(10, 18),
        base_late=rng.uniform(0.02, 0.08),
        base_weekend=rng.uniform(0.03, 0.1),
        base_productivity=rng.uniform(76, 88),
        base_tasks=rng.uniform(5.5, 8.5),
        meetings=rng.uniform(2.5, 5.0),
        spike_probability=0.08,
        ramp_start=ramp_start,
        ramp_length=max(5, int(n_days * rng.uniform(0.25, 0.35))),
        target_hours_offset=rng.uniform(2.4, 3.6),
        target_breaks=rng.uniform(0.6, 1.4),
        target_late=rng.uniform(0.45, 0.75),
        target_weekend=rng.uniform(0.45, 0.8),
        # "Potential" decline: most, not all, show lower productivity.
        productivity_drop=rng.uniform(10, 20) if rng.random() < 0.8 else rng.uniform(0, 4),
    )


def _ramp(profile: Profile, day_index: int) -> float:
    if day_index < profile.ramp_start:
        return 0.0
    return clamp((day_index - profile.ramp_start + 1) / profile.ramp_length, 0.0, 1.0)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _unique_names(rng: random.Random, n: int) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    while len(names) < n:
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in seen:
            seen.add(name)
            names.append(name)
    return names


def _group_sizes(n: int) -> dict[str, int]:
    healthy = round(n * config.GROUP_SHARES["healthy"])
    occasional = round(n * config.GROUP_SHARES["occasional_overtime"])
    return {"healthy": healthy, "occasional_overtime": occasional, "sustained_overwork": n - healthy - occasional}


def _dt(day: date, hour_float: float) -> datetime:
    """Datetime for a (possibly >24 h) fractional hour on a given day, to the minute."""
    minutes = int(round(hour_float * 60))
    return datetime.combine(day, time(0, 0)) + timedelta(minutes=minutes)


def generate(n_employees: int = config.N_EMPLOYEES, n_days: int = config.HISTORY_DAYS, seed: int = config.RANDOM_SEED, end_date: date = config.END_DATE):
    """Return (employees, activity, labels) as lists of dicts."""
    rng = random.Random(seed)
    start_date = end_date - timedelta(days=n_days - 1)
    dates = [start_date + timedelta(days=i) for i in range(n_days)]

    sizes = _group_sizes(n_employees)
    groups = ["healthy"] * sizes["healthy"] + ["occasional_overtime"] * sizes["occasional_overtime"] + ["sustained_overwork"] * sizes["sustained_overwork"]
    rng.shuffle(groups)
    names = _unique_names(rng, n_employees)

    # Two recent joiners demonstrate the insufficient-data path.
    healthy_idx = [i for i, g in enumerate(groups) if g == "healthy"]
    # Only with longer histories, so `--days 30` yields exactly employees × 30 records.
    new_joiners = set(rng.sample(healthy_idx, k=min(2, len(healthy_idx)))) if n_days >= 45 else set()

    employees, activity, labels = [], [], []
    for i in range(n_employees):
        emp_id = f"MG-{1001 + i}"
        department = config.DEPARTMENTS[i % len(config.DEPARTMENTS)]
        profile = _make_profile(groups[i], rng, n_days)

        shift_roll = rng.random()
        shift = "night" if shift_roll < 0.05 else "late" if shift_roll < 0.13 else "day"
        expected = rng.choice([7.5, 8.0, 8.0, 8.0, 8.0])
        working_days = WEEKDAY_CODES[1:6] if rng.random() < 0.06 else WEEKDAY_CODES[:5]
        arrangement = rng.choices(["Office", "Hybrid", "Remote"], weights=[3, 5, 3])[0]

        if i in new_joiners:
            joined = end_date - timedelta(days=rng.randint(6, 10))
        else:
            joined = date(rng.randint(2016, 2025), rng.randint(1, 12), rng.randint(1, 28))

        employees.append(
            {
                "employee_id": emp_id,
                "name": names[i],
                "department": department,
                "designation": rng.choice(DESIGNATIONS[department]),
                "work_arrangement": arrangement,
                "shift_type": shift,
                "expected_hours": expected,
                "working_days": ",".join(working_days),
                "start_date": joined.isoformat(),
            }
        )
        labels.append(
            {
                "employee_id": emp_id,
                "simulation_group": profile.group,
                "ramp_start_date": dates[profile.ramp_start].isoformat() if profile.ramp_start < n_days else "",
                "synthetic": True,
            }
        )

        leave_days = _plan_leave(rng, dates, working_days)
        for idx, day in enumerate(dates):
            if day < joined:
                continue
            activity.append(_day_record(rng, emp_id, day, idx, profile, shift, expected, working_days, day in leave_days))

    return employees, activity, labels


def _plan_leave(rng: random.Random, dates: list[date], working_days: list[str]) -> set[date]:
    """0–2 blocks of planned leave (1–3 scheduled days each)."""
    leave: set[date] = set()
    for _ in range(rng.choice([0, 0, 1, 1, 2])):
        start = rng.randrange(len(dates))
        length = rng.randint(1, 3)
        added = 0
        for d in dates[start:]:
            if WEEKDAY_CODES[d.weekday()] in working_days:
                leave.add(d)
                added += 1
                if added == length:
                    break
    return leave


def _day_record(rng, emp_id, day, idx, profile: Profile, shift, expected, working_days, on_leave) -> dict:
    t = _ramp(profile, idx)
    scheduled = WEEKDAY_CODES[day.weekday()] in working_days
    base = {
        "employee_id": emp_id,
        "date": day.isoformat(),
        "scheduled_workday": scheduled,
        "planned_leave": bool(on_leave and scheduled),
    }
    empty = {k: None for k in ACTIVITY_FIELDS if k not in base}

    if base["planned_leave"]:
        return {**empty, **base, "working_hours": 0.0, "overtime_hours": 0.0, "weekend_work": False, "late_night_sessions": 0,
                "night_activity_minutes": 0, "break_count": 0, "total_break_minutes": 0, "tasks_assigned": 0, "tasks_completed": 0,
                "tasks_pending": 0, "meetings_count": 0, "meeting_minutes": 0, "data_completeness": "complete"}

    late_p = _lerp(profile.base_late, profile.target_late, t)
    weekend_p = _lerp(profile.base_weekend, profile.target_weekend, t)

    if not scheduled:
        if rng.random() >= weekend_p:
            return {**empty, **base, "working_hours": 0.0, "overtime_hours": 0.0, "weekend_work": False, "late_night_sessions": 0,
                    "night_activity_minutes": 0, "break_count": 0, "total_break_minutes": 0, "tasks_assigned": 0, "tasks_completed": 0,
                    "tasks_pending": 0, "meetings_count": 0, "meeting_minutes": 0, "data_completeness": "complete"}
        work_minutes = rng.randint(90, 330)
        hours = rnd(work_minutes / 60, 2)
        login_min = rng.randint(570, 900)
        breaks = rng.choice([0, 0, 1])
        break_minutes = breaks * rng.randint(10, 25)
        start, logout = login_min / 60, (login_min + work_minutes + break_minutes) / 60
        tasks = rng.randint(1, 3)
        rec = {
            **base,
            "login_datetime": _dt(day, start),
            "logout_datetime": _dt(day, logout),
            "working_hours": hours,
            "break_count": breaks,
            "total_break_minutes": break_minutes,
            "average_break_minutes": rnd(break_minutes / breaks, 1) if breaks else None,
            "late_night_sessions": 0,
            "night_activity_minutes": 0,
            "weekend_work": True,
            "tasks_assigned": tasks,
            "tasks_completed": tasks - (1 if rng.random() < 0.2 else 0),
            "productivity_score": None,  # not scored on unscheduled days
            "meetings_count": 0,
            "meeting_minutes": 0,
            "overtime_hours": hours,  # all unscheduled hours are overtime
        }
        rec["tasks_pending"] = rec["tasks_assigned"] - rec["tasks_completed"]
        return _finalise(rng, rec, profile)

    # Scheduled workday
    offset = _lerp(profile.base_hours_offset, profile.target_hours_offset, t) if t else profile.base_hours_offset
    hours = expected + offset + rng.gauss(0, profile.hours_noise)
    if rng.random() < profile.spike_probability:
        hours += rng.uniform(1.2, 3.0)
    late_session = rng.random() < late_p and SHIFTS[shift]["night_window"] is not None
    late_minutes = rng.randint(30, 120) if late_session else 0
    main_minutes = int(round(clamp(hours - late_minutes / 60, 4.0, 14.0) * 60))

    breaks_mu = _lerp(profile.base_breaks, profile.target_breaks, t) if t else profile.base_breaks
    breaks = int(clamp(round(rng.gauss(breaks_mu, 0.7)), 0, 8))
    break_minutes = sum(rng.randint(max(5, int(profile.break_minutes) - 6), int(profile.break_minutes) + 8) for _ in range(breaks))

    # Work in whole minutes so login/logout, breaks and hours agree exactly.
    login_min = int(round((SHIFTS[shift]["start"] + rng.gauss(0, 0.3)) * 60))
    main_end_min = login_min + main_minutes + break_minutes
    logout_min = main_end_min
    night_minutes = 0
    window = SHIFTS[shift]["night_window"]
    if late_session:
        session_start = max(main_end_min + int(rng.uniform(30, 120)), int((window + rng.uniform(0.1, 0.8)) * 60))
        logout_min = session_start + late_minutes
        night_minutes = late_minutes
    elif window is not None and main_end_min > window * 60:
        night_minutes = int(main_end_min - window * 60)
    hours = rnd((main_minutes + late_minutes) / 60, 2)
    start, logout = login_min / 60, logout_min / 60

    productivity = clamp(profile.base_productivity - profile.productivity_drop * t + rng.gauss(0, 4.5), 35, 99)
    tasks_assigned = max(1, int(round(rng.gauss(profile.base_tasks * (1 + 0.15 * t), 1.2))))
    completion = clamp(productivity / 100 + rng.gauss(0.05, 0.08), 0.2, 1.0)
    tasks_completed = min(tasks_assigned, int(round(tasks_assigned * completion)))
    meetings = max(0, int(round(rng.gauss(profile.meetings, 1.0))))

    rec = {
        **base,
        "login_datetime": _dt(day, start),
        "logout_datetime": _dt(day, logout),
        "working_hours": hours,
        "break_count": breaks,
        "total_break_minutes": break_minutes,
        "average_break_minutes": rnd(break_minutes / breaks, 1) if breaks else None,
        "late_night_sessions": 1 if night_minutes >= 20 else 0,
        "night_activity_minutes": night_minutes,
        "weekend_work": False,
        "tasks_assigned": tasks_assigned,
        "tasks_completed": tasks_completed,
        "tasks_pending": tasks_assigned - tasks_completed,
        "productivity_score": rnd(productivity, 1),
        "meetings_count": meetings,
        "meeting_minutes": meetings * rng.choice([20, 30, 30, 45, 60]),
        "overtime_hours": rnd(max(0.0, hours - expected), 2),
    }
    return _finalise(rng, rec, profile)


def _finalise(rng, rec: dict, profile: Profile) -> dict:
    """Inject realistic tracking gaps. Missing values stay missing (None), never 0."""
    roll = rng.random()
    if roll < profile.data_gap_rate:
        # Tracker offline all day: only calendar facts are known.
        for k in ACTIVITY_FIELDS:
            if k not in ("employee_id", "date", "scheduled_workday", "planned_leave"):
                rec[k] = None
        rec["data_completeness"] = "missing"
        return rec
    if roll < profile.data_gap_rate + profile.partial_rate:
        gap = rng.choice(["breaks", "productivity", "logout"])
        if gap == "breaks":
            rec.update(break_count=None, total_break_minutes=None, average_break_minutes=None)
        elif gap == "productivity":
            rec.update(productivity_score=None, tasks_completed=None, tasks_pending=None)
        else:
            rec.update(logout_datetime=None, working_hours=None, overtime_hours=None, night_activity_minutes=None, late_night_sessions=None)
        rec["data_completeness"] = "partial"
        return rec
    rec["data_completeness"] = "complete"
    return rec


def _fmt(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, datetime):
        return value.isoformat(timespec="minutes")
    return value


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        fh.write("# SYNTHETIC DATA - generated by app.data.generator for the Sisyphus demo. Not real people.\n")
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: _fmt(row.get(k)) for k in fields})


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        lines = [line for line in fh if not line.startswith("#")]
    return list(csv.DictReader(lines))


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Generate the synthetic Sisyphus dataset.")
    parser.add_argument("--employees", type=int, default=config.N_EMPLOYEES)
    parser.add_argument("--days", type=int, default=config.HISTORY_DAYS)
    parser.add_argument("--seed", type=int, default=config.RANDOM_SEED)
    parser.add_argument("--out", type=Path, default=config.DATASET_DIR)
    args = parser.parse_args(argv)

    employees, activity, labels = generate(args.employees, args.days, args.seed)
    write_csv(args.out / "employees.csv", employees, EMPLOYEE_FIELDS)
    write_csv(args.out / "employee_activity.csv", activity, ACTIVITY_FIELDS)
    write_csv(args.out / "simulation_labels.csv", labels, LABEL_FIELDS)

    groups = {}
    for lab in labels:
        groups[lab["simulation_group"]] = groups.get(lab["simulation_group"], 0) + 1
    missing = sum(1 for r in activity if r["data_completeness"] == "missing")
    partial = sum(1 for r in activity if r["data_completeness"] == "partial")
    print(f"Synthetic dataset written to {args.out}")
    print(f"  employees: {len(employees)}  groups: {groups}")
    print(f"  activity records: {len(activity)} ({args.days} days, {partial} partial, {missing} missing)")


if __name__ == "__main__":
    main()
