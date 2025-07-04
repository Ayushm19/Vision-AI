from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from uuid import uuid4
from sqlalchemy.orm import Session
from database import get_db
from models import VideoUpload
from datetime import datetime
import os
from supabase import create_client
from dotenv import load_dotenv
from models import VideoUpload, VideoDetection, VideoAlert, VideoClassification, VideoSummary


load_dotenv()  # ✅ Load .env variables before using them

router = APIRouter(prefix="/videos", tags=["Videos"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class VideoMetadata(BaseModel):
    filename: str
    storage_url: str
    uploaded_at: datetime

@router.post("/metadata")
def save_video_metadata(data: VideoMetadata, db: Session = Depends(get_db)):
    try:
        new_entry = VideoUpload(
            id=str(uuid4()),
            filename=data.filename,
            storage_url=data.storage_url,
            uploaded_at=data.uploaded_at
        )
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return {"message": "Metadata saved", "video": {
            "id": new_entry.id,
            "filename": new_entry.filename,
            "storage_url": new_entry.storage_url,
            "uploaded_at": new_entry.uploaded_at.isoformat()
        }}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", summary="List uploaded videos")
def list_uploaded_videos(db: Session = Depends(get_db)):
    try:
        videos = db.query(VideoUpload).order_by(VideoUpload.uploaded_at.desc()).all()
        return [
            {
                "id": video.id,
                "filename": video.filename,
                "storage_url": video.storage_url,
                "uploaded_at": video.uploaded_at.isoformat(),
            }
            for video in videos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ DELETE endpoint
@router.delete("/{video_id}", summary="Delete video")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    print("Received video_id for deletion:", video_id)
    video = db.query(VideoUpload).filter(VideoUpload.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    try:
        # 🧹 Delete all related records first
        db.query(VideoAlert).filter(VideoAlert.video_id == video_id).delete()
        db.query(VideoClassification).filter(VideoClassification.video_id == video_id).delete()
        db.query(VideoDetection).filter(VideoDetection.video_id == video_id).delete()
        db.query(VideoSummary).filter(VideoSummary.video_id == video_id).delete()

        # ✅ Delete file from Supabase
        filename = video.storage_url.split("/")[-1]
        delete_response = supabase.storage.from_("videos").remove([filename])
        print("Supabase delete response:", delete_response)

        if isinstance(delete_response, dict) and delete_response.get("error"):
            raise Exception(delete_response["error"]["message"])

        # 🗃️ Now delete main video record
        db.delete(video)
        db.commit()

        return {"message": "Video deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
