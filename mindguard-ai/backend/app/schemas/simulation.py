"""Simulation Lab request/response schemas.

The request accepts either the frontend's camelCase slider keys or the
snake_case names from the API brief:

    avgWorkingHours     | working_hours        h per scheduled day     0–16
    dailyBreaks         | break_count          breaks per day          0–12
    lateNightSessions   | night_sessions       sessions per week       0–7
    weekendDays         | weekend_days         rest days worked / week 0–7
    productivityChange  | productivity_change  % vs baseline           −100–100

Omitted fields default to the reference schedule (8 h, 3 breaks, 0, 0, 0).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import Field

from app.schemas.base import ApiModel, StrictModel

FIELD_PAIRS = {
    "avgWorkingHours": "working_hours",
    "dailyBreaks": "break_count",
    "lateNightSessions": "night_sessions",
    "weekendDays": "weekend_days",
    "productivityChange": "productivity_change",
}
DEFAULTS = {"avgWorkingHours": 8.0, "dailyBreaks": 3.0, "lateNightSessions": 0.0, "weekendDays": 0.0, "productivityChange": 0.0}


class SimulationRequest(StrictModel):
    avgWorkingHours: Optional[float] = Field(None, ge=0, le=16)
    dailyBreaks: Optional[float] = Field(None, ge=0, le=12)
    lateNightSessions: Optional[float] = Field(None, ge=0, le=7)
    weekendDays: Optional[float] = Field(None, ge=0, le=7)
    productivityChange: Optional[float] = Field(None, ge=-100, le=100)

    working_hours: Optional[float] = Field(None, ge=0, le=16)
    break_count: Optional[float] = Field(None, ge=0, le=12)
    night_sessions: Optional[float] = Field(None, ge=0, le=7)
    weekend_days: Optional[float] = Field(None, ge=0, le=7)
    productivity_change: Optional[float] = Field(None, ge=-100, le=100)

    def resolved(self) -> Dict[str, float]:
        """camelCase inputs, preferring camelCase when both are given."""
        out = {}
        for camel, snake in FIELD_PAIRS.items():
            value = getattr(self, camel)
            if value is None:
                value = getattr(self, snake)
            out[camel] = float(DEFAULTS[camel] if value is None else value)
        return out


class SimulationResult(ApiModel):
    # API brief fields
    indicator_score: Optional[int]
    indicator_level: str
    contributing_factors: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    is_simulation: bool = True
    # Frontend Simulation Lab fields
    score: Optional[int]
    level: str
    levelLabel: str
    factors: List[Dict[str, Any]]
    summary: str
    disclaimer: str
    inputs: Dict[str, float]
    thresholds: Dict[str, int]
    rules: List[Dict[str, Any]]
