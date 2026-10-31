"""Period summaries and organisation-wide trend series.

Pure Python. Produces exactly the shapes the frontend charts expect
(see src/services/README.md in the frontend).

"Workday"     scheduled, not on planned leave, hours recorded (> 0)
"Rest day"    not a scheduled workday (weekend for Mon–Fri schedules)
Missing values are skipped, never counted as zero.
"""

from __future__ import annotations

from typing import Optional

from app.ml.feature_engineering import is_observed, is_workday, worked
from app.utils.helpers import add_days, compare, format_date, format_range, is_missing, is_weekend, mean, rnd, total


def summarise_period(records: list[dict]) -> dict:
    """Frontend PeriodSummary for one employee and one period."""
    workdays = [r for r in records if is_workday(r)]
    rest_worked = [r for r in records if not r["scheduled_workday"] and worked(r)]
    weeks = (len(records) / 7) or 1
    overtime = total(r["overtime_hours"] for r in records)
    late = total(r["late_night_sessions"] for r in records)
    return {
        "avgHours": rnd(mean(r["working_hours"] for r in workdays), 2),
        "breaksPerDay": rnd(mean(r["break_count"] for r in workdays), 2),
        "productivity": rnd(mean(r["productivity_score"] for r in workdays), 1),
        "tasksPerDay": rnd(mean(r["tasks_completed"] for r in workdays), 2),
        "overtimeHours": rnd(overtime, 1),
        "overtimePerWeek": rnd(overtime / weeks, 2),
        "lateNightSessions": int(late),
        "lateNightPerWeek": rnd(late / weeks, 2),
        "weekendDays": len(rest_worked),
        "weekendDaysPerWeek": rnd(len(rest_worked) / weeks, 2),
        "totalHours": rnd(total(r["working_hours"] for r in records), 1),
        "days": len(records),
        "observedDays": len([r for r in records if is_observed(r)]),
        "workdays": len(workdays),
    }


def org_summary(timelines: dict, start: str, end: str) -> dict:
    """Organisation-wide summary for [start, end]: means of per-person values, sums of counts."""
    per = []
    for tl in timelines.values():
        recs = [r for r in tl.records if start <= r["date"] <= end]
        if recs:
            per.append(summarise_period(recs))
    return {
        "avgHours": rnd(mean(s["avgHours"] for s in per), 2),
        "productivity": rnd(mean(s["productivity"] for s in per), 1),
        "breaksPerDay": rnd(mean(s["breaksPerDay"] for s in per), 2),
        "overtimeHours": rnd(total(s["overtimeHours"] for s in per), 1),
        "lateNightSessions": int(total(s["lateNightSessions"] for s in per)),
        "weekendDays": int(total(s["weekendDays"] for s in per)),
        "tasksPerDay": rnd(mean(s["tasksPerDay"] for s in per), 2),
    }


def aggregate_day(timelines: dict, iso_date: str) -> dict:
    """Organisation aggregate for one calendar date."""
    records = [tl.by_date[iso_date] for tl in timelines.values() if iso_date in tl.by_date]
    workers = [r for r in records if worked(r)]
    weekend = is_weekend(iso_date)
    return {
        "date": iso_date,
        "isWeekend": weekend,
        "hours": rnd(mean(r["working_hours"] for r in workers), 2),
        "productivity": None if weekend else rnd(mean(r["productivity_score"] for r in records), 1),
        "breaks": rnd(mean(r["break_count"] for r in workers), 2),
        "overtime": rnd(total(r["overtime_hours"] for r in records), 1),
        "lateNight": int(total(r["late_night_sessions"] for r in records)),
        "activeEmployees": len(workers),
        "weekendHours": rnd(total(r["working_hours"] for r in records), 1) if weekend else 0,
    }


def build_trends(timelines: dict, end_date: str, range_days: int) -> dict:
    """GET /analytics/trends payload: last `range_days` days vs the window before."""
    days = 7 if int(range_days) == 7 else 30
    cur_start = add_days(end_date, -(days - 1))
    prev_end = add_days(cur_start, -1)
    prev_start = add_days(prev_end, -(days - 1))

    cur = [aggregate_day(timelines, add_days(cur_start, i)) for i in range(days)]
    prev = [aggregate_day(timelines, add_days(prev_start, i)) for i in range(days)]
    cur_wd = [d for d in cur if not d["isWeekend"]]
    prev_wd = [d for d in prev if not d["isWeekend"]]

    daily = []
    for i, d in enumerate(cur_wd):
        p = prev_wd[i] if i < len(prev_wd) else {}
        daily.append(
            {
                "date": d["date"],
                "label": format_date(d["date"]),
                "previousDate": p.get("date"),
                "hours": d["hours"],
                "previousHours": p.get("hours"),
                "productivity": d["productivity"],
                "previousProductivity": p.get("productivity"),
                "breaks": d["breaks"],
                "previousBreaks": p.get("breaks"),
                "overtime": d["overtime"],
                "previousOvertime": p.get("overtime"),
                "lateNight": d["lateNight"],
                "previousLateNight": p.get("lateNight"),
            }
        )

    cur_we = [d for d in cur if d["isWeekend"]]
    prev_we = [d for d in prev if d["isWeekend"]]
    weekend = []
    for i, d in enumerate(cur_we):
        p = prev_we[i] if i < len(prev_we) else {}
        weekend.append(
            {
                "date": d["date"],
                "label": format_date(d["date"], weekday="short"),
                "previousDate": p.get("date"),
                "activeEmployees": d["activeEmployees"],
                "previousActiveEmployees": p.get("activeEmployees"),
                "hours": d["weekendHours"],
                "previousHours": p.get("weekendHours"),
            }
        )

    c = org_summary(timelines, cur_start, end_date)
    pv = org_summary(timelines, prev_start, prev_end)
    summary = {k: compare(c[k], pv[k], 2) for k in c}

    return {
        "range": days,
        "current": {"start": cur_start, "end": end_date, "display": format_range(cur_start, end_date)},
        "previous": {"start": prev_start, "end": prev_end, "display": format_range(prev_start, prev_end)},
        "summary": summary,
        "daily": daily,
        "weekend": weekend,
    }


def weekly_buckets(records: list[dict], end_date: str, weeks: int, current_start: str) -> list[dict]:
    """7-day buckets ending on end_date (oldest first) for one employee."""
    out = []
    for w in range(weeks - 1, -1, -1):
        bucket_end = add_days(end_date, -7 * w)
        bucket_start = add_days(bucket_end, -6)
        recs = [r for r in records if bucket_start <= r["date"] <= bucket_end]
        if not recs:
            continue
        s = summarise_period(recs)
        days_in_current = len([r for r in recs if r["date"] >= current_start])
        out.append(
            {
                "weekEnding": bucket_end,
                "label": format_date(bucket_end),
                "period": "current" if days_in_current > 3 else "previous",
                "avgHours": s["avgHours"],
                "breaksPerDay": s["breaksPerDay"],
                "productivity": s["productivity"],
                "overtimeHours": s["overtimeHours"],
                "lateNightSessions": s["lateNightSessions"],
                "weekendDays": s["weekendDays"],
            }
        )
    return out


def org_weekly_hours(timelines: dict, end_date: str, current_start: str, elevated_ids: set, weeks: int = 8) -> list[dict]:
    """Overview chart: weekly average workday hours, all employees vs elevated group."""
    out = []
    for w in range(weeks - 1, -1, -1):
        bucket_end = add_days(end_date, -7 * w)
        bucket_start = add_days(bucket_end, -6)
        per = {}
        for emp_id, tl in timelines.items():
            recs = [r for r in tl.records if bucket_start <= r["date"] <= bucket_end]
            if recs:
                per[emp_id] = summarise_period(recs)
        days_in_current = sum(1 for i in range(7) if add_days(bucket_start, i) >= current_start)
        out.append(
            {
                "weekEnding": bucket_end,
                "label": format_date(bucket_end),
                "period": "current" if days_in_current > 3 else "previous",
                "avgHours": rnd(mean(s["avgHours"] for s in per.values()), 2),
                "elevatedGroupHours": rnd(mean(s["avgHours"] for k, s in per.items() if k in elevated_ids), 2),
                "overtimePerEmployee": rnd(mean(s["overtimeHours"] for s in per.values()), 2),
                "reference": 8,
            }
        )
    return out


def safe_round(value: Optional[float], digits: int) -> Optional[float]:
    return None if is_missing(value) else rnd(value, digits)
