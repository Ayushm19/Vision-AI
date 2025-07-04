# schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Dict

class VideoUploadCreate(BaseModel):
    filename: str
    storage_url: str

class VideoUploadResponse(VideoUploadCreate):
    id: str
    uploaded_at: datetime

class StreamBase(BaseModel):
    id: str
    name: str
    status: str
    thumbnail: str
    detection_count: int
    uptime: str

    class Config:
        orm_mode = True

class DetectionBase(BaseModel):
    id: str
    stream_id: str
    type: str
    confidence: float
    timestamp: str
    bbox: Dict[str, float]

    class Config:
        orm_mode = True

class AlertBase(BaseModel):
    id: str
    stream_id: str
    message: str
    level: str
    timestamp: str

    class Config:
        orm_mode = True
