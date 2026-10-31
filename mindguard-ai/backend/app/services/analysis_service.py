"""Analysis workflow and frontend payload builder.

`AnalyticsEngine` holds the employee roster and daily activity (loaded
from SQLite in production, or from CSV in tests) and produces every
payload the frontend consumes, using the exact field names of the
existing React services (src/services/README.md).

Per-employee pipeline (also used by POST /analyze/{id}):
    1. retrieve activity history
    2. validate it (data completeness, sufficient history)
    3. engineer features (app.ml.feature_engineering)
    4. compare the recent 7 days with the personal baseline
    5. run the Isolation Forest (unusual pattern yes/no + score)
    6. run the independent rule-based indicator engine
    7. explain the result and generate supportive recommendations
    8. (route layer) save the assessment
The ML anomaly output and the indicator score are kept separate: the
anomaly prediction is never converted into an indicator score.
"""

from __future__ import annotations

from collections import defaultdict
from functools import cached_property
from typing import Optional, Protocol

from app.core import config
from app.ml.feature_engineering import EmployeeTimeline, compute_features
from app.ml.forecaster import FORECAST_MODEL, InsufficientHistory, backtest, forecast_employee
from app.services import insight_engine, trend_analyzer
from app.services.recommendation import generate_recommendations
from app.services.risk_engine import LEVEL_LABELS, evaluate_features
from app.utils.helpers import add_days, compare, format_date, format_range, mean, pct_change, rnd, total

LEVELS = ["low", "moderate", "elevated", "insufficient_data"]


class EmployeeNotFound(LookupError):
    pass


class AnomalyDetector(Protocol):
    def predict(self, feature_rows: list[dict]) -> list[dict]: ...


def normalise_employee(row: dict) -> dict:
    wd = row.get("working_days") or "Mon,Tue,Wed,Thu,Fri"
    return {
        "employee_id": row["employee_id"],
        "name": row["name"],
        "department": row["department"],
        "designation": row["designation"],
        "work_arrangement": row.get("work_arrangement") or "Office",
        "shift_type": row.get("shift_type") or "day",
        "expected_hours": float(row.get("expected_hours") or 8.0),
        "working_days": wd.split(",") if isinstance(wd, str) else list(wd),
        "start_date": str(row.get("start_date") or "")[:10] or None,
    }


class AnalyticsEngine:
    def __init__(self, employees: list[dict], activity: list[dict], detector: Optional[AnomalyDetector] = None, model_info: Optional[dict] = None):
        self.employees = [normalise_employee(e) for e in employees]
        self.by_id = {e["employee_id"]: e for e in self.employees}
        grouped: dict[str, list[dict]] = defaultdict(list)
        for r in activity:
            grouped[r["employee_id"]].append(r)
        self.timelines = {e["employee_id"]: EmployeeTimeline(grouped.get(e["employee_id"], [])) for e in self.employees}
        dates = [tl.last_date for tl in self.timelines.values() if tl.last_date]
        if not dates:
            raise ValueError("No activity records found. Run the generator and seed the database first.")
        self.end_date = max(dates)
        self.start_date = min(tl.first_date for tl in self.timelines.values() if tl.first_date)
        self.current = {"start": add_days(self.end_date, -29), "end": self.end_date, "label": "Current period"}
        prev_end = add_days(self.end_date, -30)
        self.previous = {"start": add_days(prev_end, -29), "end": prev_end, "label": "Previous period (baseline)"}
        self.detector = detector
        self.model_info = model_info or {}

    # ------------------------------------------------------------ helpers
    def get(self, employee_id: str) -> dict:
        emp = self.by_id.get(employee_id) or self.by_id.get(str(employee_id).upper())
        if not emp:
            raise EmployeeNotFound(f'Employee "{employee_id}" was not found.')
        return emp

    def _records(self, emp_id: str, start: str, end: str) -> list[dict]:
        return [r for r in self.timelines[emp_id].records if start <= r["date"] <= end]

    def meta(self, **extra) -> dict:
        return {
            "simulated": True,
            "notice": config.DATA_NOTICE,
            "organisation": config.ORGANISATION,
            "generatedAt": f"{add_days(self.end_date, 1)}T06:00:00Z",
            "period": {"current": self.current, "previous": self.previous},
            "thresholds": {"moderate": config.RULES.moderate_threshold, "elevated": config.RULES.elevated_threshold, "illustrative": True},
            "dataRange": {"start": self.start_date, "end": self.end_date},
            "source": "api",
            **extra,
        }

    @cached_property
    def comparison(self) -> dict:
        return {
            "current": {**self.current, "display": format_range(self.current["start"], self.current["end"])},
            "previous": {**self.previous, "display": format_range(self.previous["start"], self.previous["end"])},
        }

    # -------------------------------------------------------- per employee
    def features(self, emp_id: str, as_of: Optional[str] = None) -> dict:
        emp = self.get(emp_id)
        return compute_features(self.timelines[emp["employee_id"]], as_of or self.end_date, emp["expected_hours"])

    def indicator(self, emp_id: str, as_of: Optional[str] = None) -> dict:
        emp = self.get(emp_id)
        return evaluate_features(self.features(emp["employee_id"], as_of), emp["expected_hours"])

    @cached_property
    def _anomalies(self) -> dict:
        """Isolation Forest output for every employee's latest snapshot."""
        out = {}
        rows = []
        for e in self.employees:
            f = self.features(e["employee_id"])
            if f["data_sufficiency"] != "sufficient":
                out[e["employee_id"]] = {"status": "insufficient_data", "detected": None, "prediction": None, "anomalyScore": None, "drivers": []}
            else:
                rows.append((e["employee_id"], f))
        if self.detector is None:
            for emp_id, _ in rows:
                out[emp_id] = {"status": "model_unavailable", "detected": None, "prediction": None, "anomalyScore": None, "drivers": []}
            return out
        preds = self.detector.predict([f for _, f in rows]) if rows else []
        for (emp_id, _), p in zip(rows, preds):
            out[emp_id] = {"status": "scored", **p}
        return out

    def anomaly(self, emp_id: str) -> dict:
        return self._anomalies[self.get(emp_id)["employee_id"]]

    @cached_property
    def _payloads(self) -> dict:
        out = {}
        for e in self.employees:
            emp_id = e["employee_id"]
            cur = self._records(emp_id, self.current["start"], self.current["end"])
            prev = self._records(emp_id, self.previous["start"], self.previous["end"])
            now = self.indicator(emp_id)
            before = self.indicator(emp_id, self.previous["end"])
            prod = next((f for f in now["factors"] if f["key"] == "productivityChange"), None)
            out[emp_id] = {
                "id": emp_id,
                "name": e["name"],
                "department": e["department"],
                "designation": e["designation"],
                "location": e["work_arrangement"],
                "workArrangement": e["work_arrangement"],
                "shiftType": e["shift_type"],
                "expectedHours": e["expected_hours"],
                "workingDays": e["working_days"],
                "startDate": e["start_date"],
                "simulated": True,
                "metrics": trend_analyzer.summarise_period(cur),
                "baseline": trend_analyzer.summarise_period(prev),
                "indicator": {
                    "score": now["score"],
                    "level": now["level"],
                    "levelLabel": now["levelLabel"],
                    "previousScore": before["score"],
                    "previousLevel": before["level"],
                    "productivityChange": prod["value"] if prod else None,
                    "dataSufficiency": now["data_sufficiency"],
                },
                "_result": now,
            }
        return out

    def employee_summary(self, emp_id: str) -> dict:
        p = dict(self._payloads[self.get(emp_id)["employee_id"]])
        p.pop("_result")
        p["anomaly"] = self.anomaly(emp_id)
        return p

    def list_employees(self, search: str = "", department: str = "", level: str = "") -> list[dict]:
        needle = search.strip().lower()
        out = []
        for e in self.employees:
            p = self.employee_summary(e["employee_id"])
            if department and p["department"].lower() != department.lower():
                continue
            if level and p["indicator"]["level"] != level:
                continue
            if needle and not any(needle in str(p[k]).lower() for k in ("name", "id", "designation", "department")):
                continue
            out.append(p)
        return out

    @cached_property
    def all_insights(self) -> list[dict]:
        items = []
        for e in self.employees:
            items.extend(insight_engine.build_employee_insights(self.employee_summary(e["employee_id"]), self.comparison, self.end_date))
        return insight_engine.sort_insights(items)

    def employee_detail(self, emp_id: str) -> dict:
        emp_id = self.get(emp_id)["employee_id"]
        result = self._payloads[emp_id]["_result"]
        return {
            **self.employee_summary(emp_id),
            "factors": result["factors"],
            "dataSufficiency": result["data_sufficiency"],
            "indicatorSummary": result["summary"],
            "recommendations": generate_recommendations(result),
            "insights": [i for i in self.all_insights if i["employeeId"] == emp_id],
            "disclaimer": result["disclaimer"],
        }

    def employee_history(self, emp_id: str, start: Optional[str] = None, end: Optional[str] = None) -> dict:
        emp_id = self.get(emp_id)["employee_id"]
        end = min(end or self.end_date, self.end_date)
        start = start or add_days(end, -29)
        if start > end:
            raise ValueError("start must be on or before end")
        records = self._records(emp_id, start, end)
        span = len(records) or 1
        prev_records = self._records(emp_id, add_days(start, -span), add_days(start, -1))
        baseline = trend_analyzer.summarise_period(self._records(emp_id, self.previous["start"], self.previous["end"]))
        current = trend_analyzer.summarise_period(records)
        tl = self.timelines[emp_id]
        weekly = trend_analyzer.weekly_buckets(tl.records, end, 8, self.current["start"])

        def day(r: dict, i: int) -> dict:
            p = prev_records[i] if i < len(prev_records) else None
            return {
                "date": r["date"],
                "isWeekend": not r["scheduled_workday"],
                "isCalendarWeekend": format_date(r["date"], weekday="short", month=False) in ("Sat", "Sun"),
                "scheduledWorkday": r["scheduled_workday"],
                "plannedLeave": r["planned_leave"],
                "worked": bool(r["working_hours"]) if r["working_hours"] is not None else None,
                "hours": r["working_hours"],
                "breaks": r["break_count"],
                "breakMinutes": r["total_break_minutes"],
                "productivity": r["productivity_score"],
                "tasksAssigned": r["tasks_assigned"],
                "tasksCompleted": r["tasks_completed"],
                "overtime": r["overtime_hours"],
                "lateNight": r["late_night_sessions"],
                "nightActivityMinutes": r["night_activity_minutes"],
                "meetingMinutes": r["meeting_minutes"],
                "login": r["login_datetime"].isoformat(timespec="minutes") if r["login_datetime"] else None,
                "logout": r["logout_datetime"].isoformat(timespec="minutes") if r["logout_datetime"] else None,
                "dataCompleteness": r["data_completeness"],
                "simulated": True,
                "baselineHours": baseline["avgHours"],
                "previousDate": p["date"] if p else None,
                "previousHours": p["working_hours"] if p else None,
            }

        return {
            "employeeId": emp_id,
            "range": {"start": start, "end": end},
            "baseline": baseline,
            "current": current,
            "daily": [day(r, i) for i, r in enumerate(records)],
            "weekly": weekly,
        }

    # ------------------------------------------------------------- analyze
    def analyze(self, emp_id: str) -> dict:
        """Full workflow for one employee (the route layer saves the result)."""
        emp = self.get(emp_id)
        emp_id = emp["employee_id"]
        tl = self.timelines[emp_id]
        features = self.features(emp_id)
        result = evaluate_features(features, emp["expected_hours"])
        recommendations = generate_recommendations(result)
        anomaly = self.anomaly(emp_id)
        validation = {
            "records": len(tl.records),
            "observedDays": features["history_days"],
            "missingDays": len([r for r in tl.records if r["data_completeness"] == "missing"]),
            "partialDays": len([r for r in tl.records if r["data_completeness"] == "partial"]),
            "workdaysLast7": features["workdays_7d"],
            "baselineWorkdays": features["baseline_workdays"],
            "minimumHistoryDays": config.MIN_HISTORY_DAYS,
        }
        status = "insufficient_data" if result["data_sufficiency"] != "sufficient" else "completed"
        explanation = result["summary"]
        if anomaly.get("status") == "scored":
            explanation += (
                " The anomaly model flagged this pattern as unusual compared with the training baseline."
                if anomaly["detected"]
                else " The anomaly model did not flag this pattern as unusual."
            )
        return {
            "status": status,
            "employee_id": emp_id,
            "employee_name": emp["name"],
            "assessment_date": self.end_date,
            "data_sufficiency": result["data_sufficiency"],
            "validation": validation,
            "features": {k: features[k] for k in features if k not in ("as_of_date",)},
            "anomaly": anomaly,
            "anomaly_detected": anomaly.get("detected"),
            "anomaly_score": anomaly.get("anomalyScore"),
            "indicator_score": result["indicator_score"],
            "indicator_level": result["indicator_level"],
            "contributing_factors": result["contributing_factors"],
            "factors": result["factors"],
            "explanation": explanation,
            "recommendations": recommendations,
            "disclaimer": config.DISCLAIMER,
        }

    # ------------------------------------------------------------ overview
    def overview(self) -> dict:
        payloads = [self.employee_summary(e["employee_id"]) for e in self.employees]
        total_n = len(payloads)

        def count(level: str, key: str = "level") -> int:
            return sum(1 for p in payloads if p["indicator"][key] == level)

        cur = trend_analyzer.org_summary(self.timelines, self.current["start"], self.current["end"])
        prev = trend_analyzer.org_summary(self.timelines, self.previous["start"], self.previous["end"])
        elevated_ids = {p["id"] for p in payloads if p["indicator"]["level"] == "elevated"}

        distribution = []
        for level in LEVELS:
            n, n_prev = count(level), count(level, "previousLevel")
            if level == "insufficient_data" and n == 0 and n_prev == 0:
                continue
            distribution.append({"level": level, "label": LEVEL_LABELS[level], "count": n, "previousCount": n_prev, "percent": rnd(n / total_n * 100, 1)})

        anomalies = [p for p in payloads if p["anomaly"].get("detected")]
        check_ins = sorted((p for p in payloads if p["indicator"]["level"] in ("moderate", "elevated")), key=lambda p: -(p["indicator"]["score"] or 0))

        return {
            "kpis": {
                "totalEmployees": total_n,
                "departments": len({p["department"] for p in payloads}),
                "elevated": {"current": count("elevated"), "previous": count("elevated", "previousLevel")},
                "moderate": {"current": count("moderate"), "previous": count("moderate", "previousLevel")},
                "insufficientData": count("insufficient_data"),
                "anomalies": len(anomalies) if self.detector else None,
                "avgWorkingHours": compare(cur["avgHours"], prev["avgHours"], 2),
                "avgProductivity": compare(cur["productivity"], prev["productivity"], 1),
            },
            "weeklyHours": trend_analyzer.org_weekly_hours(self.timelines, self.end_date, self.current["start"], elevated_ids),
            "distribution": distribution,
            "departments": self.departments(),
            "recentInsights": self.all_insights[:4],
            "checkIns": [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "department": p["department"],
                    "designation": p["designation"],
                    "indicator": p["indicator"],
                    "avgHours": p["metrics"]["avgHours"],
                    "anomalyDetected": p["anomaly"].get("detected"),
                    "reasons": [f["label"] for f in self._payloads[p["id"]]["_result"]["factors"] if f["points"] > 0][:2],
                }
                for p in check_ins
            ],
        }

    def departments(self) -> list[dict]:
        out = []
        for dept in config.DEPARTMENTS:
            members = [self.employee_summary(e["employee_id"]) for e in self.employees if e["department"] == dept]
            if not members:
                continue
            scores = [m["indicator"]["score"] for m in members]
            prev_scores = [m["indicator"]["previousScore"] for m in members]
            out.append(
                {
                    "department": dept,
                    "headcount": len(members),
                    "avgHours": rnd(mean(m["metrics"]["avgHours"] for m in members), 2),
                    "previousAvgHours": rnd(mean(m["baseline"]["avgHours"] for m in members), 2),
                    "overtimePerWeek": rnd(mean(m["metrics"]["overtimePerWeek"] for m in members), 2),
                    "breaksPerDay": rnd(mean(m["metrics"]["breaksPerDay"] for m in members), 2),
                    "productivity": rnd(mean(m["metrics"]["productivity"] for m in members), 1),
                    "lateNightSessions": int(total(m["metrics"]["lateNightSessions"] for m in members)),
                    "weekendDays": int(total(m["metrics"]["weekendDays"] for m in members)),
                    "avgScore": rnd(mean(scores), 0),
                    "previousAvgScore": rnd(mean(prev_scores), 0),
                    "low": sum(1 for m in members if m["indicator"]["level"] == "low"),
                    "moderate": sum(1 for m in members if m["indicator"]["level"] == "moderate"),
                    "elevated": sum(1 for m in members if m["indicator"]["level"] == "elevated"),
                    "insufficientData": sum(1 for m in members if m["indicator"]["level"] == "insufficient_data"),
                    "anomalies": sum(1 for m in members if m["anomaly"].get("detected")),
                }
            )
        return out

    def trends(self, range_days: int = 30) -> dict:
        return trend_analyzer.build_trends(self.timelines, self.end_date, range_days)

    # ------------------------------------------------------------ forecast
    @cached_property
    def _forecasts(self) -> dict:
        out = {}
        for e in self.employees:
            try:
                out[e["employee_id"]] = forecast_employee(self.timelines[e["employee_id"]], e["expected_hours"], e["working_days"])
            except InsufficientHistory:
                continue
        return out

    @cached_property
    def _backtest(self) -> dict:
        items = [(self.timelines[e["employee_id"]], e["expected_hours"], e["working_days"]) for e in self.employees]
        return backtest(items)

    def _model_meta(self) -> dict:
        return {**FORECAST_MODEL, "backtest": self._backtest}

    def _recent_history(self, ids: list[str], days: int = 14) -> list[dict]:
        out = []
        for i in range(days - 1, -1, -1):
            d = add_days(self.end_date, -i)
            recs = [self.timelines[x].by_date[d] for x in ids if d in self.timelines[x].by_date]
            wknd = format_date(d, weekday="short", month=False) in ("Sat", "Sun")
            workers = [r for r in recs if r["working_hours"]]
            out.append(
                {
                    "date": d,
                    "label": format_date(d, weekday="short"),
                    "isWeekend": wknd,
                    "hours": rnd(mean(r["working_hours"] for r in recs), 2) if wknd else rnd(mean(r["working_hours"] for r in workers), 2),
                    "overtime": rnd(total(r["overtime_hours"] for r in recs), 1),
                    "breaks": None if wknd else rnd(mean(r["break_count"] for r in workers), 2),
                }
            )
        return out

    def forecast(self) -> dict:
        ids = list(self._forecasts)
        if not ids:
            raise InsufficientHistory("No employee has enough history to forecast.")
        per = [self._forecasts[i] for i in ids]
        days = []
        for idx, day in enumerate(per[0]["days"]):
            rows = [f["days"][idx] for f in per]
            wknd = format_date(day["date"], weekday="short", month=False) in ("Sat", "Sun")
            wk_rows = [r for r in rows if not r["isWeekend"]]
            days.append(
                {
                    "date": day["date"],
                    "label": format_date(day["date"], weekday="short"),
                    "weekday": format_date(day["date"], weekday="long", month=False),
                    "isWeekend": wknd,
                    "predictedHours": rnd(mean(r["expectedHours"] for r in (rows if wknd else wk_rows)), 2),
                    "lower": None if wknd else rnd(mean(r["lower"] for r in wk_rows), 2),
                    "upper": None if wknd else rnd(mean(r["upper"] for r in wk_rows), 2),
                    "predictedOvertime": rnd(total(r["overtime"] for r in rows), 1),
                    "predictedBreaks": None if wknd else rnd(mean(r["breaks"] for r in wk_rows), 2),
                    "expectedWorkers": rnd(total(r["workProbability"] for r in rows), 1),
                    "expectedLateNights": rnd(total(r["lateNight"] for r in rows), 1),
                }
            )
        history = self._recent_history(ids)
        sums = [f["summary"] for f in per]
        weekdays = [d for d in days if not d["isWeekend"]]
        pred_avg = mean(s["predictedAvgHours"] for s in sums)
        recent_avg = mean(s["recentAvgHours"] for s in sums)
        pred_ot = total(d["predictedOvertime"] for d in days)
        recent_ot = total(d["overtime"] for d in history[-7:])
        peak = max(weekdays, key=lambda d: d["predictedHours"] or 0) if weekdays else None
        recent_breaks = mean(d["breaks"] for d in history[-7:] if d["breaks"] is not None)
        summary = {
            "predictedAvgHours": rnd(pred_avg, 2),
            "recentAvgHours": rnd(recent_avg, 2),
            "change": rnd(pred_avg - recent_avg, 2) if pred_avg is not None and recent_avg is not None else None,
            "changePct": rnd(pct_change(pred_avg, recent_avg), 1),
            "predictedOvertime": rnd(pred_ot, 1),
            "recentOvertime": rnd(recent_ot, 1),
            "overtimeChangePct": rnd(pct_change(pred_ot, recent_ot), 1),
            "predictedBreaks": rnd(mean(d["predictedBreaks"] for d in weekdays), 2),
            "recentBreaks": rnd(recent_breaks, 2),
            "expectedWeekendWorkers": rnd(total(d["expectedWorkers"] for d in days if d["isWeekend"]), 1),
            "expectedLateNights": rnd(total(d["expectedLateNights"] for d in days), 1),
            "peakDay": {"date": peak["date"], "label": peak["weekday"], "hours": peak["predictedHours"]} if peak else None,
            "rising": sum(1 for s in sums if s["trend"] == "rising"),
            "easing": sum(1 for s in sums if s["trend"] == "easing"),
            "above10h": sum(1 for s in sums if (s["predictedAvgHours"] or 0) >= 10),
            "forecastedEmployees": len(ids),
        }
        people = sorted(
            (
                {
                    "id": i,
                    "name": self.by_id[i]["name"],
                    "department": self.by_id[i]["department"],
                    "designation": self.by_id[i]["designation"],
                    "indicator": self._payloads[i]["indicator"],
                    **self._forecasts[i]["summary"],
                }
                for i in ids
            ),
            key=lambda p: -(p["predictedOvertime"] or 0),
        )
        departments = []
        for dept in config.DEPARTMENTS:
            members = [self._forecasts[i]["summary"] for i in ids if self.by_id[i]["department"] == dept]
            if members:
                departments.append(
                    {
                        "department": dept,
                        "headcount": len(members),
                        "predictedAvgHours": rnd(mean(m["predictedAvgHours"] for m in members), 2),
                        "recentAvgHours": rnd(mean(m["recentAvgHours"] for m in members), 2),
                        "change": rnd(mean(m["change"] for m in members), 2),
                        "predictedOvertime": rnd(total(m["predictedOvertime"] for m in members), 1),
                    }
                )
        return {
            "model": self._model_meta(),
            "historyRange": {"start": history[0]["date"], "end": history[-1]["date"]},
            "horizon": {"start": days[0]["date"], "end": days[-1]["date"], "display": format_range(days[0]["date"], days[-1]["date"])},
            "days": days,
            "history": history,
            "summary": summary,
            "departments": departments,
            "employees": people,
            "insights": _forecast_insights(summary, people, departments),
        }

    def employee_forecast(self, emp_id: str) -> dict:
        emp = self.get(emp_id)
        emp_id = emp["employee_id"]
        if emp_id not in self._forecasts:
            raise InsufficientHistory(f"{emp['name']} does not have enough recorded workdays to forecast yet.")
        f = self._forecasts[emp_id]
        tl = self.timelines[emp_id]
        return {
            "employeeId": emp_id,
            "model": self._model_meta(),
            "horizon": {"start": f["days"][0]["date"], "end": f["days"][-1]["date"], "display": format_range(f["days"][0]["date"], f["days"][-1]["date"])},
            "days": [{**d, "label": format_date(d["date"], weekday="short")} for d in f["days"]],
            "history": [
                {
                    "date": r["date"],
                    "label": format_date(r["date"], weekday="short"),
                    "isWeekend": not r["scheduled_workday"],
                    "hours": r["working_hours"],
                    "breaks": r["break_count"] if r["scheduled_workday"] else None,
                    "overtime": r["overtime_hours"],
                }
                for r in tl.records[-14:]
                if r["working_hours"] is not None
            ],
            "summary": f["summary"],
        }


def _forecast_insights(summary: dict, people: list[dict], departments: list[dict]) -> list[dict]:
    out = []
    long_days = [p for p in people if (p["predictedAvgHours"] or 0) >= 10]
    if long_days:
        names = ", ".join(p["name"].split(" ")[0] for p in long_days[:3])
        out.append(
            {
                "id": "fc-long-days",
                "tone": "elevated",
                "title": f"{len(long_days)} {'person is' if len(long_days) == 1 else 'people are'} forecast to average 10 h or more",
                "detail": f"The model expects {names}{' and others' if len(long_days) > 3 else ''} to keep working long days next week. Reviewing their priorities now could prevent the pattern from continuing.",
            }
        )
    if departments:
        busiest = max(departments, key=lambda d: d["predictedAvgHours"] or 0)
        same = abs((busiest["predictedAvgHours"] or 0) - (busiest["recentAvgHours"] or 0)) < 0.15
        out.append(
            {
                "id": "fc-dept",
                "tone": "moderate" if (busiest["predictedAvgHours"] or 0) >= 9 else "positive",
                "title": f"{busiest['department']} has the heaviest forecast",
                "detail": (
                    f"{busiest['department']} is expected to keep averaging about {rnd(busiest['predictedAvgHours'], 1)} h per workday, the same level as recently."
                    if same
                    else f"{busiest['department']} is expected to average {rnd(busiest['predictedAvgHours'], 1)} h per workday, compared with {rnd(busiest['recentAvgHours'], 1)} h recently."
                ),
            }
        )
    rising = summary["predictedOvertime"] > summary["recentOvertime"] * 1.05
    out.append(
        {
            "id": "fc-overtime",
            "tone": "moderate" if rising else "positive",
            "title": "Overtime is expected to increase" if rising else "Overtime is expected to hold steady",
            "detail": f"About {round(summary['predictedOvertime'])} overtime hours are forecast across the organisation, against {round(summary['recentOvertime'])} in the last 7 days.",
        }
    )
    if summary["expectedWeekendWorkers"] >= 1:
        out.append(
            {
                "id": "fc-weekend",
                "tone": "moderate" if summary["expectedWeekendWorkers"] >= 6 else "positive",
                "title": "Weekend work is likely to continue",
                "detail": f"Based on recent rest days, about {round(summary['expectedWeekendWorkers'])} person-days of weekend work are expected.",
            }
        )
    easing = [p for p in people if p["trend"] == "easing"]
    if easing:
        out.append(
            {
                "id": "fc-easing",
                "tone": "positive",
                "title": f"{len(easing)} {'person’s' if len(easing) == 1 else 'people’s'} workload is easing",
                "detail": f"Hours are forecast to fall for {', '.join(p['name'].split(' ')[0] for p in easing[:3])}. It may be worth noting what changed.",
            }
        )
    return out


# --------------------------------------------------------------------------
# Engine store: one AnalyticsEngine built from SQLite, cached per process.
# --------------------------------------------------------------------------
_ENGINE: Optional[AnalyticsEngine] = None


def load_engine_from_db(db) -> AnalyticsEngine:
    from sqlalchemy import select

    from app.database.models import DailyActivity, Employee
    from app.ml.anomaly_detector import load_detector

    employees = [e.to_dict() for e in db.scalars(select(Employee).order_by(Employee.employee_id))]
    if not employees:
        raise ValueError("The database has no employees. Run: python -m app.data.generator && python -m app.data.seed_database")
    activity = [a.to_dict() for a in db.scalars(select(DailyActivity))]
    detector = load_detector()
    info = {"available": detector is not None}
    if detector is not None:
        info.update({k: detector.metadata.get(k) for k in ("backend", "trained_at", "training_rows", "evaluation", "training_window")})
    return AnalyticsEngine(employees, activity, detector=detector, model_info=info)


def get_engine(db) -> AnalyticsEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = load_engine_from_db(db)
    return _ENGINE


def reset_engine() -> None:
    """Drop the cached engine (after reseeding or retraining)."""
    global _ENGINE
    _ENGINE = None
