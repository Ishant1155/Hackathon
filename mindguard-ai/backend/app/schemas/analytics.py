"""Analytics response schemas (Overview, Insights, Trends, Forecast, Departments)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.schemas.base import ApiModel


class Comparison(ApiModel):
    current: Optional[float] = None
    previous: Optional[float] = None
    change: Optional[float] = None
    changePct: Optional[float] = None


class OverviewKpis(ApiModel):
    totalEmployees: int
    departments: int
    elevated: Dict[str, int]
    moderate: Dict[str, int]
    avgWorkingHours: Comparison
    avgProductivity: Comparison


class Overview(ApiModel):
    kpis: OverviewKpis
    weeklyHours: List[Dict[str, Any]]
    distribution: List[Dict[str, Any]]
    departments: List[Dict[str, Any]]
    recentInsights: List[Dict[str, Any]]
    checkIns: List[Dict[str, Any]]


class Insight(ApiModel):
    id: str
    employeeId: str
    employeeName: str
    department: str
    designation: str
    indicatorLevel: str
    type: str
    severity: str
    title: str
    metric: Dict[str, Any]
    comparison: Dict[str, Any]
    whatChanged: str
    whyItMatters: str
    suggestion: str


class Trends(ApiModel):
    range: int
    current: Dict[str, str]
    previous: Dict[str, str]
    summary: Dict[str, Comparison]
    daily: List[Dict[str, Any]]
    weekend: List[Dict[str, Any]]


class Department(ApiModel):
    department: str
    headcount: int
    avgHours: Optional[float] = None
    previousAvgHours: Optional[float] = None
    avgScore: Optional[float] = None
    low: int
    moderate: int
    elevated: int


class Forecast(ApiModel):
    model: Dict[str, Any]
    historyRange: Dict[str, str]
    horizon: Dict[str, str]
    days: List[Dict[str, Any]]
    history: List[Dict[str, Any]]
    summary: Dict[str, Any]
    departments: List[Dict[str, Any]]
    employees: List[Dict[str, Any]]
    insights: List[Dict[str, Any]]


class EmployeeForecast(ApiModel):
    employeeId: str
    model: Dict[str, Any]
    horizon: Dict[str, str]
    days: List[Dict[str, Any]]
    history: List[Dict[str, Any]]
    summary: Dict[str, Any]
