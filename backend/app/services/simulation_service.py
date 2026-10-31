import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ..schemas.simulation import SimulationScenarioInput, SimulationResult, ComparisonMetric
from ..schemas.analysis import AnomalyResult
from ..ml.features import extract_features_from_records
from ..ml.anomaly_detector import AnomalyDetectorService
from .risk_engine import ExplainableRiskEngine


def run_simulation_pipeline(
    scenario: SimulationScenarioInput,
    risk_engine: ExplainableRiskEngine,
    anomaly_detector: AnomalyDetectorService
) -> SimulationResult:
    """
    Executes end-to-end AI analysis for a user-configured simulation scenario.
    """
    days = scenario.observation_days
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)

    daily_timeline: List[Dict[str, Any]] = []
    daily_records: List[Dict[str, Any]] = []

    # Deterministic generation for this simulation run
    rng = random.Random(int(scenario.daily_working_hours * 100 + scenario.break_count * 10 + scenario.late_night_sessions_per_week))

    late_nights_needed = int((scenario.late_night_sessions_per_week / 7.0) * days)
    late_night_days_indices = set(rng.sample(range(days), min(days, late_nights_needed)))

    weekend_days_needed = int((scenario.weekend_days_per_month / 30.0) * days)
    consec_count = scenario.consecutive_extended_days

    # Baseline daily tasks around 6
    base_tasks = 6

    for day_idx in range(days):
        cur_date = start_date + timedelta(days=day_idx)
        is_weekend = cur_date.weekday() >= 5
        date_str = cur_date.strftime("%Y-%m-%d")

        is_in_consecutive_tail = (day_idx >= (days - consec_count))

        if is_weekend:
            # Check if this weekend day is selected as worked
            should_work_weekend = (weekend_days_needed > 0) and (day_idx % 7 in [5, 6])
            if should_work_weekend:
                hrs = round(max(4.0, scenario.daily_working_hours * 0.75 + rng.uniform(-0.5, 0.5)), 1)
                is_late = day_idx in late_night_days_indices
                b_cnt = max(0, scenario.break_count - 1)
                b_dur = scenario.avg_break_duration
                # Task completion incorporates trend
                task_delta = (scenario.task_completion_trend / 100.0) * (day_idx / max(1, days))
                tasks = max(1, int(round(base_tasks * (1.0 + task_delta) * 0.6)))
                wknd_work = True
            else:
                hrs = 0.0
                is_late = False
                b_cnt = 0
                b_dur = 0.0
                tasks = 0
                wknd_work = False
        else:
            # Weekday
            if is_in_consecutive_tail:
                hrs = round(max(10.0, scenario.daily_working_hours + rng.uniform(-0.3, 0.8)), 1)
            else:
                hrs = round(max(4.0, scenario.daily_working_hours + rng.uniform(-0.6, 0.6)), 1)
            is_late = day_idx in late_night_days_indices
            b_cnt = max(0, int(round(scenario.break_count + rng.choice([-1, 0, 1]))))
            b_dur = round(max(5.0, scenario.avg_break_duration + rng.uniform(-3.0, 3.0)), 1)
            task_delta = (scenario.task_completion_trend / 100.0) * (day_idx / max(1, days))
            tasks = max(1, int(round(base_tasks * (1.0 + task_delta))))
            wknd_work = False

        rec = {
            "record_date": date_str,
            "day_of_week": cur_date.strftime("%A"),
            "working_hours": hrs,
            "break_count": b_cnt,
            "avg_break_duration": b_dur,
            "late_night_active": is_late,
            "weekend_work": wknd_work,
            "tasks_completed": tasks,
            "task_completion_trend": round((scenario.task_completion_trend / 100.0), 2),
            "workload_indicator": round(hrs / 8.0, 2),
            "recovery_hours": round(max(4.0, 24.0 - hrs - 1.0), 1),
        }
        daily_records.append(rec)
        daily_timeline.append({
            "date": date_str,
            "day": cur_date.strftime("%a"),
            "working_hours": hrs,
            "breaks": b_cnt,
            "tasks_completed": tasks,
            "late_night": is_late,
            "weekend_work": wknd_work
        })

    # Extract behavioral features from scenario records
    features = extract_features_from_records(daily_records, baseline_hours=8.0)

    # 1. Isolation Forest Model Inference
    anomaly_dict = anomaly_detector.predict(features)
    anomaly_res = AnomalyResult(
        is_anomaly=anomaly_dict["is_anomaly"],
        anomaly_score=anomaly_dict["anomaly_score"],
        raw_decision_score=anomaly_dict["raw_decision_score"],
        model_name=anomaly_dict["model_name"],
        interpretation=anomaly_dict["interpretation"]
    )

    # 2. Explainable Risk Engine
    risk_assessment = risk_engine.calculate_risk(
        features=features,
        anomaly_res=anomaly_res,
        observation_days=days,
        total_records_available=len(daily_records)
    )

    # 3. Baseline vs Scenario Comparison Table
    comparison_table = [
        ComparisonMetric(
            metric="Daily Working Hours",
            healthy_baseline="7.5 - 8.5 hours/day",
            scenario_value=f"{scenario.daily_working_hours:.1f} hours/day",
            difference=f"{scenario.daily_working_hours - 8.0:+.1f}h from baseline",
            impact_description="Overtime increases cumulative fatigue and restricts evening cognitive unwinding." if scenario.daily_working_hours > 9.5 else "Maintains standard daily operational equilibrium."
        ),
        ComparisonMetric(
            metric="Recorded Daily Breaks",
            healthy_baseline="3 - 4 breaks/day (15m ea.)",
            scenario_value=f"{scenario.break_count} breaks/day ({scenario.avg_break_duration:.0f}m)",
            difference=f"{scenario.break_count - 3:+} breaks",
            impact_description="Fewer breaks diminish sustained attention and elevate stress." if scenario.break_count <= 1 else "Regular breaks support cognitive replenishment."
        ),
        ComparisonMetric(
            metric="Late-Night Sessions",
            healthy_baseline="0 - 1 per week",
            scenario_value=f"{scenario.late_night_sessions_per_week} per week",
            difference=f"{scenario.late_night_sessions_per_week} sessions/wk",
            impact_description="Disrupts circadian sleep cycles and recovery." if scenario.late_night_sessions_per_week >= 3 else "Minimal impact on sleep architecture."
        ),
        ComparisonMetric(
            metric="Weekend Work Days",
            healthy_baseline="0 days/month",
            scenario_value=f"{scenario.weekend_days_per_month} days/month",
            difference=f"{scenario.weekend_days_per_month} days/mo",
            impact_description="Erodes weekly recovery buffer and increases long-term exhaustion risk." if scenario.weekend_days_per_month >= 2 else "Standard weekend boundary maintained."
        ),
        ComparisonMetric(
            metric="Task Completion Trend",
            healthy_baseline="Stable / +0% to +5%",
            scenario_value=f"{scenario.task_completion_trend:+.0f}%",
            difference=f"{scenario.task_completion_trend:+.0f}%",
            impact_description="Noticeable drop in throughput despite effort; classic indicator of diminishing returns." if scenario.task_completion_trend <= -15 else "Productivity remains stable."
        ),
    ]

    scenario_summary = (
        f"Simulated {days}-day pattern configured with {scenario.daily_working_hours}h/day, "
        f"{scenario.break_count} breaks, {scenario.late_night_sessions_per_week} late-night sessions/wk, "
        f"and {scenario.task_completion_trend:+.0f}% task trend."
    )

    confidence_notes = (
        "Simulation executed through live Scikit-learn IsolationForest inference and rule-based risk engine. "
        "Outputs represent prototype wellbeing indicators for demonstration purposes only."
    )

    return SimulationResult(
        scenario_summary=scenario_summary,
        is_simulated=True,
        overall_risk_score=risk_assessment["overall_risk_score"],
        risk_category=risk_assessment["risk_category"],
        anomaly_detection=anomaly_res,
        contributing_factors=risk_assessment["contributing_factors"],
        supporting_observations=risk_assessment["supporting_observations"],
        recommended_next_steps=risk_assessment["recommendations"],
        primary_explanation=risk_assessment["primary_explanation"],
        comparison_table=comparison_table,
        daily_timeline=daily_timeline,
        confidence_notes=confidence_notes,
    )
