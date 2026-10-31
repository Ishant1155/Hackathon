import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.models import Alert, AlertReviewHistory, Employee
from ..schemas.alert import AlertOut, AlertUpdate, AlertHistoryOut

logger = logging.getLogger("mindguard.alert_service")


def get_alerts_list(
    db: Session,
    status: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    query = db.query(Alert).join(Employee, Alert.employee_id == Employee.id)

    if status and status != "All":
        query = query.filter(Alert.status == status)
    if department and department != "All":
        query = query.filter(Employee.department == department)

    query = query.order_by(desc(Alert.risk_score), desc(Alert.updated_at))
    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [AlertOut.model_validate(it) for it in items]
    }


def update_alert_record(
    db: Session,
    alert_id: str,
    update_data: AlertUpdate
) -> Optional[AlertOut]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    prev_status = alert.status
    has_changes = False

    if update_data.status is not None and update_data.status != alert.status:
        alert.status = update_data.status
        has_changes = True
        # Record history
        db.add(AlertReviewHistory(
            alert_id=alert.id,
            action="STATUS_CHANGE",
            previous_status=prev_status,
            new_status=update_data.status,
            note=update_data.reviewer_notes or f"Status transitioned to {update_data.status}",
            timestamp=datetime.utcnow()
        ))

    if update_data.reviewer_notes is not None:
        alert.reviewer_notes = update_data.reviewer_notes
        has_changes = True

    if update_data.follow_up_date is not None:
        alert.follow_up_date = update_data.follow_up_date
        has_changes = True
        db.add(AlertReviewHistory(
            alert_id=alert.id,
            action="FOLLOWUP_SCHEDULED",
            previous_status=alert.status,
            new_status=alert.status,
            note=f"Scheduled follow-up for {update_data.follow_up_date}",
            timestamp=datetime.utcnow()
        ))

    if update_data.follow_up_completed is not None:
        alert.follow_up_completed = update_data.follow_up_completed
        has_changes = True
        if update_data.follow_up_completed:
            db.add(AlertReviewHistory(
                alert_id=alert.id,
                action="FOLLOWUP_COMPLETED",
                previous_status=alert.status,
                new_status=alert.status,
                note="Supportive follow-up check-in completed.",
                timestamp=datetime.utcnow()
            ))

    if has_changes:
        alert.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)

    return AlertOut.model_validate(alert)


def get_alert_history(db: Session, alert_id: str) -> List[AlertHistoryOut]:
    histories = (
        db.query(AlertReviewHistory)
        .filter(AlertReviewHistory.alert_id == alert_id)
        .order_by(desc(AlertReviewHistory.timestamp))
        .all()
    )
    return [AlertHistoryOut.model_validate(h) for h in histories]
