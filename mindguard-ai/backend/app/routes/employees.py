"""Employee routes: directory, profile, history, forecast, analysis and assessments."""

from __future__ import annotations

import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Assessment
from app.ml.forecaster import InsufficientHistory
from app.schemas.analytics import EmployeeForecast
from app.schemas.base import Envelope
from app.schemas.employee import AnalysisResult, AssessmentOut, EmployeeDetail, EmployeeHistory, EmployeeSummary
from app.services.analysis_service import EmployeeNotFound, get_engine
from app.services.recommendation import recommendation_text

router = APIRouter(tags=["employees"])

LEVELS = {"low", "moderate", "elevated", "insufficient_data"}


def _engine(db: Session = Depends(get_db)):
    return get_engine(db)


def _not_found(exc: EmployeeNotFound):
    return HTTPException(status_code=404, detail=str(exc))


@router.get("/employees", response_model=Envelope, summary="Employee directory")
def list_employees(
    search: str = Query("", max_length=80, description="Matches name, ID, designation or department"),
    q: Optional[str] = Query(None, max_length=80, description="Alias of `search`"),
    department: str = Query("", max_length=40),
    level: str = Query("", description="low | moderate | elevated | insufficient_data"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    engine=Depends(_engine),
):
    if level and level not in LEVELS:
        raise HTTPException(status_code=422, detail=f"level must be one of {sorted(LEVELS)}")
    rows = engine.list_employees(search=q if q is not None else search, department=department, level=level)
    start = (page - 1) * page_size
    items = [EmployeeSummary(**r) for r in rows[start : start + page_size]]
    total = len(rows)
    return {
        "data": items,
        "meta": engine.meta(pagination={"page": page, "pageSize": page_size, "total": total, "pages": max(1, -(-total // page_size))}),
    }


@router.get("/employees/{employee_id}", response_model=Envelope, summary="Employee profile with factors, insights and recommendations")
def get_employee(employee_id: str, engine=Depends(_engine)):
    try:
        return {"data": EmployeeDetail(**engine.employee_detail(employee_id)), "meta": engine.meta()}
    except EmployeeNotFound as exc:
        raise _not_found(exc)


@router.get("/employees/{employee_id}/history", response_model=Envelope, summary="Daily activity and weekly buckets")
def get_history(
    employee_id: str,
    start: Optional[date] = Query(None, description="YYYY-MM-DD (default: 30 days before `end`)"),
    end: Optional[date] = Query(None, description="YYYY-MM-DD (default: latest data date)"),
    engine=Depends(_engine),
):
    try:
        payload = engine.employee_history(employee_id, start.isoformat() if start else None, end.isoformat() if end else None)
    except EmployeeNotFound as exc:
        raise _not_found(exc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"data": EmployeeHistory(**payload), "meta": engine.meta()}


@router.get("/employees/{employee_id}/forecast", response_model=Envelope, summary="7-day forecast for one employee")
def get_employee_forecast(employee_id: str, engine=Depends(_engine)):
    try:
        return {"data": EmployeeForecast(**engine.employee_forecast(employee_id)), "meta": engine.meta()}
    except EmployeeNotFound as exc:
        raise _not_found(exc)
    except InsufficientHistory as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/analyze/{employee_id}", response_model=Envelope, tags=["analysis"], summary="Run the full analysis and save an assessment")
def analyze(employee_id: str, db: Session = Depends(get_db), engine=Depends(_engine)):
    try:
        result = engine.analyze(employee_id)
    except EmployeeNotFound as exc:
        raise _not_found(exc)
    record = Assessment(
        employee_id=result["employee_id"],
        assessment_date=date.fromisoformat(result["assessment_date"]),
        anomaly_detected=result["anomaly_detected"],
        anomaly_score=result["anomaly_score"],
        indicator_score=result["indicator_score"],
        indicator_level=result["indicator_level"],
        data_sufficiency=result["data_sufficiency"],
        explanation=result["explanation"],
        recommendation=recommendation_text(result["recommendations"]),
        factors_json=json.dumps(result["contributing_factors"]),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"data": AnalysisResult(**result, assessment_id=record.id), "meta": engine.meta()}


@router.get("/assessments/{employee_id}", response_model=Envelope, tags=["analysis"], summary="Saved assessments, newest first")
def list_assessments(employee_id: str, limit: int = Query(20, ge=1, le=200), db: Session = Depends(get_db), engine=Depends(_engine)):
    try:
        emp_id = engine.get(employee_id)["employee_id"]
    except EmployeeNotFound as exc:
        raise _not_found(exc)
    rows = db.scalars(select(Assessment).where(Assessment.employee_id == emp_id).order_by(Assessment.created_at.desc(), Assessment.id.desc()).limit(limit))
    items = [
        AssessmentOut(
            id=r.id,
            employee_id=r.employee_id,
            assessment_date=r.assessment_date.isoformat(),
            anomaly_detected=r.anomaly_detected,
            anomaly_score=r.anomaly_score,
            indicator_score=r.indicator_score,
            indicator_level=r.indicator_level,
            data_sufficiency=r.data_sufficiency,
            explanation=r.explanation,
            recommendation=r.recommendation,
            contributing_factors=json.loads(r.factors_json or "[]"),
            created_at=r.created_at.isoformat(timespec="seconds"),
        )
        for r in rows
    ]
    return {"data": items, "meta": engine.meta()}
