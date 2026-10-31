"""Reproducible Isolation Forest training and evaluation.

Run:  python -m app.ml.train

Steps
1. Build feature snapshots from the generated activity (also refreshes
   dataset/employee_features.csv).
2. Keep only snapshots with sufficient history.
3. Split *employees* (not rows) 70/30 with the fixed seed, so no person
   appears in both training and evaluation.
4. Training baseline = training employees' snapshots from the first half
   of the data window (before most sustained-overwork ramps start). The
   model learns what "usual" looks like; simulation labels are not used.
5. Evaluate on the held-out employees' snapshots from the latest 7 days,
   comparing flags with the synthetic scenario labels. This is a
   simulation exercise only and says nothing about real-world accuracy.
6. Fit the final model on the same baseline window for all employees
   and save it with its feature order and evaluation report.
"""

from __future__ import annotations

import json
import random
from collections import Counter, defaultdict
from pathlib import Path

from app.core import config
from app.data.generator import read_csv, write_csv
from app.ml.anomaly_detector import BACKEND, AnomalyDetector
from app.ml.feature_engineering import FEATURE_CSV_COLUMNS, build_feature_table
from app.utils.helpers import add_days, parse_optional_float, rnd

LIMITATIONS = [
    "Trained and evaluated on synthetic data whose patterns were designed by the authors; scores reflect how separable those simulated groups are, not real-world accuracy.",
    "Snapshots from the same employee on consecutive days are highly correlated, so the effective sample size is much smaller than the row count.",
    "An unusual pattern is not evidence of overwork, burnout or any health condition. Context such as deadlines, leave and role changes is not modelled.",
    "The contamination parameter fixes roughly what share of the baseline is treated as unusual; it is a design choice, not an estimate of prevalence.",
    "Median imputation lets the model score partial snapshots; the separate rule engine treats missing data as unknown instead.",
]


def _rank_auc(scores: list[float], labels: list[int]) -> float | None:
    pos = [s for s, y in zip(scores, labels) if y]
    neg = [s for s, y in zip(scores, labels) if not y]
    if not pos or not neg:
        return None
    wins = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg)
    return wins / (len(pos) * len(neg))


def _typed(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        t = dict(r)
        for c in config.MODEL_FEATURES:
            t[c] = parse_optional_float(r.get(c)) if isinstance(r.get(c), str) else r.get(c)
        out.append(t)
    return out


def train(dataset_dir: Path = config.DATASET_DIR, model_path: Path = config.MODEL_PATH, report_path: Path = config.EVALUATION_REPORT_PATH, seed: int = config.RANDOM_SEED, verbose: bool = True) -> dict:
    employees = read_csv(dataset_dir / "employees.csv")
    activity = read_csv(dataset_dir / "employee_activity.csv")
    labels_path = dataset_dir / "simulation_labels.csv"
    labels = {r["employee_id"]: r for r in read_csv(labels_path)} if labels_path.exists() else {}

    rows = build_feature_table(employees, activity)
    write_csv(dataset_dir / "employee_features.csv", rows, FEATURE_CSV_COLUMNS)
    rows = _typed([r for r in rows if r["data_sufficiency"] == "sufficient"])

    dates = sorted({r["as_of_date"] for r in rows})
    end = dates[-1]
    start = min(r["date"] for r in activity)
    span = (len({r["date"] for r in activity}))
    baseline_end = add_days(start, span // 2 - 1)
    eval_start = add_days(end, -6)

    ids = sorted({e["employee_id"] for e in employees})
    rng = random.Random(seed)
    rng.shuffle(ids)
    cut = int(len(ids) * 0.7)
    train_ids, test_ids = set(ids[:cut]), set(ids[cut:])

    train_rows = [r for r in rows if r["employee_id"] in train_ids and r["as_of_date"] <= baseline_end]
    eval_rows = [r for r in rows if r["employee_id"] in test_ids and r["as_of_date"] >= eval_start]

    detector = AnomalyDetector.train(train_rows, metadata={"split": "evaluation"})
    preds = detector.predict(eval_rows)

    # Positive label: sustained-overwork employee whose ramp started ≥ 14 days before the snapshot.
    def positive(r: dict) -> int:
        lab = labels.get(r["employee_id"], {})
        ramp = lab.get("ramp_start_date")
        return int(lab.get("simulation_group") == "sustained_overwork" and bool(ramp) and r["as_of_date"] >= add_days(ramp, 14))

    y = [positive(r) for r in eval_rows]
    flags = [int(p["detected"]) for p in preds]
    tp = sum(1 for a, b in zip(y, flags) if a and b)
    fp = sum(1 for a, b in zip(y, flags) if not a and b)
    fn = sum(1 for a, b in zip(y, flags) if a and not b)
    tn = sum(1 for a, b in zip(y, flags) if not a and not b)
    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    f1 = 2 * precision * recall / (precision + recall) if precision and recall else None

    by_group = defaultdict(lambda: [0, 0])
    for r, f in zip(eval_rows, flags):
        g = labels.get(r["employee_id"], {}).get("simulation_group", "unknown")
        by_group[g][0] += f
        by_group[g][1] += 1

    # Final model: baseline window, all employees.
    final_rows = [r for r in rows if r["as_of_date"] <= baseline_end]
    final = AnomalyDetector.train(
        final_rows,
        metadata={"split": "final", "training_window": {"start": start, "end": baseline_end}, "employees": len({r["employee_id"] for r in final_rows})},
    )
    latest = [r for r in rows if r["as_of_date"] == end]
    latest_flags = final.predict(latest)
    latest_by_group = Counter()
    for r, p in zip(latest, latest_flags):
        if p["detected"]:
            latest_by_group[labels.get(r["employee_id"], {}).get("simulation_group", "unknown")] += 1

    report = {
        "model": "IsolationForest",
        "backend": BACKEND,
        "feature_columns": final.feature_columns,
        "params": final.metadata["params"],
        "training_baseline": {"start": start, "end": baseline_end, "snapshots": len(final_rows)},
        "evaluation": {
            "design": "Held-out employees (30%, never seen in training), snapshots from the latest 7 days, compared with synthetic scenario labels.",
            "train_employees": len(train_ids),
            "test_employees": len(test_ids),
            "train_snapshots": len(train_rows),
            "test_snapshots": len(eval_rows),
            "positives": sum(y),
            "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
            "precision": rnd(precision, 3),
            "recall": rnd(recall, 3),
            "f1": rnd(f1, 3),
            "roc_auc": rnd(_rank_auc([p["anomalyScore"] for p in preds], y), 3),
            "flag_rate_by_group": {g: rnd(v[0] / v[1], 3) for g, v in sorted(by_group.items())},
        },
        "latest_snapshot": {"date": end, "employees_scored": len(latest), "flagged": sum(1 for p in latest_flags if p["detected"]), "flagged_by_group": dict(latest_by_group)},
        "limitations": LIMITATIONS,
        "disclaimer": "Simulation exercise on synthetic data. No clinical or real-world predictive accuracy is claimed.",
    }
    final.metadata["evaluation"] = {k: report["evaluation"][k] for k in ("precision", "recall", "f1", "roc_auc")}
    final.save(model_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    if verbose:
        ev = report["evaluation"]
        print(f"Isolation Forest ({BACKEND}) trained on {len(final_rows)} baseline snapshots ({start} → {baseline_end}).")
        print(f"Held-out evaluation: {ev['test_snapshots']} snapshots, {ev['positives']} positives")
        print(f"  precision={ev['precision']} recall={ev['recall']} f1={ev['f1']} roc_auc={ev['roc_auc']}  {ev['confusion_matrix']}")
        print(f"  flag rate by group: {ev['flag_rate_by_group']}")
        print(f"Latest snapshot ({end}): {report['latest_snapshot']['flagged']} of {len(latest)} flagged {dict(latest_by_group)}")
        print(f"Saved model → {model_path}\nSaved report → {report_path}")
    return report


def main() -> None:
    train()


if __name__ == "__main__":
    main()
