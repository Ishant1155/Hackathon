from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from .analysis import ContributingFactor, AnomalyResult


class SimulationScenarioInput(BaseModel):
    preset_name: Optional[str] = None
    daily_working_hours: float = Field(default=8.0, ge=4.0, le=16.0, description="Average daily working hours")
    break_count: int = Field(default=3, ge=0, le=8, description="Number of daily breaks taken")
    avg_break_duration: float = Field(default=15.0, ge=5.0, le=60.0, description="Average minutes per break")
    late_night_sessions_per_week: int = Field(default=0, ge=0, le=7, description="Late-night work sessions per week")
    weekend_days_per_month: int = Field(default=0, ge=0, le=8, description="Weekend workdays logged per month")
    task_completion_trend: float = Field(default=0.0, ge=-80.0, le=80.0, description="Percentage change in task completion (-50% to +50%)")
    consecutive_extended_days: int = Field(default=0, ge=0, le=14, description="Consecutive days working > 10 hours")
    observation_days: int = Field(default=14, ge=7, le=30, description="Analysis window in days")


class ComparisonMetric(BaseModel):
    metric: str
    healthy_baseline: str
    scenario_value: str
    difference: str
    impact_description: str


class SimulationResult(BaseModel):
    scenario_summary: str
    is_simulated: bool = True
    overall_risk_score: float
    risk_category: str
    anomaly_detection: AnomalyResult
    contributing_factors: List[ContributingFactor]
    supporting_observations: List[str]
    recommended_next_steps: List[str]
    primary_explanation: str
    comparison_table: List[ComparisonMetric]
    daily_timeline: List[Dict[str, Any]]
    confidence_notes: str
