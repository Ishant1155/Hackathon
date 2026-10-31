"""Pydantic base classes that work with both Pydantic v1 and v2."""

from __future__ import annotations

from typing import Any, Dict, Optional

import pydantic
from pydantic import BaseModel

PYDANTIC_V2 = pydantic.VERSION.startswith("2")


class ApiModel(BaseModel):
    """Response model that keeps every field the frontend relies on (extra fields allowed)."""

    if PYDANTIC_V2:
        model_config = {"extra": "allow"}
    else:

        class Config:
            extra = "allow"


class StrictModel(BaseModel):
    """Request model that rejects unknown fields."""

    if PYDANTIC_V2:
        model_config = {"extra": "forbid"}
    else:

        class Config:
            extra = "forbid"


class Meta(ApiModel):
    simulated: bool = True
    source: str = "api"
    notice: Optional[str] = None


class Envelope(ApiModel):
    """Every data endpoint returns { data, meta }. The frontend's unwrap() reads both."""

    data: Any
    meta: Dict[str, Any]


def dump(model: BaseModel) -> dict:
    return model.model_dump() if PYDANTIC_V2 else model.dict()
