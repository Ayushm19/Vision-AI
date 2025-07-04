# routers/streams.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal
from models import Stream, Detection, Alert

router = APIRouter(prefix="/streams", tags=["Streams"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_streams(db: Session = Depends(get_db)):
    streams = db.query(Stream).all()
    enriched_streams = []

    for stream in streams:
        # Count detections
        detection_count = db.query(func.count(Detection.id)).filter(Detection.stream_id == stream.id).scalar()

        # Get latest alert message
        latest_alert = (
            db.query(Alert)
            .filter(Alert.stream_id == stream.id)
            .order_by(Alert.timestamp.desc())
            .first()
        )
        enriched_streams.append({
            "id": stream.id,
            "name": stream.name,
            "status": stream.status,
            "thumbnail": stream.thumbnail,
            "detection_count": detection_count,
            "last_alert": latest_alert.message if latest_alert else None,
            "uptime": stream.uptime,
        })

    return enriched_streams

@router.get("/{stream_id}")
def get_stream_by_id(stream_id: str, db: Session = Depends(get_db)):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    detection_count = db.query(func.count(Detection.id)).filter(Detection.stream_id == stream.id).scalar()
    latest_alert = (
        db.query(Alert)
        .filter(Alert.stream_id == stream.id)
        .order_by(Alert.timestamp.desc())
        .first()
    )

    return {
        "id": stream.id,
        "name": stream.name,
        "status": stream.status,
        "thumbnail": stream.thumbnail,
        "detection_count": detection_count,
        "last_alert": latest_alert.message if latest_alert else None,
        "uptime": stream.uptime,
    }
