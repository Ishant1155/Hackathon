"""Central configuration for the Sisyphus backend.

Everything that a judge or developer might want to tweak lives here:
paths, dataset size, the reproducible seed, CORS origins and the
illustrative indicator rules. Values can be overridden with
environment variables (see backend/.env.example).

IMPORTANT: the indicator thresholds below are demonstration
assumptions. They are not validated medical or psychological cut-offs.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader (KEY=VALUE lines) so no extra dependency is needed."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BACKEND_DIR / ".env")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


# ------------------------------------------------------------------ paths
DATASET_DIR = Path(_env("SISYPHUS_DATASET_DIR", str(BACKEND_DIR / "dataset")))
MODELS_DIR = Path(_env("SISYPHUS_MODELS_DIR", str(BACKEND_DIR / "models")))
EMPLOYEES_CSV = DATASET_DIR / "employees.csv"
ACTIVITY_CSV = DATASET_DIR / "employee_activity.csv"
FEATURES_CSV = DATASET_DIR / "employee_features.csv"
LABELS_CSV = DATASET_DIR / "simulation_labels.csv"  # ground truth, never a model input
MODEL_PATH = MODELS_DIR / "isolation_forest.pkl"
EVALUATION_REPORT_PATH = MODELS_DIR / "evaluation_report.json"

DATABASE_URL = _env("SISYPHUS_DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'sisyphus.db'}")

CORS_ORIGINS = [
    o.strip()
    for o in _env(
        "SISYPHUS_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if o.strip()
]

API_VERSION = "1.0.0"
ORGANISATION = "Northwind Labs (fictional)"
DATA_NOTICE = "All employees and activity are synthetic, generated for demonstration. No real personal data is used."
DISCLAIMER = (
    "Sisyphus identifies behavioural work patterns that may warrant a supportive check-in. "
    "It does not diagnose burnout or any medical or mental health condition."
)

# --------------------------------------------------------- data generation
RANDOM_SEED = int(_env("SISYPHUS_SEED", "42"))
N_EMPLOYEES = int(_env("SISYPHUS_EMPLOYEES", "100"))
# 60 days by default: the frontend compares the last 30 days with the previous 30
# (Trends 30-day view, September baseline). Use --days 30 for a 3,000-row dataset.
HISTORY_DAYS = int(_env("SISYPHUS_HISTORY_DAYS", "60"))
END_DATE = date.fromisoformat(_env("SISYPHUS_END_DATE", "2026-10-30"))
DEPARTMENTS = ["Engineering", "Marketing", "HR", "Finance", "Operations", "Sales"]
# Share of employees in each simulation group (60 / 25 / 15 of 100).
GROUP_SHARES = {"healthy": 0.60, "occasional_overtime": 0.25, "sustained_overwork": 0.15}

# ------------------------------------------------------ feature engineering
MIN_HISTORY_DAYS = 14  # observed days needed before a snapshot is "sufficient"
MIN_RECENT_WORKDAYS = 3  # workdays with hours in the last 7 days
MIN_BASELINE_WORKDAYS = 7  # workdays needed to form a personal baseline
OVERTIME_DAY_THRESHOLD = 0.5  # hours over expected that count as an overtime day

# Model inputs. IDs, names, dates, departments and simulation labels are never used.
MODEL_FEATURES = [
    "avg_hours_7d",
    "hours_vs_expected_7d",
    "avg_breaks_7d",
    "avg_overtime_7d",
    "night_sessions_7d",
    "weekend_days_14d",
    "productivity_change",
    "work_variability_7d",
    "meeting_hours_7d",
    "consecutive_overtime_days",
]

ISOLATION_FOREST_PARAMS = {
    "n_estimators": 300,
    "contamination": float(_env("SISYPHUS_CONTAMINATION", "0.05")),
    "max_samples": "auto",
    "random_state": RANDOM_SEED,
}


# ---------------------------------------------------- indicator rule engine
@dataclass(frozen=True)
class IndicatorRules:
    """Illustrative, configurable scoring rules (demonstration assumptions)."""

    # Points (sum to 100)
    hours_points: int = 25
    breaks_points: int = 15
    night_points: int = 20
    productivity_points: int = 25
    weekend_points: int = 15

    # Extended working hours
    hours_over_expected: float = 1.5  # h/day above contracted hours
    hours_over_baseline: float = 0.75  # h/day above personal baseline
    hours_sustained_over_expected: float = 2.5  # flagged even if the baseline is already high

    # Breaks
    min_breaks: float = 2.0  # fewer than this per workday
    breaks_drop_from_baseline: float = 1.0
    breaks_drop_ceiling: float = 3.0  # a drop only counts while below this

    # Late-night activity (sessions after 21:00 outside the scheduled shift)
    min_night_sessions_7d: float = 2.0
    night_over_baseline_7d: float = 1.0

    # Productivity decline (% change)
    productivity_decline_pct: float = 10.0

    # Weekend work
    min_weekend_days_14d: float = 2.0
    weekend_over_baseline_14d: float = 1.0

    # Levels
    moderate_threshold: int = 30
    elevated_threshold: int = 60

    # Data sufficiency: how many of the five factors may be unknown
    max_unknown_factors: int = 2

    # Reference schedule used by the Simulation Lab (no personal baseline exists)
    reference_hours: float = 8.0
    reference_breaks: float = 3.0

    @property
    def max_score(self) -> int:
        return self.hours_points + self.breaks_points + self.night_points + self.productivity_points + self.weekend_points


RULES = IndicatorRules()


@dataclass(frozen=True)
class Settings:
    database_url: str = DATABASE_URL
    cors_origins: list = field(default_factory=lambda: list(CORS_ORIGINS))
    model_path: Path = MODEL_PATH


settings = Settings()
