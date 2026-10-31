import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

DEPARTMENTS = [
    "Engineering",
    "Product Management",
    "Design & UX",
    "Data & Analytics",
    "Customer Experience",
    "Marketing & Growth",
    "Sales & Accounts",
    "Operations",
]

ROLES_BY_DEPT = {
    "Engineering": ["Senior Full-Stack Engineer", "Backend Developer", "DevOps Engineer", "Frontend Specialist", "QA Automation Engineer"],
    "Product Management": ["Lead Product Manager", "Associate Product Manager", "Technical Program Manager"],
    "Design & UX": ["Senior Product Designer", "UX Researcher", "Visual Designer"],
    "Data & Analytics": ["Data Scientist", "BI Analyst", "Machine Learning Engineer"],
    "Customer Experience": ["Customer Success Lead", "Support Specialist", "Implementation Consultant"],
    "Marketing & Growth": ["Growth Marketing Manager", "Content Strategist", "Performance Marketer"],
    "Sales & Accounts": ["Enterprise Account Executive", "Sales Engineer", "Business Development Rep"],
    "Operations": ["Operations Lead", "People Partner", "Strategy Analyst"],
}


def generate_synthetic_dataset(
    employee_count: int = 100,
    days: int = 30,
    seed: int = 42
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Generates synthetic employees and their 30-day daily records.
    Returns: (employees_list, daily_records_list)
    """
    random.seed(seed)
    
    # End date is today (simulated as current date)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)

    employees: List[Dict[str, Any]] = []
    records: List[Dict[str, Any]] = []

    # 1. Profile A: Healthy Pattern (EMP-001)
    employees.append({
        "id": "EMP-001",
        "name": "Employee 001 (Alice Chen)",
        "department": "Engineering",
        "role": "Senior Full-Stack Engineer",
        "schedule": "09:00 - 17:30 (40h/wk)",
        "profile_type": "HEALTHY_DEMO",
        "baseline_hours": 8.0,
    })

    # 2. Profile B: Occasional Overtime (EMP-002)
    employees.append({
        "id": "EMP-002",
        "name": "Employee 002 (Marcus Vance)",
        "department": "Product Management",
        "role": "Lead Product Manager",
        "schedule": "09:00 - 17:30 (40h/wk)",
        "profile_type": "OVERTIME_DEMO",
        "baseline_hours": 8.0,
    })

    # 3. Profile C: Sustained Overwork Pattern (EMP-003)
    employees.append({
        "id": "EMP-003",
        "name": "Employee 003 (Elena Rostova)",
        "department": "Engineering",
        "role": "Backend Developer",
        "schedule": "09:00 - 17:30 (40h/wk)",
        "profile_type": "OVERWORK_DEMO",
        "baseline_hours": 8.0,
    })

    # Remaining employees (EMP-004 to EMP-100+)
    for i in range(4, employee_count + 1):
        emp_id = f"EMP-{i:03d}"
        dept = DEPARTMENTS[i % len(DEPARTMENTS)]
        roles = ROLES_BY_DEPT[dept]
        role = roles[i % len(roles)]
        
        # Distribute background profile mix: 75% healthy, 18% occasional overtime, 7% elevated
        roll = random.random()
        if roll < 0.75:
            p_type = "STANDARD_HEALTHY"
        elif roll < 0.93:
            p_type = "STANDARD_OVERTIME"
        else:
            p_type = "STANDARD_OVERWORK"

        employees.append({
            "id": emp_id,
            "name": f"Employee {i:03d}",
            "department": dept,
            "role": role,
            "schedule": "09:00 - 17:30 (40h/wk)",
            "profile_type": p_type,
            "baseline_hours": 8.0,
        })

    # Generate daily records for each employee
    for emp in employees:
        emp_id = emp["id"]
        p_type = emp["profile_type"]

        for day_idx in range(days):
            cur_date = start_date + timedelta(days=day_idx)
            weekday_name = cur_date.strftime("%A")
            is_weekend = cur_date.weekday() >= 5  # Saturday=5, Sunday=6

            # Determine behaviors based on profile type
            if p_type == "HEALTHY_DEMO":
                if is_weekend:
                    working_hours = 0.0
                    start_time = "00:00"
                    end_time = "00:00"
                    breaks = 0
                    break_dur = 0.0
                    late_night = False
                    weekend_work = False
                    tasks = 0
                    trend = 0.05
                    workload = 0.0
                    recovery = 24.0
                else:
                    # 7.5 to 8.5 hours
                    working_hours = round(random.uniform(7.4, 8.6), 1)
                    start_h = random.choice([8, 9])
                    start_m = random.choice([0, 15, 30])
                    start_time = f"{start_h:02d}:{start_m:02d}"
                    end_h = int(start_h + working_hours + 1)
                    end_time = f"{min(20, end_h):02d}:30"
                    breaks = random.choice([3, 4])
                    break_dur = round(random.uniform(15.0, 20.0), 1)
                    late_night = False
                    weekend_work = False
                    tasks = random.randint(5, 7)
                    trend = round(random.uniform(0.0, 0.08), 2)
                    workload = 1.0
                    recovery = round(24.0 - working_hours - 1.0, 1)

            elif p_type == "OVERTIME_DEMO":
                if is_weekend:
                    # Rare light weekend catchup (once a month)
                    worked_wknd = (day_idx % 14 == 6) and (random.random() < 0.4)
                    if worked_wknd:
                        working_hours = round(random.uniform(3.0, 4.5), 1)
                        start_time = "10:00"
                        end_time = "14:30"
                        breaks = 1
                        break_dur = 15.0
                        late_night = False
                        weekend_work = True
                        tasks = 2
                        trend = 0.0
                        workload = 0.6
                        recovery = 18.0
                    else:
                        working_hours = 0.0
                        start_time = "00:00"
                        end_time = "00:00"
                        breaks = 0
                        break_dur = 0.0
                        late_night = False
                        weekend_work = False
                        tasks = 0
                        trend = 0.0
                        workload = 0.0
                        recovery = 24.0
                else:
                    # 8.5 to 10.2 hours on some weekdays
                    is_late_day = (day_idx % 4 == 0)
                    if is_late_day:
                        working_hours = round(random.uniform(9.2, 10.5), 1)
                        late_night = random.random() < 0.5
                    else:
                        working_hours = round(random.uniform(8.0, 8.8), 1)
                        late_night = False
                    start_time = "09:00"
                    end_time = "19:30" if is_late_day else "17:45"
                    breaks = random.choice([2, 3])
                    break_dur = round(random.uniform(12.0, 18.0), 1)
                    weekend_work = False
                    tasks = random.randint(5, 7)
                    trend = round(random.uniform(-0.05, 0.05), 2)
                    workload = 1.2
                    recovery = round(24.0 - working_hours - 1.0, 1)

            elif p_type == "OVERWORK_DEMO":
                # Sustained Overwork: 12-14 hrs repeatedly, fewer breaks, frequent late night, weekend work, declining tasks
                # Simulate progression: first 7 days were already tough (~10h), then last 20 days escalated to 12-14h
                is_escalated = (day_idx >= 8)
                if is_weekend:
                    # Worked almost every weekend
                    working_hours = round(random.uniform(6.5, 9.5), 1) if is_escalated else round(random.uniform(0.0, 5.0), 1)
                    weekend_work = (working_hours > 0)
                    start_time = "10:00" if weekend_work else "00:00"
                    end_time = f"{10 + int(working_hours)}:00" if weekend_work else "00:00"
                    breaks = 1 if weekend_work else 0
                    break_dur = 10.0 if weekend_work else 0.0
                    late_night = (working_hours >= 8.0)
                    tasks = random.randint(2, 4) if weekend_work else 0
                    trend = -0.25 if is_escalated else -0.05
                    workload = 1.4
                    recovery = round(24.0 - working_hours, 1)
                else:
                    # Weekdays: 12.0 to 14.2 hours
                    if is_escalated:
                        working_hours = round(random.uniform(12.0, 14.2), 1)
                        late_night = random.random() < 0.85
                        breaks = random.choice([0, 1])
                        break_dur = round(random.uniform(5.0, 10.0), 1)
                        # Declining task completion due to fatigue & meetings
                        tasks = max(1, random.randint(2, 4))
                        trend = round(random.uniform(-0.45, -0.28), 2)
                        recovery = round(max(5.0, 24.0 - working_hours - 0.5), 1)
                    else:
                        working_hours = round(random.uniform(9.5, 11.5), 1)
                        late_night = random.random() < 0.4
                        breaks = random.choice([1, 2])
                        break_dur = 12.0
                        tasks = random.randint(5, 6)
                        trend = -0.10
                        recovery = 12.0

                    start_time = "08:15"
                    end_hour = min(23, int(8 + working_hours + 1))
                    end_time = f"{end_hour:02d}:45"
                    weekend_work = False
                    workload = 1.9

            elif p_type == "STANDARD_OVERWORK":
                if is_weekend:
                    worked = random.random() < 0.6
                    working_hours = round(random.uniform(5.0, 8.0), 1) if worked else 0.0
                    weekend_work = worked
                    start_time = "10:00" if worked else "00:00"
                    end_time = "17:00" if worked else "00:00"
                    breaks = 1 if worked else 0
                    break_dur = 10.0 if worked else 0.0
                    late_night = False
                    tasks = 3 if worked else 0
                    trend = -0.25
                    workload = 1.4
                    recovery = round(24.0 - working_hours, 1)
                else:
                    working_hours = round(random.uniform(11.5, 13.5), 1)
                    start_time = "08:30"
                    end_time = "21:30"
                    breaks = random.choice([1, 2])
                    break_dur = round(random.uniform(8.0, 12.0), 1)
                    late_night = random.random() < 0.65
                    weekend_work = False
                    tasks = random.randint(3, 5)
                    trend = round(random.uniform(-0.35, -0.15), 2)
                    workload = 1.7
                    recovery = round(24.0 - working_hours - 0.5, 1)

            elif p_type == "STANDARD_OVERTIME":
                if is_weekend:
                    working_hours = 0.0
                    start_time = "00:00"
                    end_time = "00:00"
                    breaks = 0
                    break_dur = 0.0
                    late_night = False
                    weekend_work = False
                    tasks = 0
                    trend = 0.0
                    workload = 0.0
                    recovery = 24.0
                else:
                    is_ot = random.random() < 0.4
                    working_hours = round(random.uniform(9.0, 10.2), 1) if is_ot else round(random.uniform(7.8, 8.6), 1)
                    start_time = "09:00"
                    end_time = "19:15" if is_ot else "17:30"
                    breaks = random.choice([2, 3])
                    break_dur = round(random.uniform(12.0, 18.0), 1)
                    late_night = is_ot and (random.random() < 0.3)
                    weekend_work = False
                    tasks = random.randint(5, 7)
                    trend = round(random.uniform(-0.05, 0.05), 2)
                    workload = 1.2
                    recovery = round(24.0 - working_hours - 1.0, 1)

            else:  # STANDARD_HEALTHY
                if is_weekend:
                    working_hours = 0.0
                    start_time = "00:00"
                    end_time = "00:00"
                    breaks = 0
                    break_dur = 0.0
                    late_night = False
                    weekend_work = False
                    tasks = 0
                    trend = 0.02
                    workload = 0.0
                    recovery = 24.0
                else:
                    working_hours = round(random.uniform(7.3, 8.7), 1)
                    start_time = "09:00"
                    end_time = "17:30"
                    breaks = random.choice([3, 4])
                    break_dur = round(random.uniform(14.0, 22.0), 1)
                    late_night = False
                    weekend_work = False
                    tasks = random.randint(5, 7)
                    trend = round(random.uniform(0.0, 0.05), 2)
                    workload = 1.0
                    recovery = round(24.0 - working_hours - 1.0, 1)

            records.append({
                "employee_id": emp_id,
                "record_date": cur_date.strftime("%Y-%m-%d"),
                "day_of_week": weekday_name,
                "work_start_time": start_time,
                "work_end_time": end_time,
                "working_hours": working_hours,
                "break_count": breaks,
                "avg_break_duration": break_dur,
                "late_night_active": late_night,
                "weekend_work": weekend_work,
                "tasks_completed": tasks,
                "task_completion_trend": trend,
                "workload_indicator": workload,
                "historical_productivity_index": 1.0,
                "recovery_hours": recovery,
            })

    return employees, records
