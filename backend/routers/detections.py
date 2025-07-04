from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Detection
from database import SessionLocal
from schemas import DetectionBase

router = APIRouter(prefix="/detections", tags=["Detections"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[DetectionBase])
def get_detections(
    stream_id: str = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    query = db.query(Detection).order_by(desc(Detection.timestamp))
    if stream_id:
        query = query.filter(Detection.stream_id == stream_id)
    return query.limit(limit).all()

@router.post("/", response_model=DetectionBase)
def create_detection(detection: DetectionBase, db: Session = Depends(get_db)):
    db_detection = Detection(**detection.dict())
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)
    return db_detection
