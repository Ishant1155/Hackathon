from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    created_date: str
    risk_category: str
    risk_score: float
    title: str
    explanation: str
    contributing_factors: str
    recommended_action: str
    status: str
    reviewer_notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    follow_up_completed: bool = False
    updated_at: Optional[datetime] = None


class AlertUpdate(BaseModel):
    status: Optional[str] = None  # "Open", "Under Review", "Follow-up Scheduled", "Resolved"
    reviewer_notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    follow_up_completed: Optional[bool] = None


class AlertHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime
