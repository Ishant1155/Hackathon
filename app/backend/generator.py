
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from pathlib import Path

# Reproducible random data
np.random.seed(42)
random.seed(42)

# --------------------------------
# CONFIGURATION
# --------------------------------

NUM_EMPLOYEES = 100
NUM_DAYS = 30
START_DATE = "2026-10-01"

OUTPUT_DIR = Path("dataset")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEPARTMENTS = [
    "Engineering",
    "Marketing",
    "Human Resources",
    "Finance",
    "Operations",
    "Sales"
]

DESIGNATIONS = [
    "Software Developer",
    "Data Analyst",
    "Project Manager",
    "Business Analyst",
    "HR Executive",
    "Marketing Executive"
]

WORK_ARRANGEMENTS = ["Office", "Remote", "Hybrid"]

# --------------------------------
# 1. EMPLOYEE PROFILE GENERATOR
# --------------------------------

def generate_employees():

    employees = []

    for i in range(NUM_EMPLOYEES):

        if i < 60:
            group = "healthy"
        elif i < 85:
            group = "occasional_overtime"
        else:
            group = "sustained_overwork"

        employees.append({
            "employee_id": f"EMP{i + 1:04}",
            "department": random.choice(DEPARTMENTS),
            "designation": random.choice(DESIGNATIONS),
            "work_arrangement": random.choice(WORK_ARRANGEMENTS),
            "shift_type": "day",
            "expected_hours": 8,
            "behaviour_group": group
        })

    return pd.DataFrame(employees)


# --------------------------------
# 2. DAILY ACTIVITY GENERATOR
# --------------------------------

def generate_daily_activity(employees):

    records = []

    start_date = pd.Timestamp(START_DATE)

    for _, employee in employees.iterrows():

        group = employee["behaviour_group"]
        employee_id = employee["employee_id"]

        # Employee-specific variation
        baseline = np.random.normal(8, 0.35)
        productivity_baseline = np.random.normal(85, 5)

        for day in range(NUM_DAYS):

            date = start_date + timedelta(days=day)
            weekday = date.weekday()

            is_weekend = weekday >= 5

            # Occasional planned leave
            planned_leave = np.random.random() < 0.025

            # Probability of working on weekends
            if is_weekend:
                if group == "healthy":
                    works_today = np.random.random() < 0.04
                elif group == "occasional_overtime":
                    works_today = np.random.random() < 0.30
                else:
                    works_today = np.random.random() < 0.65
            else:
                works_today = not planned_leave

            if not works_today:

                records.append({
                    "employee_id": employee_id,
                    "date": date.date(),
                    "login_time": None,
                    "logout_time": None,
                    "working_hours": 0,
                    "break_count": 0,
                    "total_break_minutes": 0,
                    "average_break_minutes": 0,
                    "late_night_sessions": 0,
                    "night_activity_minutes": 0,
                    "weekend_work": False,
                    "tasks_assigned": 0,
                    "tasks_completed": 0,
                    "productivity_score": np.nan,
                    "meetings_count": 0,
                    "meeting_minutes": 0,
                    "overtime_hours": 0,
                    "scheduled_workday": not is_weekend,
                    "planned_leave": planned_leave,
                    "data_completeness": 1.0,
                    "behaviour_group": group
                })

                continue

            # --------------------------------
            # WORKING HOURS
            # --------------------------------

            progression = day / max(NUM_DAYS - 1, 1)

            if group == "healthy":

                hours = baseline + np.random.normal(0, 0.45)

            elif group == "occasional_overtime":

                hours = baseline + np.random.normal(1.2, 1.0)

            else:

                # Gradually increasing working hours
                hours = (
                    baseline
                    + 0.5
                    + progression * 3.5
                    + np.random.normal(0, 0.65)
                )

            hours = float(np.clip(hours, 4, 14))

            # --------------------------------
            # BREAKS
            # --------------------------------

            if group == "healthy":
                break_count = random.randint(3, 5)

            elif group == "occasional_overtime":
                break_count = random.randint(2, 4)

            else:
                break_count = random.randint(0, 2)

            average_break = float(
                np.random.uniform(8, 18)
            )

            total_break_minutes = (
                break_count * average_break
            )

            # --------------------------------
            # LATE-NIGHT ACTIVITY
            # --------------------------------

            if group == "healthy":
                night_probability = 0.05

            elif group == "occasional_overtime":
                night_probability = 0.25

            else:
                night_probability = 0.20 + progression * 0.50

            late_night_sessions = int(
                np.random.binomial(2, min(night_probability, 0.9))
            )

            night_activity_minutes = (
                late_night_sessions
                * random.randint(15, 50)
            )

            # --------------------------------
            # LOGIN AND LOGOUT
            # --------------------------------

            login_hour = np.random.normal(9, 0.5)
            login_hour = float(np.clip(login_hour, 7, 11))

            login_minutes = int(login_hour * 60)

            login_datetime = (
                datetime.combine(date.date(), datetime.min.time())
                + timedelta(minutes=login_minutes)
            )

            # Span includes breaks, not just active work
            logout_datetime = login_datetime + timedelta(
                minutes=int(hours * 60 + total_break_minutes)
            )

            # --------------------------------
            # TASKS AND PRODUCTIVITY
            # --------------------------------

            tasks_assigned = random.randint(5, 12)

            if group == "healthy":
                productivity_target = productivity_baseline

            elif group == "occasional_overtime":
                productivity_target = productivity_baseline - 5

            else:
                productivity_target = (
                    productivity_baseline
                    - progression * 25
                )

            productivity_target += np.random.normal(0, 5)

            productivity_target = float(
                np.clip(productivity_target, 30, 100)
            )

            completion_rate = productivity_target / 100

            tasks_completed = int(
                round(tasks_assigned * completion_rate)
            )

            # Score reflects task completion and variation
            productivity_score = float(
                np.clip(
                    completion_rate * 85
                    + np.random.normal(0, 5),
                    0,
                    100
                )
            )

            # --------------------------------
            # MEETINGS
            # --------------------------------

            meetings_count = random.randint(1, 6)

            meeting_minutes = (
                meetings_count * random.randint(20, 45)
            )

            # --------------------------------
            # OVERTIME
            # --------------------------------

            overtime_hours = max(
                0,
                hours - employee["expected_hours"]
            )

            # --------------------------------
            # SAVE DAILY RECORD
            # --------------------------------

            records.append({

                "employee_id": employee_id,
                "date": date.date(),

                "login_time": login_datetime.strftime("%H:%M"),
                "logout_time": logout_datetime.strftime("%H:%M"),

                "working_hours": round(hours, 2),

                "break_count": break_count,
                "total_break_minutes": round(
                    total_break_minutes, 2
                ),
                "average_break_minutes": round(
                    average_break, 2
                ),

                "late_night_sessions": late_night_sessions,
                "night_activity_minutes": night_activity_minutes,

                "weekend_work": is_weekend,

                "tasks_assigned": tasks_assigned,
                "tasks_completed": tasks_completed,
                "productivity_score": round(
                    productivity_score, 2
                ),

                "meetings_count": meetings_count,
                "meeting_minutes": meeting_minutes,

                "overtime_hours": round(overtime_hours, 2),

                "scheduled_workday": not is_weekend,
                "planned_leave": False,

                "data_completeness": 1.0,

                "behaviour_group": group
            })

    return pd.DataFrame(records)


# --------------------------------
# 3. FEATURE ENGINEERING
# --------------------------------

def generate_features(activity):

    df = activity.copy()

    df["date"] = pd.to_datetime(df["date"])

    df = df.sort_values(
        ["employee_id", "date"]
    ).reset_index(drop=True)

    grouped = df.groupby("employee_id")

    # Seven-day averages
    rolling_columns = {
        "working_hours": "avg_hours_7d",
        "break_count": "avg_breaks_7d",
        "productivity_score": "avg_productivity_7d",
        "overtime_hours": "avg_overtime_7d",
        "meeting_minutes": "avg_meeting_minutes_7d"
    }

    for source, target in rolling_columns.items():

        df[target] = grouped[source].transform(
            lambda x: x.rolling(
                7, min_periods=3
            ).mean()
        )

    # Seven-day late-night frequency
    df["night_sessions_7d"] = grouped[
        "late_night_sessions"
    ].transform(
        lambda x: x.rolling(
            7, min_periods=1
        ).sum()
    )

    # Weekend work frequency over 14 days
    df["weekend_days_14d"] = grouped[
        "weekend_work"
    ].transform(
        lambda x: x.rolling(
            14, min_periods=1
        ).sum()
    )

    # Productivity change compared with previous 7 days
    previous_productivity = grouped[
        "productivity_score"
    ].transform(
        lambda x: x.shift(7).rolling(
            7, min_periods=3
        ).mean()
    )

    df["productivity_change"] = (
        df["avg_productivity_7d"]
        - previous_productivity
    )

    # Working-hour variability
    df["work_variability_7d"] = grouped[
        "working_hours"
    ].transform(
        lambda x: x.rolling(
            7, min_periods=3
        ).std()
    )

    # Task completion rate
    df["task_completion_rate"] = (
        df["tasks_completed"]
        / df["tasks_assigned"].replace(0, np.nan)
    ) * 100

    return df


# --------------------------------
# 4. MAIN EXECUTION
# --------------------------------

if __name__ == "__main__":

    print("Generating employee profiles...")

    employees = generate_employees()

    print("Generating daily activity...")

    activity = generate_daily_activity(employees)

    print("Calculating ML features...")

    features = generate_features(activity)

    # Export datasets
    employees.to_csv(
        OUTPUT_DIR / "employees.csv",
        index=False
    )

    activity.to_csv(
        OUTPUT_DIR / "employee_activity.csv",
        index=False
    )

    features.to_csv(
        OUTPUT_DIR / "employee_features.csv",
        index=False
    )

    print("\nDATA GENERATION COMPLETE")

    print("Employees:", len(employees))
    print("Daily records:", len(activity))
    print("Feature records:", len(features))

    print("\nBehaviour groups:")
    print(employees["behaviour_group"].value_counts())

    print("\nFiles saved in:", OUTPUT_DIR)
