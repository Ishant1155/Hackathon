from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from .session import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    schedule = Column(String(100), default="09:00 - 17:30 (40h/wk)")
    profile_type = Column(String(50), default="STANDARD", index=True)
    baseline_hours = Column(Float, default=8.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    records = relationship("DailyRecord", back_populates="employee", cascade="all, delete-orphan")
    assessments = relationship("WellbeingAssessment", back_populates="employee", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="employee", cascade="all, delete-orphan")


class DailyRecord(Base):
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    record_date = Column(String(20), nullable=False, index=True)
    day_of_week = Column(String(20), nullable=False)
    work_start_time = Column(String(10), nullable=False)
    work_end_time = Column(String(10), nullable=False)
    working_hours = Column(Float, nullable=False)
    break_count = Column(Integer, default=3)
    avg_break_duration = Column(Float, default=15.0)  # minutes
    late_night_active = Column(Boolean, default=False)
    weekend_work = Column(Boolean, default=False)
    tasks_completed = Column(Integer, default=5)
    task_completion_trend = Column(Float, default=0.0)  # percentage difference from baseline
    workload_indicator = Column(Float, default=1.0)
    historical_productivity_index = Column(Float, default=1.0)
    recovery_hours = Column(Float, default=14.0)

    employee = relationship("Employee", back_populates="records")

    __table_args__ = (
        Index("idx_emp_date", "employee_id", "record_date", unique=True),
    )


class WellbeingAssessment(Base):
    __tablename__ = "wellbeing_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_date = Column(String(20), nullable=False, index=True)
    overall_risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_category = Column(String(50), nullable=False, index=True)  # Low, Moderate, Elevated, High Priority
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)  # 0.0 to 1.0 normalized
    
    # Transparent score component breakdown
    hours_score = Column(Float, default=0.0)
    late_night_score = Column(Float, default=0.0)
    task_trend_score = Column(Float, default=0.0)
    break_score = Column(Float, default=0.0)
    weekend_score = Column(Float, default=0.0)
    anomaly_modifier = Column(Float, default=0.0)

    primary_explanation = Column(Text, nullable=False)
    contributing_factors_json = Column(Text, default="[]")
    supporting_observations_json = Column(Text, default="[]")
    recommendations_json = Column(Text, default="[]")
    data_completeness = Column(String(100), default="100% complete (30/30 days)")
    confidence_limitations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="assessments")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    created_date = Column(String(20), nullable=False, index=True)
    risk_category = Column(String(50), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    contributing_factors = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(50), default="Open", index=True)  # Open, Under Review, Follow-up Scheduled, Resolved
    reviewer_notes = Column(Text, nullable=True)
    follow_up_date = Column(String(20), nullable=True)
    follow_up_completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="alerts")
    history = relationship("AlertReviewHistory", back_populates="alert", cascade="all, delete-orphan")


class AlertReviewHistory(Base):
    __tablename__ = "alert_review_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(50), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="history")


class ApplicationSettings(Base):
    __tablename__ = "application_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
