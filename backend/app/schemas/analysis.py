from pydantic import BaseModel, Field
from typing import List, Optional


class ContributingFactor(BaseModel):
    name: str
    score: float
    max_score: float
    severity: str  # "normal", "moderate", "high"
    title: str
    description: str
    evidence: str


class AnomalyResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float  # Normalized 0 to 1
    raw_decision_score: float
    model_name: str = "IsolationForest"
    interpretation: str


class AnalysisRequest(BaseModel):
    employee_id: Optional[str] = None
    observation_days: int = Field(default=30, ge=7, le=60)


class AnalysisResponse(BaseModel):
    subject_id: str
    assessment_date: str
    overall_risk_score: float  # 0 to 100
    risk_category: str  # "Low concern", "Moderate concern", "Elevated concern", "High priority for human review"
    anomaly_detection: AnomalyResult
    contributing_factors: List[ContributingFactor]
    supporting_observations: List[str]
    observation_period: str
    data_completeness: str
    confidence_limitations: str
    recommended_next_steps: List[str]
    primary_explanation: str
