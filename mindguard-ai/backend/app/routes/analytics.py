"""Organisation analytics: overview, insights, trends, departments, forecast, model report."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core import config
from app.database.connection import get_db
from app.ml.forecaster import InsufficientHistory
from app.schemas.analytics import Department, Forecast, Insight, Overview, Trends
from app.schemas.base import Envelope
from app.services.analysis_service import get_engine

router = APIRouter(prefix="/analytics", tags=["analytics"])

INSIGHT_TYPES = {"hours", "breaks", "lateNight", "weekend", "tasks", "improvement"}
SEVERITIES = {"elevated", "moderate", "positive"}


def _engine(db: Session = Depends(get_db)):
    return get_engine(db)


@router.get("/overview", response_model=Envelope, summary="KPIs, weekly hours, distribution, departments, insights, check-ins")
def overview(engine=Depends(_engine)):
    return {"data": Overview(**engine.overview()), "meta": engine.meta()}


@router.get("/insights", response_model=Envelope, summary="Explainable behavioural observations")
def insights(
    type: str = Query("", description=f"One of {sorted(INSIGHT_TYPES)}"),
    severity: str = Query("", description="elevated | moderate | positive"),
    department: str = Query("", max_length=40),
    engine=Depends(_engine),
):
    if type and type not in INSIGHT_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {sorted(INSIGHT_TYPES)}")
    if severity and severity not in SEVERITIES:
        raise HTTPException(status_code=422, detail=f"severity must be one of {sorted(SEVERITIES)}")
    items = [
        i
        for i in engine.all_insights
        if (not type or i["type"] == type) and (not severity or i["severity"] == severity) and (not department or i["department"].lower() == department.lower())
    ]
    return {"data": [Insight(**i) for i in items], "meta": engine.meta(total=len(items))}


@router.get("/trends", response_model=Envelope, summary="Current window vs the previous window")
def trends(range: int = Query(30, description="7 or 30 days"), engine=Depends(_engine)):
    if range not in (7, 30):
        raise HTTPException(status_code=422, detail="range must be 7 or 30")
    return {"data": Trends(**engine.trends(range)), "meta": engine.meta(range=range)}


@router.get("/departments", response_model=Envelope, summary="Department-level summaries")
def departments(engine=Depends(_engine)):
    return {"data": [Department(**d) for d in engine.departments()], "meta": engine.meta()}


@router.get("/forecast", response_model=Envelope, summary="7-day organisation workload forecast")
def forecast(engine=Depends(_engine)):
    try:
        return {"data": Forecast(**engine.forecast()), "meta": engine.meta()}
    except InsufficientHistory as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/model", response_model=Envelope, summary="Anomaly model status and evaluation report")
def model_report(engine=Depends(_engine)):
    report = json.loads(config.EVALUATION_REPORT_PATH.read_text()) if config.EVALUATION_REPORT_PATH.exists() else None
    return {"data": {"model": engine.model_info, "evaluation": report}, "meta": engine.meta()}
