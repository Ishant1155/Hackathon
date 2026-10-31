from pydantic import BaseModel
from typing import Dict, Any


class SettingsResponse(BaseModel):
    hours_weight: float = 25.0
    late_night_weight: float = 20.0
    task_trend_weight: float = 25.0
    breaks_weight: float = 15.0
    weekend_weight: float = 15.0
    anomaly_bonus_max: float = 10.0
    consecutive_hours_threshold: float = 10.0
    late_night_hour_threshold: int = 21  # 9 PM
    alert_risk_threshold: float = 60.0  # Scores >= 60 generate alerts


class SettingsUpdate(BaseModel):
    hours_weight: float
    late_night_weight: float
    task_trend_weight: float
    breaks_weight: float
    weekend_weight: float
    alert_risk_threshold: float
