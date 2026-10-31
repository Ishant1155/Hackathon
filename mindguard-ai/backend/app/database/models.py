"""Database schema.

Primary tables: employees, daily_activity, assessments.
simulation_labels holds the synthetic ground truth separately so it can
never leak into production assessments or model inputs.

All nullable measurement columns stay NULL when data is missing; NULL is
never replaced with zero.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database.connection import Base


def _now():
    return datetime.now(timezone.utc)


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(String(16), primary_key=True)
    name = Column(String(120), nullable=False)
    department = Column(String(40), nullable=False, index=True)
    designation = Column(String(120), nullable=False)
    work_arrangement = Column(String(20), nullable=False, default="Office")
    shift_type = Column(String(20), nullable=False, default="day")
    expected_hours = Column(Float, nullable=False, default=8.0)
    working_days = Column(String(40), nullable=False, default="Mon,Tue,Wed,Thu,Fri")
    start_date = Column(Date, nullable=True)

    activities = relationship("DailyActivity", back_populates="employee", cascade="all, delete-orphan", order_by="DailyActivity.date")
    assessments = relationship("Assessment", back_populates="employee", cascade="all, delete-orphan", order_by="Assessment.created_at")

    def to_dict(self) -> dict:
        return {
            "employee_id": self.employee_id,
            "name": self.name,
            "department": self.department,
            "designation": self.designation,
            "work_arrangement": self.work_arrangement,
            "shift_type": self.shift_type,
            "expected_hours": self.expected_hours,
            "working_days": self.working_days,
            "start_date": self.start_date.isoformat() if self.start_date else None,
        }


class DailyActivity(Base):
    __tablename__ = "daily_activity"
    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_activity_employee_date"),
        Index("ix_activity_date", "date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(16), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    login_datetime = Column(DateTime, nullable=True)
    logout_datetime = Column(DateTime, nullable=True)
    working_hours = Column(Float, nullable=True)
    break_count = Column(Integer, nullable=True)
    total_break_minutes = Column(Integer, nullable=True)
    average_break_minutes = Column(Float, nullable=True)
    late_night_sessions = Column(Integer, nullable=True)
    night_activity_minutes = Column(Integer, nullable=True)
    weekend_work = Column(Boolean, nullable=True)
    tasks_assigned = Column(Integer, nullable=True)
    tasks_completed = Column(Integer, nullable=True)
    tasks_pending = Column(Integer, nullable=True)
    productivity_score = Column(Float, nullable=True)
    meetings_count = Column(Integer, nullable=True)
    meeting_minutes = Column(Integer, nullable=True)
    overtime_hours = Column(Float, nullable=True)
    scheduled_workday = Column(Boolean, nullable=False, default=True)
    planned_leave = Column(Boolean, nullable=False, default=False)
    data_completeness = Column(String(12), nullable=False, default="complete")

    employee = relationship("Employee", back_populates="activities")

    COLUMNS = [
        "employee_id", "date", "login_datetime", "logout_datetime", "working_hours", "break_count", "total_break_minutes",
        "average_break_minutes", "late_night_sessions", "night_activity_minutes", "weekend_work", "tasks_assigned",
        "tasks_completed", "tasks_pending", "productivity_score", "meetings_count", "meeting_minutes", "overtime_hours",
        "scheduled_workday", "planned_leave", "data_completeness",
    ]

    def to_dict(self) -> dict:
        out = {c: getattr(self, c) for c in self.COLUMNS}
        out["date"] = self.date.isoformat()
        return out


class Assessment(Base):
    """A saved analysis result. Simulation Lab results are never stored here."""

    __tablename__ = "assessments"
    __table_args__ = (Index("ix_assessment_employee_date", "employee_id", "assessment_date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(16), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    assessment_date = Column(Date, nullable=False)
    anomaly_detected = Column(Boolean, nullable=True)  # NULL when the model could not score
    anomaly_score = Column(Float, nullable=True)
    indicator_score = Column(Integer, nullable=True)  # NULL when data is insufficient
    indicator_level = Column(String(24), nullable=False)
    data_sufficiency = Column(String(24), nullable=False)
    explanation = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    factors_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, nullable=False, default=_now)

    employee = relationship("Employee", back_populates="assessments")


class SimulationLabel(Base):
    """Synthetic ground truth. Used only for model evaluation; never a model input or API field."""

    __tablename__ = "simulation_labels"

    employee_id = Column(String(16), ForeignKey("employees.employee_id", ondelete="CASCADE"), primary_key=True)
    simulation_group = Column(String(32), nullable=False)
    ramp_start_date = Column(Date, nullable=True)
