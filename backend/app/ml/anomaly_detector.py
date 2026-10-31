import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from .features import FEATURE_COLUMNS, feature_dict_to_vector

logger = logging.getLogger("mindguard.anomaly_detector")


class AnomalyDetectorService:
    _instance: Optional["AnomalyDetectorService"] = None

    def __init__(self, contamination: float = 0.12, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.scaler: StandardScaler = StandardScaler()
        self.is_trained: bool = False
        self.training_sample_count: int = 0
        self.last_trained_at: Optional[str] = None
        self._min_score: float = -0.5
        self._max_score: float = 0.5

    @classmethod
    def get_instance(cls) -> "AnomalyDetectorService":
        if cls._instance is None:
            cls._instance = AnomalyDetectorService()
        return cls._instance

    def fit(self, feature_rows: List[Dict[str, float]]) -> bool:
        """
        Train IsolationForest on extracted feature dictionaries.
        Needs at least 10 rows for meaningful fit.
        """
        if len(feature_rows) < 10:
            logger.warning(f"Insufficient samples to fit IsolationForest ({len(feature_rows)} < 10).")
            return False

        df = pd.DataFrame(feature_rows)[FEATURE_COLUMNS].fillna(0.0)
        X = df.values

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=self.random_state,
            bootstrap=False,
            n_jobs=-1
        )
        self.model.fit(X_scaled)
        
        # Compute baseline raw score range for normalization
        raw_scores = self.model.decision_function(X_scaled)
        self._min_score = float(np.min(raw_scores))
        self._max_score = float(np.max(raw_scores))
        
        self.is_trained = True
        self.training_sample_count = len(feature_rows)
        logger.info(f"IsolationForest successfully trained on {self.training_sample_count} samples.")
        return True

    def predict(self, feature_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Run anomaly detection on a single feature vector.
        Returns:
            is_anomaly: bool (True if model predicts outlier)
            anomaly_score: float (0.0 to 1.0, higher = more unusual/atypical)
            raw_decision_score: float (negative indicates anomaly in sklearn IsolationForest)
            interpretation: str
        """
        if not self.is_trained or self.model is None:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.05,
                "raw_decision_score": 0.0,
                "model_name": "IsolationForest (Uncalibrated Default)",
                "interpretation": "Insufficient historical data to detect pattern divergence. Pattern assumed standard."
            }

        vec = feature_dict_to_vector(feature_dict)
        try:
            vec_scaled = self.scaler.transform(vec)
            pred = self.model.predict(vec_scaled)[0]  # -1 = anomaly, 1 = normal
            raw_score = float(self.model.decision_function(vec_scaled)[0])
            
            # In IsolationForest, lower decision_function values mean MORE anomalous.
            # Convert to a 0.0 - 1.0 scale where 1.0 = highly unusual/divergent.
            # Typical decision_function is around [-0.3, +0.3].
            if self._max_score > self._min_score:
                # Invert so lower raw_score becomes higher anomaly_score
                normalized = (self._max_score - raw_score) / (self._max_score - self._min_score)
                anomaly_score = float(np.clip(normalized, 0.0, 1.0))
            else:
                anomaly_score = 0.8 if pred == -1 else 0.2

            is_anomaly = bool(pred == -1)

            if is_anomaly:
                interpretation = (
                    "The machine learning model detected significant behavioral divergence "
                    "from standard team baseline patterns (unusual hours, break variance, or task shifts)."
                )
            else:
                interpretation = (
                    "Behavioral metrics fall within standard statistical distribution bounds "
                    "relative to the synthetic employee baseline."
                )

            return {
                "is_anomaly": is_anomaly,
                "anomaly_score": round(anomaly_score, 3),
                "raw_decision_score": round(raw_score, 4),
                "model_name": "Scikit-Learn IsolationForest (100 Estimators)",
                "interpretation": interpretation
            }
        except Exception as e:
            logger.error(f"Error during anomaly prediction: {e}")
            return {
                "is_anomaly": False,
                "anomaly_score": 0.1,
                "raw_decision_score": 0.0,
                "model_name": "IsolationForest (Fallback)",
                "interpretation": "Analysis fallback engaged due to unexpected calculation state."
            }
