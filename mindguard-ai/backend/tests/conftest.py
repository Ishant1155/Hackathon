"""Shared fixtures: an isolated dataset, database and model in a temp directory.

Environment variables are set before any app module is imported, so the
tests never touch backend/dataset, backend/models or sisyphus.db.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TMP = Path(tempfile.mkdtemp(prefix="sisyphus-tests-"))
os.environ["SISYPHUS_DATASET_DIR"] = str(_TMP / "dataset")
os.environ["SISYPHUS_MODELS_DIR"] = str(_TMP / "models")
os.environ["SISYPHUS_DATABASE_URL"] = f"sqlite:///{_TMP / 'test.db'}"

TEST_EMPLOYEES = 40
TEST_DAYS = 60


@pytest.fixture(scope="session")
def pipeline():
    """Generate → seed → train once for the whole test session."""
    from app.core import config
    from app.data import generator
    from app.data.seed_database import seed
    from app.ml.train import train
    from app.services.analysis_service import reset_engine

    generator.main(["--employees", str(TEST_EMPLOYEES), "--days", str(TEST_DAYS), "--out", str(config.DATASET_DIR)])
    seed(config.DATASET_DIR, verbose=False)
    report = train(verbose=False)
    reset_engine()
    return {"dir": _TMP, "report": report}


@pytest.fixture(scope="session")
def client(pipeline):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def engine(pipeline):
    from app.database.connection import SessionLocal
    from app.services.analysis_service import get_engine

    db = SessionLocal()
    try:
        yield get_engine(db)
    finally:
        db.close()
