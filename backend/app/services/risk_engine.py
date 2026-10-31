import logging
from typing import Dict, Any, List, Tuple
from ..schemas.analysis import ContributingFactor, AnomalyResult

logger = logging.getLogger("mindguard.risk_engine")


class ExplainableRiskEngine:
    def __init__(
        self,
        hours_weight: float = 25.0,
        late_night_weight: float = 20.0,
        task_trend_weight: float = 25.0,
        breaks_weight: float = 15.0,
        weekend_weight: float = 15.0,
        anomaly_bonus_max: float = 5.0,
    ):
        self.hours_weight = hours_weight
        self.late_night_weight = late_night_weight
        self.task_trend_weight = task_trend_weight
        self.breaks_weight = breaks_weight
        self.weekend_weight = weekend_weight
        self.anomaly_bonus_max = anomaly_bonus_max

    def calculate_risk(
        self,
        features: Dict[str, float],
        anomaly_res: AnomalyResult,
        observation_days: int = 30,
        total_records_available: int = 30,
    ) -> Dict[str, Any]:
        """
        Evaluate sustained behavioral patterns into an explainable 0-100 risk score.
        """
        contributing_factors: List[ContributingFactor] = []
        supporting_observations: List[str] = []
        recommendations: List[str] = []

        avg_hours_7d = features.get("avg_hours_7d", 8.0)
        avg_hours_14d = features.get("avg_hours_14d", 8.0)
        late_night_count = int(features.get("late_night_count_14d", 0))
        weekend_count = int(features.get("weekend_days_count_14d", 0))
        avg_breaks_7d = features.get("avg_breaks_7d", 3.0)
        task_trend = features.get("task_completion_change_ratio", 0.0)
        consecutive_extended = int(features.get("consecutive_extended_days", 0))
        recovery_hours = features.get("avg_recovery_hours_7d", 14.0)

        # -------------------------------------------------------------
        # 1. Sustained Extended Working Hours (Up to 25 pts)
        # Evaluates persistence rather than a single busy day
        # -------------------------------------------------------------
        hours_score = 0.0
        if avg_hours_14d >= 12.5 or avg_hours_7d >= 13.0 or consecutive_extended >= 5:
            hours_score = self.hours_weight  # 25 pts
            hours_severity = "high"
            hours_desc = f"Sustained 12+ hour daily working pattern over the observation window."
            hours_evid = f"Recent 7-day average: {avg_hours_7d:.1f} hrs/day; 14-day average: {avg_hours_14d:.1f} hrs/day ({consecutive_extended} consecutive days >=10h)."
            supporting_observations.append(
                f"Working hours have remained persistently high, averaging {avg_hours_14d:.1f} hours daily over the last 14 days."
            )
        elif avg_hours_14d >= 10.5 or avg_hours_7d >= 11.0 or consecutive_extended >= 3:
            hours_score = self.hours_weight * 0.7  # 17.5 pts
            hours_severity = "moderate"
            hours_desc = f"Noticeable extended daily hours (averaging ~{avg_hours_14d:.1f} hours/day)."
            hours_evid = f"Recent 7-day average: {avg_hours_7d:.1f} hrs/day; 14-day average: {avg_hours_14d:.1f} hrs/day."
            supporting_observations.append(
                f"Working hours are noticeably higher than standard, averaging {avg_hours_14d:.1f} hours over the past two weeks."
            )
        elif avg_hours_14d >= 9.2 or avg_hours_7d >= 9.5:
            hours_score = self.hours_weight * 0.35  # 8.75 pts
            hours_severity = "moderate"
            hours_desc = f"Mild overtime logged regularly."
            hours_evid = f"7-day average: {avg_hours_7d:.1f} hrs/day."
            supporting_observations.append(
                f"Consistent mild overtime observed ({avg_hours_7d:.1f} hrs/day recent average)."
            )
        else:
            hours_score = 0.0
            hours_severity = "normal"
            hours_desc = "Working hours are within typical standard expectations (7-9 hours/day)."
            hours_evid = f"7-day average: {avg_hours_7d:.1f} hrs/day."

        contributing_factors.append(
            ContributingFactor(
                name="extended_hours",
                score=round(hours_score, 1),
                max_score=self.hours_weight,
                severity=hours_severity,
                title="Sustained Extended Working Hours",
                description=hours_desc,
                evidence=hours_evid,
            )
        )

        # -------------------------------------------------------------
        # 2. Repeated Late-Night Activity (Up to 20 pts)
        # Evaluates sessions active after 21:00 / late night in last 14d
        # -------------------------------------------------------------
        late_night_score = 0.0
        if late_night_count >= 6:
            late_night_score = self.late_night_weight  # 20 pts
            late_sev = "high"
            late_desc = "Persistent late-night activity across multiple weeks."
            late_evid = f"{late_night_count} late-night work sessions recorded in the past 14 days."
            supporting_observations.append(
                f"Late-night activity was recorded on {late_night_count} occasions in the past two weeks, indicating disrupted evening recovery."
            )
        elif late_night_count >= 3:
            late_night_score = self.late_night_weight * 0.6  # 12 pts
            late_sev = "moderate"
            late_desc = "Frequent late-night work sessions."
            late_evid = f"{late_night_count} late-night sessions logged in 14 days."
            supporting_observations.append(
                f"{late_night_count} late-night sessions logged in the last 14 days."
            )
        elif late_night_count >= 1:
            late_night_score = self.late_night_weight * 0.25  # 5 pts
            late_sev = "moderate"
            late_desc = "Occasional late-night session."
            late_evid = f"{late_night_count} late-night session recorded."
            supporting_observations.append(
                f"Occasional late-night session noted ({late_night_count} session in 14 days)."
            )
        else:
            late_night_score = 0.0
            late_sev = "normal"
            late_desc = "Little to no late-night activity logged."
            late_evid = "0 late-night sessions in the observation period."

        contributing_factors.append(
            ContributingFactor(
                name="late_night_activity",
                score=round(late_night_score, 1),
                max_score=self.late_night_weight,
                severity=late_sev,
                title="Repeated Late-Night Activity",
                description=late_desc,
                evidence=late_evid,
            )
        )

        # -------------------------------------------------------------
        # 3. Declining Task Completion vs Rising Hours (Up to 25 pts)
        # -------------------------------------------------------------
        task_score = 0.0
        # If task completion dropped while working hours were high, strong indicator of diminishing returns/fatigue
        if task_trend <= -0.30 and avg_hours_14d >= 9.5:
            task_score = self.task_trend_weight  # 25 pts
            task_sev = "high"
            task_desc = "Pronounced decline in task completion despite elevated working hours."
            task_evid = f"Task completion declined by {abs(task_trend)*100:.0f}% while working hours averaged {avg_hours_14d:.1f}h."
            supporting_observations.append(
                f"Task completion declined by {abs(task_trend)*100:.0f}% over recent weeks even as working hours remained extended, suggesting diminishing returns or fatigue."
            )
        elif task_trend <= -0.20:
            task_score = self.task_trend_weight * 0.65  # 16.25 pts
            task_sev = "moderate"
            task_desc = "Moderate decline in task completion."
            task_evid = f"Task completion down by {abs(task_trend)*100:.0f}% relative to baseline."
            supporting_observations.append(
                f"Recent task completion reflects a {abs(task_trend)*100:.0f}% downward shift compared to baseline."
            )
        elif task_trend <= -0.10:
            task_score = self.task_trend_weight * 0.35  # 8.75 pts
            task_sev = "moderate"
            task_desc = "Minor downward variation in task completion."
            task_evid = f"Task completion down {abs(task_trend)*100:.0f}%."
            supporting_observations.append(
                f"Minor downward variation in task completion ({abs(task_trend)*100:.0f}% shift)."
            )
        else:
            task_score = 0.0
            task_sev = "normal"
            task_desc = "Task completion rate is stable or increasing."
            task_evid = f"Task trend is {task_trend*100:+.0f}% relative to baseline."

        contributing_factors.append(
            ContributingFactor(
                name="task_completion_trend",
                score=round(task_score, 1),
                max_score=self.task_trend_weight,
                severity=task_sev,
                title="Task Completion Trend",
                description=task_desc,
                evidence=task_evid,
            )
        )

        # -------------------------------------------------------------
        # 4. Reduced Recorded Breaks (Up to 15 pts)
        # -------------------------------------------------------------
        break_score = 0.0
        if avg_breaks_7d <= 1.0:
            break_score = self.breaks_weight  # 15 pts
            break_sev = "high"
            break_desc = "Very few or no breaks recorded during the workday."
            break_evid = f"Averaging only {avg_breaks_7d:.1f} break(s) per day over the last 7 days."
            supporting_observations.append(
                f"Recorded break frequency is notably low (averaging {avg_breaks_7d:.1f} break/day), limiting cognitive replenishment."
            )
        elif avg_breaks_7d <= 2.0:
            break_score = self.breaks_weight * 0.55  # 8.25 pts
            break_sev = "moderate"
            break_desc = "Infrequent recorded breaks throughout the day."
            break_evid = f"Averaging {avg_breaks_7d:.1f} breaks per day."
            supporting_observations.append(
                f"Break frequency is lower than recommended (averaging {avg_breaks_7d:.1f} breaks/day)."
            )
        else:
            break_score = 0.0
            break_sev = "normal"
            break_desc = "Regular recorded rest and replenishment breaks."
            break_evid = f"Averaging {avg_breaks_7d:.1f} breaks per day."

        contributing_factors.append(
            ContributingFactor(
                name="reduced_breaks",
                score=round(break_score, 1),
                max_score=self.breaks_weight,
                severity=break_sev,
                title="Recorded Break Frequency",
                description=break_desc,
                evidence=break_evid,
            )
        )

        # -------------------------------------------------------------
        # 5. Repeated Weekend Work (Up to 15 pts)
        # -------------------------------------------------------------
        weekend_score = 0.0
        if weekend_count >= 3:
            weekend_score = self.weekend_weight  # 15 pts
            wknd_sev = "high"
            wknd_desc = "Frequent weekend work across consecutive weeks."
            wknd_evid = f"{weekend_count} weekend days worked in the past 14 days."
            supporting_observations.append(
                f"Weekend work occurred on {weekend_count} days over the last two weeks, reducing weekly recovery buffers."
            )
        elif weekend_count >= 1:
            weekend_score = self.weekend_weight * 0.5  # 7.5 pts
            wknd_sev = "moderate"
            wknd_desc = "Occasional weekend shifts logged."
            wknd_evid = f"{weekend_count} weekend workday(s) logged in 14 days."
            supporting_observations.append(
                f"Weekend activity logged on {weekend_count} day(s) in the past two weeks."
            )
        else:
            weekend_score = 0.0
            wknd_sev = "normal"
            wknd_desc = "Standard weekend rest preserved without work activity."
            wknd_evid = "0 weekend days worked in the past 14 days."

        contributing_factors.append(
            ContributingFactor(
                name="weekend_work",
                score=round(weekend_score, 1),
                max_score=self.weekend_weight,
                severity=wknd_sev,
                title="Weekend Work Frequency",
                description=wknd_desc,
                evidence=wknd_evid,
            )
        )

        # -------------------------------------------------------------
        # Supplementary Model Evidence (Up to 5 pts)
        # Never overrides transparent rules, provides statistical anomaly weighting
        # -------------------------------------------------------------
        anomaly_modifier = 0.0
        if anomaly_res.is_anomaly:
            # If the transparent rules already have some concern, model reinforces it
            rule_sum = hours_score + late_night_score + task_score + break_score + weekend_score
            if rule_sum >= 20.0:
                anomaly_modifier = min(self.anomaly_bonus_max, anomaly_res.anomaly_score * self.anomaly_bonus_max)
                supporting_observations.append(
                    f"Independent machine learning outlier detection confirmed statistical divergence (anomaly score {anomaly_res.anomaly_score:.2f})."
                )

        raw_total = hours_score + late_night_score + task_score + break_score + weekend_score + anomaly_modifier
        overall_risk_score = min(100.0, max(0.0, round(raw_total, 1)))

        # Categorization based on specification:
        # 0–29: Low concern
        # 30–59: Moderate concern
        # 60–79: Elevated concern
        # 80–100: High priority for human review
        if overall_risk_score >= 80.0:
            risk_category = "High priority for human review"
        elif overall_risk_score >= 60.0:
            risk_category = "Elevated concern"
        elif overall_risk_score >= 30.0:
            risk_category = "Moderate concern"
        else:
            risk_category = "Low concern"

        # Plain language primary explanation
        if overall_risk_score >= 60.0:
            summary_parts = []
            if hours_score >= 15:
                summary_parts.append("working hours have been persistently extended")
            if late_night_score >= 10:
                summary_parts.append("late-night work has become frequent")
            if task_score >= 15:
                summary_parts.append("task completion has declined")
            if break_score >= 8:
                summary_parts.append("break frequency has dropped")
            if weekend_score >= 7:
                summary_parts.append("weekend work has recurred")

            if summary_parts:
                primary_explanation = (
                    f"Your recent working pattern is different from usual: {', and '.join(summary_parts)}. "
                    "This pattern may need a closer look to ensure sustainable workload and recovery."
                )
            else:
                primary_explanation = "This pattern may need a closer look due to multiple emerging indicators."
        elif overall_risk_score >= 30.0:
            primary_explanation = (
                "Work patterns show moderate variations, such as occasional overtime or fluctuating breaks. "
                "Worth monitoring to prevent developing into sustained overwork."
            )
        else:
            primary_explanation = (
                "Work hours, break habits, and task progress reflect a healthy, sustainable pattern "
                "with regular rest intervals."
            )

        # Evidence-based Supportive Recommendations
        if hours_score >= 15.0:
            recommendations.append(
                "Review the current workload and determine whether deadlines, project scope, or staffing need adjustment."
            )
        if late_night_score >= 10.0:
            recommendations.append(
                "Consider reviewing work schedules and protecting time for rest in the evenings."
            )
        if task_score >= 15.0:
            recommendations.append(
                "Review task complexity, interruptions, cross-team dependencies, and workload before drawing conclusions."
            )
        if break_score >= 8.0:
            recommendations.append(
                "Discuss whether the employee has sufficient opportunities to take breaks during the workday."
            )
        if weekend_score >= 7.0:
            recommendations.append(
                "Consider redistributing assignments and reviewing expectations for availability outside scheduled hours."
            )
        if recovery_hours < 11.0:
            recommendations.append(
                "Ensure at least 11-12 hours of recovery time between consecutive daily work sessions."
            )

        if not recommendations:
            recommendations.append(
                "Continue maintaining current work rhythms and regular recovery intervals."
            )

        completeness_pct = int(min(100, (total_records_available / max(1, observation_days)) * 100))
        data_completeness = f"{completeness_pct}% complete ({total_records_available} of {observation_days} days observed)"

        confidence_limitations = (
            "MindGuard AI analyzes simulated digital work patterns to identify workload trends early. "
            "It does not evaluate employee effort, does not monitor personal communications, and does not provide "
            "medical diagnoses of burnout, anxiety, or depression. Scores indicate patterns warranting supportive human review."
        )

        return {
            "overall_risk_score": overall_risk_score,
            "risk_category": risk_category,
            "hours_score": round(hours_score, 1),
            "late_night_score": round(late_night_score, 1),
            "task_trend_score": round(task_score, 1),
            "break_score": round(break_score, 1),
            "weekend_score": round(weekend_score, 1),
            "anomaly_modifier": round(anomaly_modifier, 1),
            "contributing_factors": contributing_factors,
            "supporting_observations": supporting_observations,
            "recommendations": recommendations,
            "primary_explanation": primary_explanation,
            "data_completeness": data_completeness,
            "confidence_limitations": confidence_limitations,
        }
