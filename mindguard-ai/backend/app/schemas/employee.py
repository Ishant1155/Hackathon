"""Employee and assessment response schemas.

Field names match the existing React frontend (camelCase) exactly; see
the frontend's src/services/README.md.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.schemas.base import ApiModel


class PeriodSummary(ApiModel):
    avgHours: Optional[float] = None
    breaksPerDay: Optional[float] = None
    productivity: Optional[float] = None
    tasksPerDay: Optional[float] = None
    overtimeHours: Optional[float] = None
    overtimePerWeek: Optional[float] = None
    lateNightSessions: int = 0
    lateNightPerWeek: Optional[float] = None
    weekendDays: int = 0
    weekendDaysPerWeek: Optional[float] = None
    totalHours: Optional[float] = None
    days: int = 0


class Indicator(ApiModel):
    score: Optional[int] = None  # None when data is insufficient
    level: str  # low | moderate | elevated | insufficient_data
    levelLabel: str
    previousScore: Optional[int] = None
    previousLevel: str
    productivityChange: Optional[float] = None
    dataSufficiency: str


class Anomaly(ApiModel):
    status: str  # scored | insufficient_data | model_unavailable
    detected: Optional[bool] = None
    prediction: Optional[int] = None  # -1 unusual, 1 not flagged
    anomalyScore: Optional[float] = None
    drivers: List[Dict[str, Any]] = []


class Factor(ApiModel):
    key: str
    label: str
    value: Optional[float] = None
    unit: str
    points: int
    maxPoints: int
    status: str
    explanation: str


class Recommendation(ApiModel):
    key: str
    recommendation: str
    rationale: str
    actions: List[str] = []


class EmployeeSummary(ApiModel):
    id: str
    name: str
    department: str
    designation: str
    location: str
    startDate: Optional[str] = None
    simulated: bool = True
    metrics: PeriodSummary
    baseline: PeriodSummary
    indicator: Indicator
    anomaly: Anomaly


class EmployeeDetail(EmployeeSummary):
    factors: List[Factor]
    dataSufficiency: str
    indicatorSummary: str
    recommendations: List[Recommendation]
    insights: List[Dict[str, Any]]
    disclaimer: str


class EmployeeHistory(ApiModel):
    employeeId: str
    range: Dict[str, str]
    baseline: PeriodSummary
    current: PeriodSummary
    daily: List[Dict[str, Any]]
    weekly: List[Dict[str, Any]]


class AssessmentOut(ApiModel):
    id: int
    employee_id: str
    assessment_date: str
    anomaly_detected: Optional[bool] = None
    anomaly_score: Optional[float] = None
    indicator_score: Optional[int] = None
    indicator_level: str
    data_sufficiency: str
    explanation: str
    recommendation: str
    contributing_factors: List[Dict[str, Any]]
    created_at: str


class AnalysisResult(ApiModel):
    status: str  # completed | insufficient_data
    employee_id: str
    employee_name: str
    assessment_date: str
    data_sufficiency: str
    anomaly_detected: Optional[bool] = None
    anomaly_score: Optional[float] = None
    indicator_score: Optional[int] = None
    indicator_level: str
    contributing_factors: List[Dict[str, Any]]
    explanation: str
    recommendations: List[Recommendation]
    assessment_id: Optional[int] = None
