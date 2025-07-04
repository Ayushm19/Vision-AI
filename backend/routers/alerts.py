from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Alert
from database import SessionLocal
from schemas import AlertBase

router = APIRouter(prefix="/alerts", tags=["Alerts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[AlertBase])
def get_alerts(
    stream_id: str = Query(None),
    limit: int = Query(5),
    db: Session = Depends(get_db),
):
    query = db.query(Alert).order_by(desc(Alert.timestamp))
    if stream_id:
        query = query.filter(Alert.stream_id == stream_id)
    return query.limit(limit).all()

@router.post("/", response_model=AlertBase)
def create_alert(alert: AlertBase, db: Session = Depends(get_db)):
    db_alert = Alert(**alert.dict())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert
