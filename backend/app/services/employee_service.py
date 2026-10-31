import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database.models import (
    Employee,
    DailyRecord,
    WellbeingAssessment,
    Alert,
    AlertReviewHistory,
    ApplicationSettings,
)
from ..schemas.employee import EmployeeSummary, EmployeeDetail, DailyRecordSummary
from ..schemas.analysis import AnomalyResult, ContributingFactor
from ..ml.features import extract_features_from_records
from ..ml.anomaly_detector import AnomalyDetectorService
from .risk_engine import ExplainableRiskEngine
from .data_generator import generate_synthetic_dataset

logger = logging.getLogger("mindguard.employee_service")


def seed_database_if_empty(db: Session, force: bool = False) -> Dict[str, Any]:
    """
    Checks if database contains employees. If empty or forced, seeds it with 100 synthetic employees,
    trains the Isolation Forest model, generates assessments, and creates initial alerts.
    """
    existing_count = db.query(Employee).count()
    if existing_count > 0 and not force:
        logger.info(f"Database already populated with {existing_count} employees. Training model on existing data...")
        # Train model on existing data
        _train_model_on_db(db)
        return {"status": "already_seeded", "employee_count": existing_count}

    if force:
        logger.info("Force regeneration requested. Clearing existing records...")
        db.query(AlertReviewHistory).delete()
        db.query(Alert).delete()
        db.query(WellbeingAssessment).delete()
        db.query(DailyRecord).delete()
        db.query(Employee).delete()
        db.commit()

    logger.info("Generating synthetic 100-employee dataset (30 days of records)...")
    employees_data, records_data = generate_synthetic_dataset(employee_count=100, days=30, seed=42)

    # Insert Employees
    emp_objs = [
        Employee(
            id=e["id"],
            name=e["name"],
            department=e["department"],
            role=e["role"],
            schedule=e["schedule"],
            profile_type=e["profile_type"],
            baseline_hours=e["baseline_hours"],
        )
        for e in employees_data
    ]
    db.add_all(emp_objs)
    db.commit()

    # Insert Records in batches
    batch_size = 500
    for i in range(0, len(records_data), batch_size):
        batch = [
            DailyRecord(
                employee_id=r["employee_id"],
                record_date=r["record_date"],
                day_of_week=r["day_of_week"],
                work_start_time=r["work_start_time"],
                work_end_time=r["work_end_time"],
                working_hours=r["working_hours"],
                break_count=r["break_count"],
                avg_break_duration=r["avg_break_duration"],
                late_night_active=r["late_night_active"],
                weekend_work=r["weekend_work"],
                tasks_completed=r["tasks_completed"],
                task_completion_trend=r["task_completion_trend"],
                workload_indicator=r["workload_indicator"],
                historical_productivity_index=r["historical_productivity_index"],
                recovery_hours=r["recovery_hours"],
            )
            for r in records_data[i:i + batch_size]
        ]
        db.add_all(batch)
    db.commit()

    # Train Isolation Forest on newly inserted records
    _train_model_on_db(db)

    # Run initial wellbeing assessments and generate alerts
    _run_assessments_and_alerts_for_all(db)

    # Initialize default settings if not present
    _init_default_settings(db)

    total_emps = db.query(Employee).count()
    total_recs = db.query(DailyRecord).count()
    total_alerts = db.query(Alert).count()
    logger.info(f"Seeding complete: {total_emps} employees, {total_recs} records, {total_alerts} alerts.")
    return {
        "status": "seeded",
        "employee_count": total_emps,
        "records_count": total_recs,
        "alerts_count": total_alerts,
    }


def _train_model_on_db(db: Session):
    detector = AnomalyDetectorService.get_instance()
    employees = db.query(Employee).all()
    feature_rows = []

    for emp in employees:
        records = (
            db.query(DailyRecord)
            .filter(DailyRecord.employee_id == emp.id)
            .order_by(DailyRecord.record_date.asc())
            .all()
        )
        rec_dicts = [r.__dict__ for r in records]
        feats = extract_features_from_records(rec_dicts, baseline_hours=emp.baseline_hours)
        feature_rows.append(feats)

    detector.fit(feature_rows)


def _run_assessments_and_alerts_for_all(db: Session):
    detector = AnomalyDetectorService.get_instance()
    risk_engine = ExplainableRiskEngine()
    employees = db.query(Employee).all()

    for emp in employees:
        records = (
            db.query(DailyRecord)
            .filter(DailyRecord.employee_id == emp.id)
            .order_by(DailyRecord.record_date.asc())
            .all()
        )
        rec_dicts = [r.__dict__ for r in records]
        feats = extract_features_from_records(rec_dicts, baseline_hours=emp.baseline_hours)
        
        # Inference
        anomaly_dict = detector.predict(feats)
        anomaly_res = AnomalyResult(
            is_anomaly=anomaly_dict["is_anomaly"],
            anomaly_score=anomaly_dict["anomaly_score"],
            raw_decision_score=anomaly_dict["raw_decision_score"],
            model_name=anomaly_dict["model_name"],
            interpretation=anomaly_dict["interpretation"],
        )

        risk_eval = risk_engine.calculate_risk(
            features=feats,
            anomaly_res=anomaly_res,
            observation_days=len(records),
            total_records_available=len(records),
        )

        latest_date = records[-1].record_date if records else datetime.now().strftime("%Y-%m-%d")

        assessment = WellbeingAssessment(
            employee_id=emp.id,
            assessment_date=latest_date,
            overall_risk_score=risk_eval["overall_risk_score"],
            risk_category=risk_eval["risk_category"],
            is_anomaly=anomaly_res.is_anomaly,
            anomaly_score=anomaly_res.anomaly_score,
            hours_score=risk_eval["hours_score"],
            late_night_score=risk_eval["late_night_score"],
            task_trend_score=risk_eval["task_trend_score"],
            break_score=risk_eval["break_score"],
            weekend_score=risk_eval["weekend_score"],
            anomaly_modifier=risk_eval["anomaly_modifier"],
            primary_explanation=risk_eval["primary_explanation"],
            contributing_factors_json=json.dumps([cf.dict() for cf in risk_eval["contributing_factors"]]),
            supporting_observations_json=json.dumps(risk_eval["supporting_observations"]),
            recommendations_json=json.dumps(risk_eval["recommendations"]),
            data_completeness=risk_eval["data_completeness"],
            confidence_limitations=risk_eval["confidence_limitations"],
        )
        db.add(assessment)

        # Generate alert if risk >= 60.0
        if risk_eval["overall_risk_score"] >= 60.0:
            top_factors = [cf.title for cf in risk_eval["contributing_factors"] if cf.severity in ["high", "moderate"]]
            factors_str = ", ".join(top_factors) if top_factors else "Multiple concurrent workload indicators"
            rec_action = risk_eval["recommendations"][0] if risk_eval["recommendations"] else "Schedule informal check-in."

            alert = Alert(
                id=f"ALT-{emp.id}-{latest_date}",
                employee_id=emp.id,
                created_date=latest_date,
                risk_category=risk_eval["risk_category"],
                risk_score=risk_eval["overall_risk_score"],
                title=f"Potential sustained overwork pattern detected for {emp.name}",
                explanation=risk_eval["primary_explanation"],
                contributing_factors=factors_str,
                recommended_action=rec_action,
                status="Open",
            )
            db.add(alert)

    db.commit()


def _init_default_settings(db: Session):
    defaults = {
        "hours_weight": ("25.0", "Weight for sustained extended working hours"),
        "late_night_weight": ("20.0", "Weight for repeated late-night sessions"),
        "task_trend_weight": ("25.0", "Weight for declining task completion trend"),
        "breaks_weight": ("15.0", "Weight for reduced recorded breaks"),
        "weekend_weight": ("15.0", "Weight for repeated weekend work"),
        "alert_risk_threshold": ("60.0", "Risk score threshold to trigger an alert"),
    }
    for k, (v, desc) in defaults.items():
        exists = db.query(ApplicationSettings).filter(ApplicationSettings.key == k).first()
        if not exists:
            db.add(ApplicationSettings(key=k, value=v, description=desc))
    db.commit()


def get_dashboard_summary_data(db: Session) -> Dict[str, Any]:
    total_employees = db.query(Employee).count()
    if total_employees == 0:
        return {
            "total_simulated_employees": 0,
            "requiring_review": 0,
            "sustained_extended_hours": 0,
            "average_daily_hours": 0.0,
            "open_alerts": 0,
            "average_risk_score": 0.0,
            "risk_distribution": {"Low concern": 0, "Moderate concern": 0, "Elevated concern": 0, "High priority": 0},
        }

    # Latest assessment per employee
    subq = (
        db.query(
            WellbeingAssessment.employee_id,
            func.max(WellbeingAssessment.id).label("max_id")
        )
        .group_by(WellbeingAssessment.employee_id)
        .subquery()
    )
    latest_assessments = (
        db.query(WellbeingAssessment)
        .join(subq, WellbeingAssessment.id == subq.c.max_id)
        .all()
    )

    scores = [a.overall_risk_score for a in latest_assessments]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    requiring_review = sum(1 for a in latest_assessments if a.overall_risk_score >= 60.0)

    # Categories
    risk_distribution = {
        "Low concern": sum(1 for a in latest_assessments if a.risk_category == "Low concern"),
        "Moderate concern": sum(1 for a in latest_assessments if a.risk_category == "Moderate concern"),
        "Elevated concern": sum(1 for a in latest_assessments if a.risk_category == "Elevated concern"),
        "High priority": sum(1 for a in latest_assessments if "High priority" in a.risk_category),
    }

    # Sustained extended hours: employees with average 14d hours >= 10.0
    # Average daily hours across the board
    avg_hours_query = db.query(func.avg(DailyRecord.working_hours)).filter(DailyRecord.working_hours > 0).scalar() or 0.0

    emp_hours_sub = (
        db.query(
            DailyRecord.employee_id,
            func.avg(DailyRecord.working_hours).label("avg_hrs")
        )
        .filter(DailyRecord.working_hours > 0)
        .group_by(DailyRecord.employee_id)
        .having(func.avg(DailyRecord.working_hours) >= 10.0)
        .count()
    )

    open_alerts = db.query(Alert).filter(Alert.status == "Open").count()

    return {
        "total_simulated_employees": total_employees,
        "requiring_review": requiring_review,
        "sustained_extended_hours": emp_hours_sub,
        "average_daily_hours": round(float(avg_hours_query), 1),
        "open_alerts": open_alerts,
        "average_risk_score": avg_score,
        "risk_distribution": risk_distribution,
    }


def get_employees_list(
    db: Session,
    search: Optional[str] = None,
    department: Optional[str] = None,
    risk_category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    query = db.query(Employee)

    if department and department != "All":
        query = query.filter(Employee.department == department)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Employee.id.ilike(search_fmt)) |
            (Employee.name.ilike(search_fmt)) |
            (Employee.role.ilike(search_fmt))
        )

    all_matching_emps = query.all()
    results = []

    for emp in all_matching_emps:
        records = (
            db.query(DailyRecord)
            .filter(DailyRecord.employee_id == emp.id)
            .order_by(DailyRecord.record_date.asc())
            .all()
        )
        rec_dicts = [r.__dict__ for r in records]
        feats = extract_features_from_records(rec_dicts, baseline_hours=emp.baseline_hours)

        latest_assessment = (
            db.query(WellbeingAssessment)
            .filter(WellbeingAssessment.employee_id == emp.id)
            .order_by(desc(WellbeingAssessment.id))
            .first()
        )

        score = latest_assessment.overall_risk_score if latest_assessment else 0.0
        cat = latest_assessment.risk_category if latest_assessment else "Low concern"
        is_ano = latest_assessment.is_anomaly if latest_assessment else False
        ano_score = latest_assessment.anomaly_score if latest_assessment else 0.0
        ass_date = latest_assessment.assessment_date if latest_assessment else None

        if risk_category and risk_category != "All":
            if risk_category.lower() not in cat.lower():
                continue

        results.append(
            EmployeeSummary(
                id=emp.id,
                name=emp.name,
                department=emp.department,
                role=emp.role,
                schedule=emp.schedule,
                profile_type=emp.profile_type,
                baseline_hours=emp.baseline_hours,
                avg_hours_7d=feats["avg_hours_7d"],
                avg_hours_30d=round(sum(r.working_hours for r in records if r.working_hours > 0) / max(1, sum(1 for r in records if r.working_hours > 0)), 1),
                avg_breaks_7d=feats["avg_breaks_7d"],
                late_night_count_14d=feats["late_night_count_14d"],
                weekend_days_count_14d=feats["weekend_days_count_14d"],
                task_completion_trend=feats["task_completion_change_ratio"],
                risk_score=score,
                risk_category=cat,
                is_anomaly=is_ano,
                anomaly_score=ano_score,
                last_assessment_date=ass_date,
            )
        )

    # Sort so high-risk and demo profiles appear near top
    def sort_key(item: EmployeeSummary):
        # Demo profiles first, then by risk score descending
        if item.id in ["EMP-001", "EMP-002", "EMP-003"]:
            order = {"EMP-003": 3, "EMP-002": 2, "EMP-001": 1}
            return (1, order.get(item.id, 0), item.risk_score)
        return (0, 0, item.risk_score)

    results.sort(key=sort_key, reverse=True)

    paginated = results[offset:offset + limit]
    return {
        "total": len(results),
        "limit": limit,
        "offset": offset,
        "items": paginated,
    }


def get_employee_detail_by_id(db: Session, employee_id: str) -> Optional[EmployeeDetail]:
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return None

    records = (
        db.query(DailyRecord)
        .filter(DailyRecord.employee_id == emp.id)
        .order_by(DailyRecord.record_date.asc())
        .all()
    )
    rec_dicts = [r.__dict__ for r in records]
    feats = extract_features_from_records(rec_dicts, baseline_hours=emp.baseline_hours)

    assessment = (
        db.query(WellbeingAssessment)
        .filter(WellbeingAssessment.employee_id == emp.id)
        .order_by(desc(WellbeingAssessment.id))
        .first()
    )

    if not assessment:
        # Generate on the fly if missing
        _train_model_on_db(db)
        _run_assessments_and_alerts_for_all(db)
        assessment = (
            db.query(WellbeingAssessment)
            .filter(WellbeingAssessment.employee_id == emp.id)
            .order_by(desc(WellbeingAssessment.id))
            .first()
        )

    contributing_factors = json.loads(assessment.contributing_factors_json or "[]")
    supporting_observations = json.loads(assessment.supporting_observations_json or "[]")
    recommendations = json.loads(assessment.recommendations_json or "[]")

    work_days_count = sum(1 for r in records if r.working_hours > 0)
    avg_30d = round(sum(r.working_hours for r in records if r.working_hours > 0) / max(1, work_days_count), 1)

    rec_summaries = [
        DailyRecordSummary(
            record_date=r.record_date,
            day_of_week=r.day_of_week,
            working_hours=r.working_hours,
            break_count=r.break_count,
            avg_break_duration=r.avg_break_duration,
            late_night_active=r.late_night_active,
            weekend_work=r.weekend_work,
            tasks_completed=r.tasks_completed,
            task_completion_trend=r.task_completion_trend,
            workload_indicator=r.workload_indicator,
            recovery_hours=r.recovery_hours,
        )
        for r in records
    ]

    return EmployeeDetail(
        id=emp.id,
        name=emp.name,
        department=emp.department,
        role=emp.role,
        schedule=emp.schedule,
        profile_type=emp.profile_type,
        baseline_hours=emp.baseline_hours,
        avg_hours_7d=feats["avg_hours_7d"],
        avg_hours_30d=avg_30d,
        avg_breaks_7d=feats["avg_breaks_7d"],
        late_night_count_14d=feats["late_night_count_14d"],
        weekend_days_count_14d=feats["weekend_days_count_14d"],
        task_completion_trend=feats["task_completion_change_ratio"],
        risk_score=assessment.overall_risk_score,
        risk_category=assessment.risk_category,
        is_anomaly=assessment.is_anomaly,
        anomaly_score=assessment.anomaly_score,
        primary_explanation=assessment.primary_explanation,
        contributing_factors=contributing_factors,
        supporting_observations=supporting_observations,
        recommendations=recommendations,
        data_completeness=assessment.data_completeness,
        confidence_limitations=assessment.confidence_limitations,
        records=rec_summaries,
    )


def get_analytics_trends_data(db: Session, department: Optional[str] = None, days: int = 30) -> List[Dict[str, Any]]:
    """
    Computes daily time-series metrics across employees for Recharts.
    """
    query = db.query(DailyRecord)
    if department and department != "All":
        query = query.join(Employee, DailyRecord.employee_id == Employee.id).filter(Employee.department == department)

    all_records = query.all()
    if not all_records:
        return []

    # Group by record_date
    by_date: Dict[str, List[DailyRecord]] = {}
    for r in all_records:
        by_date.setdefault(r.record_date, []).append(r)

    sorted_dates = sorted(by_date.keys())[-days:]
    trend_points = []

    for d in sorted_dates:
        day_recs = by_date[d]
        active_recs = [r for r in day_recs if r.working_hours > 0]
        count = len(day_recs)
        active_count = len(active_recs)

        if active_count > 0:
            avg_hours = round(sum(r.working_hours for r in active_recs) / active_count, 1)
            avg_tasks = round(sum(r.tasks_completed for r in active_recs) / active_count, 1)
            avg_breaks = round(sum(r.break_count for r in active_recs) / active_count, 1)
            late_night_pct = round((sum(1 for r in active_recs if r.late_night_active) / active_count) * 100, 1)
            overtime_count = sum(1 for r in active_recs if r.working_hours >= 10.0)
            overtime_pct = round((overtime_count / active_count) * 100, 1)
        else:
            avg_hours = 0.0
            avg_tasks = 0.0
            avg_breaks = 0.0
            late_night_pct = 0.0
            overtime_pct = 0.0

        trend_points.append({
            "date": d,
            "short_date": d[5:],  # MM-DD
            "avg_working_hours": avg_hours,
            "avg_tasks_completed": avg_tasks,
            "avg_breaks": avg_breaks,
            "late_night_pct": late_night_pct,
            "overtime_pct": overtime_pct,
            "active_employees": active_count,
        })

    return trend_points
