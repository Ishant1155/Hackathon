"""Explainable observations for the Insights page.

Each insight compares an employee's current period with their own
previous period and explains, in plain language, what changed and why a
supportive check-in might help. Rules are illustrative and transparent.
No insight ever diagnoses or comments on health or state of mind.
"""

from __future__ import annotations

from app.utils.helpers import compare, is_missing, pct_change, rnd

SEVERITY_ORDER = {"elevated": 0, "moderate": 1, "positive": 2}


def build_employee_insights(emp: dict, comparison: dict, detected_at: str) -> list[dict]:
    """`emp` is the employee payload (metrics, baseline, indicator)."""
    c, b = emp["metrics"], emp["baseline"]
    first = emp["name"].split(" ")[0]
    level = emp["indicator"]["level"]
    out: list[dict] = []

    def severity(strong: bool) -> str:
        return "elevated" if strong or level == "elevated" else "moderate"

    def push(kind: str, **payload):
        out.append(
            {
                "id": f"{emp['id']}-{kind}",
                "employeeId": emp["id"],
                "employeeName": emp["name"],
                "department": emp["department"],
                "designation": emp["designation"],
                "indicatorLevel": level,
                "type": kind,
                "comparison": comparison,
                "detectedAt": detected_at,
                "simulated": True,
                **payload,
            }
        )

    def known(*values) -> bool:
        return all(not is_missing(v) for v in values)

    if known(c["avgHours"], b["avgHours"]):
        delta = c["avgHours"] - b["avgHours"]
        if delta >= 0.75 and c["avgHours"] >= 8.75:
            push(
                "hours",
                severity=severity(c["avgHours"] >= 10),
                title="Longer working days",
                metric={"label": "Average workday hours", "unit": "h", **compare(c["avgHours"], b["avgHours"])},
                whatChanged=f"{first}'s average workday rose from {rnd(b['avgHours'], 1)} h to {rnd(c['avgHours'], 1)} h (+{rnd(delta, 1)} h a day).",
                whyItMatters="Long days that continue for several weeks leave less time to recover. A check-in can show whether the workload, deadlines or staffing need adjusting.",
                suggestion="Review current priorities together and agree what can be deferred or shared.",
            )

    if known(c["breaksPerDay"], b["breaksPerDay"]):
        drop = b["breaksPerDay"] - c["breaksPerDay"]
        if drop >= 0.75 and c["breaksPerDay"] < 3:
            push(
                "breaks",
                severity=severity(c["breaksPerDay"] < 1.5),
                title="Fewer recorded breaks",
                metric={"label": "Breaks per workday", "unit": "", **compare(c["breaksPerDay"], b["breaksPerDay"])},
                whatChanged=f"Recorded breaks fell from {rnd(b['breaksPerDay'], 1)} to {rnd(c['breaksPerDay'], 1)} per day.",
                whyItMatters="Regular short pauses help people sustain focus. Fewer breaks can mean meetings are back-to-back or the day is too full.",
                suggestion="Ask whether the calendar leaves room for pauses and whether recurring meetings could be shortened.",
            )

    if c["lateNightSessions"] >= 4 and c["lateNightSessions"] >= b["lateNightSessions"] + 2:
        push(
            "lateNight",
            severity=severity(c["lateNightSessions"] >= 9),
            title="More late-night activity",
            metric={"label": "Late-night sessions", "unit": "", **compare(c["lateNightSessions"], b["lateNightSessions"], 0)},
            whatChanged=f"{c['lateNightSessions']} work sessions after the late-night cut-off this period, compared with {b['lateNightSessions']} in the baseline period.",
            whyItMatters="Regular late sessions can cut into rest and personal time. They sometimes reflect time-zone overlap or deadlines that could be planned differently.",
            suggestion="Check whether late work is expected, and whether core hours or hand-offs could be adjusted.",
        )

    if c["weekendDays"] >= 3 and c["weekendDays"] >= b["weekendDays"] + 2:
        push(
            "weekend",
            severity=severity(c["weekendDays"] >= 4),
            title="Regular weekend work",
            metric={"label": "Rest days worked", "unit": "days", **compare(c["weekendDays"], b["weekendDays"], 0)},
            whatChanged=f"{first} recorded work on {c['weekendDays']} non-scheduled days, up from {b['weekendDays']} in the baseline period.",
            whyItMatters="Weekends are usually the main recovery time. Repeated weekend work may mean weekday capacity is not enough for the current workload.",
            suggestion="Discuss whether weekend work is voluntary and whether the weekly plan is realistic.",
        )

    if known(c["tasksPerDay"], b["tasksPerDay"]):
        task_pct = pct_change(c["tasksPerDay"], b["tasksPerDay"])
        hours_up = known(c["avgHours"], b["avgHours"]) and c["avgHours"] - b["avgHours"] > 0.5
        if task_pct <= -10:
            push(
                "tasks",
                severity=severity(task_pct <= -15 and hours_up),
                title="Change in task completion",
                metric={"label": "Tasks completed per workday", "unit": "", **compare(c["tasksPerDay"], b["tasksPerDay"])},
                whatChanged=f"Tasks completed per day changed by {rnd(task_pct, 0):g}% ({rnd(b['tasksPerDay'], 1)} → {rnd(c['tasksPerDay'], 1)}){' while hours went up' if hours_up else ''}.",
                whyItMatters="Lower output alongside longer hours can mean tasks have grown in scope or the pace is hard to keep up. This is not a performance judgement.",
                suggestion="Ask about blockers and whether task estimates or scope have changed recently.",
            )

    cur_score, prev_score = emp["indicator"]["score"], emp["indicator"]["previousScore"]
    if known(cur_score, prev_score) and prev_score - cur_score >= 15:
        push(
            "improvement",
            severity="positive",
            title="Pattern moving back toward balance",
            metric={"label": "Indicator score", "unit": "", **compare(cur_score, prev_score, 0)},
            whatChanged=f"Hours, breaks and evening work have moved back toward the expected pattern (score {prev_score} → {cur_score}).",
            whyItMatters="Recognising positive change helps teams see which workload adjustments are working.",
            suggestion="Acknowledge the change and capture what helped so it can be shared with the team.",
        )

    return out


def sort_insights(insights: list[dict]) -> list[dict]:
    return sorted(insights, key=lambda i: (SEVERITY_ORDER[i["severity"]], -abs(i["metric"]["changePct"] or 0)))
