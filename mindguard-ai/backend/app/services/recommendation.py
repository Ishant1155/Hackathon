"""Rule-based, supportive recommendations.

Recommendations are generated only from factors that actually
contributed to an indicator result. They describe workload and working
conditions. They never diagnose, and never speculate about anyone's
health or state of mind.
"""

from __future__ import annotations

RECOMMENDATIONS = {
    "avgWorkingHours": {
        "recommendation": "Review workload distribution and task allocation.",
        "rationale": "Working hours are above the expected or usual level for this person.",
        "actions": ["Agree which tasks can be deferred, shared or descoped.", "Check whether deadlines cluster in the coming weeks."],
    },
    "dailyBreaks": {
        "recommendation": "Encourage regular protected breaks.",
        "rationale": "Fewer breaks are being recorded than expected.",
        "actions": ["Look for back-to-back meetings that could be shortened.", "Block short recovery slots in the calendar."],
    },
    "lateNightSessions": {
        "recommendation": "Review after-hours work expectations.",
        "rationale": "Work sessions are being recorded late in the evening, outside scheduled hours.",
        "actions": ["Clarify that after-hours replies are not expected.", "Check whether time-zone hand-offs could move earlier."],
    },
    "productivityChange": {
        "recommendation": "Check whether workload or task complexity has changed.",
        "rationale": "Recorded productivity is lower than this person's baseline.",
        "actions": ["Ask about blockers and changes in scope.", "Revisit task estimates rather than targets."],
    },
    "weekendDays": {
        "recommendation": "Review weekend workload and recovery time.",
        "rationale": "Work is being recorded on non-scheduled days.",
        "actions": ["Check whether weekly plans are realistic.", "Agree time off in lieu where weekend work was needed."],
    },
}

GENERAL = {
    "key": "general",
    "recommendation": "No changes suggested. Keep regular, informal check-ins.",
    "rationale": "No behavioural indicators contributed to the score.",
    "actions": [],
}

INSUFFICIENT = {
    "key": "data",
    "recommendation": "Collect more activity data before drawing conclusions.",
    "rationale": "There is not enough recorded activity to assess this period. Missing data is not treated as a healthy pattern.",
    "actions": ["Check that activity tracking is working for this person.", "Re-run the analysis once at least two weeks of activity are available."],
}


def generate_recommendations(result: dict) -> list[dict]:
    """Recommendations for an indicator result (from risk_engine)."""
    if result.get("data_sufficiency") == "insufficient_data" or result.get("score") is None:
        return [dict(INSUFFICIENT)]
    out = []
    for factor in result["factors"]:
        if factor["points"] <= 0:
            continue
        rec = RECOMMENDATIONS.get(factor["key"])
        if rec:
            out.append({"key": factor["key"], "factor": factor["label"], **rec})
    if not out:
        out.append(dict(GENERAL))
    if result.get("level") in ("moderate", "elevated"):
        out.append(
            {
                "key": "check_in",
                "factor": "Overall pattern",
                "recommendation": "Offer a supportive, voluntary check-in about workload.",
                "rationale": "Several work patterns changed at once. Start with open questions, not the numbers.",
                "actions": ["Let the person decide what they want to share.", "Agree a follow-up date."],
            }
        )
    return out


def recommendation_text(recommendations: list[dict]) -> str:
    return " ".join(r["recommendation"] for r in recommendations)
