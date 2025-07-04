# models.py
from sqlalchemy import Column, String, Integer, Float, JSON, ForeignKey, DateTime
from datetime import datetime
from database import Base
from sqlalchemy.dialects.postgresql import ARRAY


class VideoUpload(Base):
    __tablename__ = "video_uploads"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    storage_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, nullable=False)

class Stream(Base):
    __tablename__ = "streams"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)
    thumbnail = Column(String)
    detection_count = Column(Integer)
    uptime = Column(String)

class Detection(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True, index=True)
    type = Column(String)
    confidence = Column(Float)
    timestamp = Column(String)
    bbox = Column(JSON)
    stream_id = Column(String, ForeignKey("streams.id"))

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    stream_id = Column(String, ForeignKey("streams.id"))
    message = Column(String)
    level = Column(String)
    timestamp = Column(String)

class VideoDetection(Base):
    __tablename__ = "video_detections"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("video_uploads.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    detected_objects = Column(ARRAY(String), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class VideoClassification(Base):
    __tablename__ = "video_classifications"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("video_uploads.id"), nullable=False)
    labels = Column(JSON, nullable=False)  # Example: {"label": "sports", "confidence": 92}
    timestamp = Column(DateTime, default=datetime.utcnow)


class VideoAlert(Base):
    __tablename__ = "video_alerts"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("video_uploads.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # fire / violence / accident
    confidence = Column(Float, nullable=False)   # 0-100
    timestamp = Column(DateTime, default=datetime.utcnow)


class VideoSummary(Base):
    __tablename__ = "video_summaries"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("video_uploads.id"), nullable=False)
    summary_text = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
