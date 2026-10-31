import numpy as np
import pandas as pd
from typing import List, Dict, Any


FEATURE_COLUMNS = [
    "avg_hours_7d",
    "avg_hours_14d",
    "hours_change_ratio",
    "late_night_count_14d",
    "weekend_days_count_14d",
    "avg_breaks_7d",
    "avg_break_duration_7d",
    "task_completion_change_ratio",
    "consecutive_extended_days",
    "avg_recovery_hours_7d",
]


def extract_features_from_records(records: List[Dict[str, Any]], baseline_hours: float = 8.0) -> Dict[str, float]:
    """
    Given a list of daily records for an employee (sorted chronologically ascending),
    compute behavioral aggregate features over the observation window (typically 14-30 days).
    """
    if not records:
        return {col: 0.0 for col in FEATURE_COLUMNS}

    df = pd.DataFrame(records)
    # Ensure types
    df["working_hours"] = pd.to_numeric(df.get("working_hours", 8.0), errors="coerce").fillna(8.0)
    df["break_count"] = pd.to_numeric(df.get("break_count", 3), errors="coerce").fillna(3)
    df["avg_break_duration"] = pd.to_numeric(df.get("avg_break_duration", 15.0), errors="coerce").fillna(15.0)
    df["tasks_completed"] = pd.to_numeric(df.get("tasks_completed", 5), errors="coerce").fillna(5)
    df["late_night_active"] = df.get("late_night_active", False).astype(bool)
    df["weekend_work"] = df.get("weekend_work", False).astype(bool)
    df["recovery_hours"] = pd.to_numeric(df.get("recovery_hours", 14.0), errors="coerce").fillna(14.0)

    n = len(df)
    last_7 = df.tail(min(7, n))
    last_14 = df.tail(min(14, n))
    earlier_14 = df.head(max(1, n - 7)).tail(min(14, max(1, n - 7)))

    avg_hours_7d = float(last_7["working_hours"].mean())
    avg_hours_14d = float(last_14["working_hours"].mean())
    
    # Hours change ratio relative to baseline
    safe_baseline = baseline_hours if baseline_hours > 0 else 8.0
    hours_change_ratio = float((avg_hours_7d - safe_baseline) / safe_baseline)

    late_night_count_14d = int(last_14["late_night_active"].sum())
    weekend_days_count_14d = int(last_14["weekend_work"].sum())

    avg_breaks_7d = float(last_7["break_count"].mean())
    avg_break_duration_7d = float(last_7["avg_break_duration"].mean())

    # Task completion change
    recent_tasks = float(last_7["tasks_completed"].mean())
    earlier_tasks = float(earlier_14["tasks_completed"].mean()) if len(earlier_14) > 0 else recent_tasks
    if earlier_tasks > 0:
        task_completion_change_ratio = float((recent_tasks - earlier_tasks) / earlier_tasks)
    else:
        task_completion_change_ratio = 0.0

    # Consecutive extended days (> 10 hrs) up to the latest record
    consecutive_extended = 0
    for hrs in reversed(df["working_hours"].tolist()):
        if hrs >= 10.0:
            consecutive_extended += 1
        else:
            break

    avg_recovery_hours_7d = float(last_7["recovery_hours"].mean())

    return {
        "avg_hours_7d": round(avg_hours_7d, 2),
        "avg_hours_14d": round(avg_hours_14d, 2),
        "hours_change_ratio": round(hours_change_ratio, 3),
        "late_night_count_14d": late_night_count_14d,
        "weekend_days_count_14d": weekend_days_count_14d,
        "avg_breaks_7d": round(avg_breaks_7d, 2),
        "avg_break_duration_7d": round(avg_break_duration_7d, 2),
        "task_completion_change_ratio": round(task_completion_change_ratio, 3),
        "consecutive_extended_days": consecutive_extended,
        "avg_recovery_hours_7d": round(avg_recovery_hours_7d, 2),
    }


def feature_dict_to_vector(feature_dict: Dict[str, float]) -> np.ndarray:
    """Convert feature dictionary to 2D numpy array in standard column order."""
    return np.array([[feature_dict[col] for col in FEATURE_COLUMNS]], dtype=np.float32)
