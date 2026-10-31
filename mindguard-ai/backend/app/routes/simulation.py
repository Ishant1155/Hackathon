"""POST /simulate: hypothetical Simulation Lab scoring.

Uses exactly the same rules as real analysis (risk_engine), but with the
reference schedule as the baseline. Never reads or writes employee
records, and never saves an assessment.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import DATA_NOTICE
from app.schemas.base import Envelope
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.recommendation import generate_recommendations
from app.services.risk_engine import evaluate_scenario, rules_table

router = APIRouter(tags=["simulation"])


@router.post("/simulate", response_model=Envelope, summary="Score a hypothetical work pattern (never saved)")
def simulate(payload: SimulationRequest):
    inputs = payload.resolved()
    result = evaluate_scenario(inputs)
    body = SimulationResult(
        **result,
        recommendations=generate_recommendations(result),
        inputs=inputs,
        rules=rules_table(),
    )
    return {"data": body, "meta": {"simulated": True, "source": "api", "isSimulation": True, "notice": DATA_NOTICE}}


@router.get("/simulate/rules", response_model=Envelope, summary="The illustrative scoring rules used by /simulate and /analyze")
def rules():
    return {"data": rules_table(), "meta": {"illustrative": True, "source": "api"}}
