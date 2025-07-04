from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import uuid4
from pydantic import BaseModel
from datetime import datetime

from services.object_detection import run_object_detection
from services.ai_utils import run_classification, detect_alerts, summarize_video
from models import (
    VideoDetection,
    VideoClassification,
    VideoAlert,
    VideoSummary
)
from database import get_db

router = APIRouter(prefix="/ai", tags=["AI Inference"])

class DetectRequest(BaseModel):
    video_url: str
    video_id: str

@router.post("/analyze")
def analyze_video(payload: DetectRequest, db: Session = Depends(get_db)):
    try:
        # 1. Run Object Detection
        results = run_object_detection(payload.video_url)
        for item in results:
            db.add(VideoDetection(
                id=str(uuid4()),
                video_id=payload.video_id,
                frame_number=item["frame"],
                detected_objects=item["objects"],
                timestamp=datetime.utcnow()
            ))

        # 2. Run Classification
        labels = run_classification(payload.video_url)
        db.add(VideoClassification(
            id=str(uuid4()),
            video_id=payload.video_id,
            labels=labels,
            timestamp=datetime.utcnow()
        ))

        # 3. Detect Alerts (fire, violence, etc.)
        alerts = detect_alerts(payload.video_url)
        for alert in alerts:
            db.add(VideoAlert(
                id=str(uuid4()),
                video_id=payload.video_id,
                alert_type=alert["type"],
                confidence=alert["confidence"],
                timestamp=datetime.utcnow()
            ))

        # 4. Summarize Video
        summary_text = summarize_video(payload.video_url)
        db.add(VideoSummary(
            id=str(uuid4()),
            video_id=payload.video_id,
            summary_text=summary_text,
            timestamp=datetime.utcnow()
        ))

        db.commit()

        return {
            "success": True,
            "object_detection": results,
            "classification": labels,
            "alerts": alerts,
            "summary": summary_text
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def summarize_detection(video_id: str, db: Session = Depends(get_db)):
    # Get detections
    detections = db.query(VideoDetection).filter_by(video_id=video_id).all()

    if not detections:
        return {"summary": None}

    object_counts = {}
    frame_summaries = []

    for d in detections:
        for obj in d.detected_objects:
            object_counts[obj] = object_counts.get(obj, 0) + 1
        frame_summaries.append({
            "frame": d.frame_number,
            "objects": d.detected_objects
        })

    top_frames = sorted(frame_summaries, key=lambda x: len(x["objects"]), reverse=True)[:5]

    # Get classification labels
    classification = db.query(VideoClassification).filter_by(video_id=video_id).first()
    classification_labels = classification.labels if classification else []

    # Get alerts
    alerts = db.query(VideoAlert).filter_by(video_id=video_id).all()
    alert_data = [
        {
            "type": a.alert_type,
            "confidence": a.confidence,
            "timestamp": a.timestamp
        }
        for a in alerts
    ]

    # Get video summary
    summary_entry = db.query(VideoSummary).filter_by(video_id=video_id).first()
    summary_text = summary_entry.summary_text if summary_entry else ""

    return {
        "summary": {
            "total_frames": len(set([d.frame_number for d in detections])),
            "object_counts": object_counts,
            "top_frames": top_frames,
            "classification": classification_labels,
            "alerts": alert_data,
            "summary_text": summary_text
        }
    }
