import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..database.models import ApplicationSettings
from ..schemas.employee import EmployeeSummary, EmployeeDetail, DailyRecordSummary
from ..schemas.analysis import AnalysisRequest, AnalysisResponse, AnomalyResult, ContributingFactor
from ..schemas.alert import AlertOut, AlertUpdate, AlertHistoryOut
from ..schemas.simulation import SimulationScenarioInput, SimulationResult
from ..schemas.settings import SettingsResponse, SettingsUpdate
from ..services.employee_service import (
    get_dashboard_summary_data,
    get_employees_list,
    get_employee_detail_by_id,
    get_analytics_trends_data,
    seed_database_if_empty,
)
from ..services.alert_service import (
    get_alerts_list,
    update_alert_record,
    get_alert_history,
)
from ..services.simulation_service import run_simulation_pipeline
from ..services.risk_engine import ExplainableRiskEngine
from ..ml.anomaly_detector import AnomalyDetectorService
from ..ml.features import extract_features_from_records

router = APIRouter(prefix="/api", tags=["MindGuard AI"])


@router.get("/health")
def get_health():
    detector = AnomalyDetectorService.get_instance()
    return {
        "status": "healthy",
        "service": "MindGuard AI Backend",
        "version": "1.0.0",
        "model_trained": detector.is_trained,
        "model_samples": detector.training_sample_count,
        "disclaimer": "Simulated wellbeing telemetry. Non-clinical, non-diagnostic platform.",
    }


@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    return get_dashboard_summary_data(db)


@router.get("/employees")
def get_employees(
    search: Optional[str] = Query(None, description="Search by name, ID or role"),
    department: Optional[str] = Query(None, description="Filter by department"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return get_employees_list(
        db,
        search=search,
        department=department,
        risk_category=risk_category,
        limit=limit,
        offset=offset,
    )


@router.get("/employees/{employee_id}", response_model=EmployeeDetail)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = get_employee_detail_by_id(db, employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' not found.",
        )
    return emp


@router.get("/employees/{employee_id}/history", response_model=List[DailyRecordSummary])
def get_employee_history(employee_id: str, db: Session = Depends(get_db)):
    emp = get_employee_detail_by_id(db, employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{employee_id}' not found.",
        )
    return emp.records


@router.post("/analysis/run", response_model=AnalysisResponse)
def run_analysis(request: AnalysisRequest, db: Session = Depends(get_db)):
    if not request.employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID is required for employee analysis.",
        )

    emp = get_employee_detail_by_id(db, request.employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{request.employee_id}' not found.",
        )

    # Re-evaluate live using current detector and risk engine
    detector = AnomalyDetectorService.get_instance()
    risk_engine = ExplainableRiskEngine()

    rec_dicts = [r.dict() for r in emp.records[-request.observation_days:]]
    feats = extract_features_from_records(rec_dicts, baseline_hours=emp.baseline_hours)
    
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
        observation_days=request.observation_days,
        total_records_available=len(rec_dicts),
    )

    return AnalysisResponse(
        subject_id=emp.id,
        assessment_date=emp.records[-1].record_date if emp.records else "2026-10-31",
        overall_risk_score=risk_eval["overall_risk_score"],
        risk_category=risk_eval["risk_category"],
        anomaly_detection=anomaly_res,
        contributing_factors=risk_eval["contributing_factors"],
        supporting_observations=risk_eval["supporting_observations"],
        observation_period=f"Last {len(rec_dicts)} observed days",
        data_completeness=risk_eval["data_completeness"],
        confidence_limitations=risk_eval["confidence_limitations"],
        recommended_next_steps=risk_eval["recommendations"],
        primary_explanation=risk_eval["primary_explanation"],
    )


@router.get("/alerts")
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    department: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return get_alerts_list(
        db,
        status=status_filter,
        department=department,
        limit=limit,
        offset=offset,
    )


@router.patch("/alerts/{alert_id}", response_model=AlertOut)
def patch_alert(alert_id: str, update_data: AlertUpdate, db: Session = Depends(get_db)):
    updated = update_alert_record(db, alert_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found.",
        )
    return updated


@router.get("/alerts/{alert_id}/history", response_model=List[AlertHistoryOut])
def get_alert_audit_history(alert_id: str, db: Session = Depends(get_db)):
    return get_alert_history(db, alert_id)


@router.get("/analytics/trends")
def get_analytics_trends(
    department: Optional[str] = None,
    days: int = Query(30, ge=7, le=60),
    db: Session = Depends(get_db),
):
    return get_analytics_trends_data(db, department=department, days=days)


@router.post("/simulation/run", response_model=SimulationResult)
def run_simulation(scenario: SimulationScenarioInput, db: Session = Depends(get_db)):
    detector = AnomalyDetectorService.get_instance()
    # Read current weights from settings
    settings_rows = db.query(ApplicationSettings).all()
    weights_dict = {s.key: float(s.value) for s in settings_rows if s.value.replace('.', '', 1).isdigit()}

    risk_engine = ExplainableRiskEngine(
        hours_weight=weights_dict.get("hours_weight", 25.0),
        late_night_weight=weights_dict.get("late_night_weight", 20.0),
        task_trend_weight=weights_dict.get("task_trend_weight", 25.0),
        breaks_weight=weights_dict.get("breaks_weight", 15.0),
        weekend_weight=weights_dict.get("weekend_weight", 15.0),
    )

    return run_simulation_pipeline(
        scenario=scenario,
        risk_engine=risk_engine,
        anomaly_detector=detector,
    )


@router.post("/data/generate")
def regenerate_data(seed: int = Query(42), db: Session = Depends(get_db)):
    result = seed_database_if_empty(db, force=True)
    return {
        "status": "success",
        "message": "Synthetic dataset regenerated successfully with 100 simulated employees.",
        "details": result,
    }


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(ApplicationSettings).all()
    settings_dict = {}
    for r in rows:
        try:
            settings_dict[r.key] = float(r.value)
        except ValueError:
            pass

    return SettingsResponse(
        hours_weight=settings_dict.get("hours_weight", 25.0),
        late_night_weight=settings_dict.get("late_night_weight", 20.0),
        task_trend_weight=settings_dict.get("task_trend_weight", 25.0),
        breaks_weight=settings_dict.get("breaks_weight", 15.0),
        weekend_weight=settings_dict.get("weekend_weight", 15.0),
        alert_risk_threshold=settings_dict.get("alert_risk_threshold", 60.0),
    )


@router.patch("/settings", response_model=SettingsResponse)
def update_settings(update_data: SettingsUpdate, db: Session = Depends(get_db)):
    mapping = {
        "hours_weight": update_data.hours_weight,
        "late_night_weight": update_data.late_night_weight,
        "task_trend_weight": update_data.task_trend_weight,
        "breaks_weight": update_data.breaks_weight,
        "weekend_weight": update_data.weekend_weight,
        "alert_risk_threshold": update_data.alert_risk_threshold,
    }
    for k, v in mapping.items():
        row = db.query(ApplicationSettings).filter(ApplicationSettings.key == k).first()
        if row:
            row.value = str(v)
        else:
            db.add(ApplicationSettings(key=k, value=str(v)))

    db.commit()
    return get_settings(db)
