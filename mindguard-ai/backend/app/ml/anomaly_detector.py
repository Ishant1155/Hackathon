"""Isolation Forest anomaly detector: training and prediction.

Model inputs are behavioural features only (config.MODEL_FEATURES).
Employee IDs, names, dates, departments and simulation labels are
never used as inputs.

Pipeline: SimpleImputer(median) → StandardScaler → IsolationForest.
Missing values are imputed with the training median *inside* the
pipeline so the model can score partial snapshots; the rule engine,
by contrast, treats missing values as unknown.

Output per snapshot:
    prediction     -1 = unusual pattern, 1 = not flagged as unusual
    detected       prediction == -1
    anomalyScore   −decision_function: > 0 means flagged; larger = more unusual
    rawScore       score_samples (higher = more normal, scikit-learn convention)
    drivers        the features furthest from the training baseline (robust z-score)

An anomaly means "different from the training baseline", not proof of
overwork, burnout or any health condition.
"""

from __future__ import annotations

import math
import pickle
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Optional

from app.core import config
from app.utils.helpers import rnd

FEATURE_LABELS = {
    "avg_hours_7d": "Average workday hours (7 days)",
    "hours_vs_expected_7d": "Hours above contracted hours",
    "avg_breaks_7d": "Breaks per workday",
    "avg_overtime_7d": "Overtime per workday",
    "night_sessions_7d": "Late-night sessions (7 days)",
    "weekend_days_14d": "Rest days worked (14 days)",
    "productivity_change": "Productivity change vs previous week",
    "work_variability_7d": "Day-to-day hours variability",
    "meeting_hours_7d": "Meeting hours (7 days)",
    "consecutive_overtime_days": "Consecutive overtime days",
}

try:  # Production path
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    BACKEND = "scikit-learn"
except ImportError:  # pragma: no cover - exercised only without scikit-learn
    np = None
    BACKEND = "pure-python-fallback"

try:
    import joblib
except ImportError:  # pragma: no cover
    joblib = None


def _to_matrix(rows: list[dict], columns: list[str]):
    data = [[(float(r[c]) if r.get(c) not in (None, "") else math.nan) for c in columns] for r in rows]
    return np.array(data, dtype=float) if np is not None else data


def make_pipeline(params: Optional[dict] = None):
    params = {**config.ISOLATION_FOREST_PARAMS, **(params or {})}
    if BACKEND == "scikit-learn":
        return Pipeline(
            [
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
                ("model", IsolationForest(**params)),
            ]
        )
    from app.ml._pure_iforest import PurePipeline

    return PurePipeline(**{**params, "n_estimators": min(params["n_estimators"], 150)})


def _reference_stats(rows: list[dict], columns: list[str]) -> dict:
    stats = {}
    for c in columns:
        vals = sorted(float(r[c]) for r in rows if r.get(c) not in (None, ""))
        if not vals:
            stats[c] = {"median": 0.0, "scale": 1.0}
            continue
        q1, q3 = vals[int(0.25 * (len(vals) - 1))], vals[int(0.75 * (len(vals) - 1))]
        sd = math.sqrt(sum((v - sum(vals) / len(vals)) ** 2 for v in vals) / len(vals))
        stats[c] = {"median": median(vals), "scale": max((q3 - q1) / 1.349, sd, 0.25)}
    return stats


class AnomalyDetector:
    def __init__(self, pipeline, feature_columns: list[str], reference: dict, metadata: dict):
        self.pipeline = pipeline
        self.feature_columns = feature_columns
        self.reference = reference
        self.metadata = metadata

    # ---------------------------------------------------------- training
    @classmethod
    def train(cls, rows: list[dict], feature_columns: Optional[list[str]] = None, params: Optional[dict] = None, metadata: Optional[dict] = None) -> "AnomalyDetector":
        columns = list(feature_columns or config.MODEL_FEATURES)
        if len(rows) < 20:
            raise ValueError(f"Need at least 20 training snapshots, got {len(rows)}.")
        pipe = make_pipeline(params)
        pipe.fit(_to_matrix(rows, columns))
        meta = {
            "backend": BACKEND,
            "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "training_rows": len(rows),
            "params": {**config.ISOLATION_FOREST_PARAMS, **(params or {})},
            **(metadata or {}),
        }
        return cls(pipe, columns, _reference_stats(rows, columns), meta)

    # -------------------------------------------------------- prediction
    def predict(self, rows: list[dict]) -> list[dict]:
        if not rows:
            return []
        X = _to_matrix(rows, self.feature_columns)
        decision = list(self.pipeline.decision_function(X))
        raw = list(self.pipeline.score_samples(X))
        preds = list(self.pipeline.predict(X))
        out = []
        for row, d, s, p in zip(rows, decision, raw, preds):
            out.append(
                {
                    "prediction": int(p),
                    "detected": int(p) == -1,
                    "anomalyScore": rnd(-float(d), 4),
                    "rawScore": rnd(float(s), 4),
                    "label": "Unusual pattern" if int(p) == -1 else "Not flagged as unusual",
                    "drivers": self.drivers(row),
                    "missingInputs": [c for c in self.feature_columns if row.get(c) in (None, "")],
                }
            )
        return out

    def drivers(self, row: dict, top: int = 3) -> list[dict]:
        """Features furthest from the training baseline (robust z-score). A guide, not a causal attribution."""
        items = []
        for c in self.feature_columns:
            v = row.get(c)
            if v in (None, ""):
                continue
            ref = self.reference[c]
            z = (float(v) - ref["median"]) / ref["scale"]
            items.append({"feature": c, "label": FEATURE_LABELS.get(c, c), "value": rnd(float(v), 2), "baselineMedian": rnd(ref["median"], 2), "zScore": rnd(z, 2)})
        items.sort(key=lambda i: -abs(i["zScore"]))
        return [i for i in items[:top] if abs(i["zScore"]) >= 1.0]

    # ------------------------------------------------------- persistence
    def save(self, path: Path = config.MODEL_PATH) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        bundle = {"pipeline": self.pipeline, "feature_columns": self.feature_columns, "reference": self.reference, "metadata": self.metadata}
        if joblib is not None:
            joblib.dump(bundle, path)
        else:  # pragma: no cover
            with path.open("wb") as fh:
                pickle.dump(bundle, fh)
        return path

    @classmethod
    def load(cls, path: Path = config.MODEL_PATH) -> "AnomalyDetector":
        if joblib is not None:
            bundle = joblib.load(path)
        else:  # pragma: no cover
            with path.open("rb") as fh:
                bundle = pickle.load(fh)
        return cls(bundle["pipeline"], bundle["feature_columns"], bundle["reference"], bundle["metadata"])


def load_detector(path: Path = config.MODEL_PATH) -> Optional[AnomalyDetector]:
    """Load the saved model, or None if it is missing or was trained with another backend."""
    if not Path(path).exists():
        return None
    try:
        det = AnomalyDetector.load(path)
    except Exception:
        return None
    if det.metadata.get("backend") != BACKEND:
        return None
    return det
