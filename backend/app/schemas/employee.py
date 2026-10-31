from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class DailyRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_date: str
    day_of_week: str
    working_hours: float
    break_count: int
    avg_break_duration: float
    late_night_active: bool
    weekend_work: bool
    tasks_completed: int
    task_completion_trend: float
    workload_indicator: float
    recovery_hours: float


class EmployeeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    department: str
    role: str
    schedule: str
    profile_type: str
    baseline_hours: float
    avg_hours_7d: float
    avg_hours_30d: float
    avg_breaks_7d: float
    late_night_count_14d: int
    weekend_days_count_14d: int
    task_completion_trend: float
    risk_score: float
    risk_category: str
    is_anomaly: bool
    anomaly_score: float
    last_assessment_date: Optional[str] = None


class EmployeeDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    department: str
    role: str
    schedule: str
    profile_type: str
    baseline_hours: float
    avg_hours_7d: float
    avg_hours_30d: float
    avg_breaks_7d: float
    late_night_count_14d: int
    weekend_days_count_14d: int
    task_completion_trend: float
    risk_score: float
    risk_category: str
    is_anomaly: bool
    anomaly_score: float
    primary_explanation: str
    contributing_factors: List[dict]
    supporting_observations: List[str]
    recommendations: List[str]
    data_completeness: str
    confidence_limitations: Optional[str] = None
    records: List[DailyRecordSummary] = []
