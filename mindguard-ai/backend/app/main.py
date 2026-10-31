"""Sisyphus FastAPI application.

Run from the backend directory:
    uvicorn app.main:app --reload --port 8000
Docs:  http://localhost:8000/docs
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import config
from app.database.connection import get_db
from app.database.init_db import init_db
from app.database.models import Assessment, DailyActivity, Employee
from app.ml.anomaly_detector import BACKEND, load_detector
from app.routes import analytics, employees, simulation

log = logging.getLogger("sisyphus")


def bootstrap() -> None:
    """Create tables; seed an empty database and (re)train a missing or incompatible model.

    Never deletes data. Disable with SISYPHUS_AUTO_BOOTSTRAP=false.
    """
    init_db()
    if os.environ.get("SISYPHUS_AUTO_BOOTSTRAP", "true").lower() == "false":
        return
    from app.database.connection import SessionLocal
    from app.services.analysis_service import reset_engine

    have_csv = config.EMPLOYEES_CSV.exists() and config.ACTIVITY_CSV.exists()
    with SessionLocal() as db:
        empty = not db.scalar(select(func.count()).select_from(Employee))
    if empty and have_csv:
        from app.data.seed_database import seed

        log.warning("Database is empty: seeding from %s", config.DATASET_DIR)
        seed(verbose=False)
        reset_engine()
    if load_detector() is None and have_csv:
        from app.ml.train import train

        log.warning("No compatible anomaly model found: training one now (%s)", BACKEND)
        train(verbose=False)
        reset_engine()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    bootstrap()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Sisyphus API",
    version=config.API_VERSION,
    description=(
        "Behavioural workload analytics for the Sisyphus demo. All data is synthetic. "
        "Results identify work patterns that may warrant a supportive check-in; they are not medical diagnoses."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(employees.router)
app.include_router(analytics.router)
app.include_router(simulation.router)


@app.exception_handler(RequestValidationError)
async def _validation_error(_request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    message = f"Invalid {where}: {first.get('msg')}" if where else str(first.get("msg", "Invalid request"))
    return JSONResponse(status_code=422, content={"detail": message, "errors": [{k: e.get(k) for k in ("loc", "msg", "type")} for e in errors]})


@app.exception_handler(ValueError)
async def _value_error(_request: Request, exc: ValueError):
    return JSONResponse(status_code=503 if "database has no employees" in str(exc) else 400, content={"detail": str(exc)})


@app.get("/", tags=["health"], summary="Health check")
def health(db: Session = Depends(get_db)):
    detector = load_detector()
    latest = db.scalar(select(func.max(DailyActivity.date)))
    return {
        "status": "ok",
        "service": "sisyphus-api",
        "version": config.API_VERSION,
        "docs": "/docs",
        "database": {
            "employees": db.scalar(select(func.count()).select_from(Employee)),
            "activity_records": db.scalar(select(func.count()).select_from(DailyActivity)),
            "assessments": db.scalar(select(func.count()).select_from(Assessment)),
            "latest_activity_date": latest.isoformat() if latest else None,
        },
        "model": {
            "available": detector is not None,
            "backend": detector.metadata.get("backend") if detector else BACKEND,
            "trained_at": detector.metadata.get("trained_at") if detector else None,
        },
        "synthetic_data": True,
        "disclaimer": config.DISCLAIMER,
    }
