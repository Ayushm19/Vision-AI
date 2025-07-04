from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import streams, alerts, detections, videos
from services.inference_simulator import simulate_detection
import threading
import os
from dotenv import load_dotenv
from routers import ai_inference

# ✅ Load environment variables from .env file
load_dotenv()

app = FastAPI(title="VMS Backend")

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(streams.router)
app.include_router(alerts.router)
app.include_router(detections.router)
app.include_router(videos.router)
app.include_router(ai_inference.router)

@app.get("/")
def root():
    return {"message": "Video Management Backend is running"}

# ✅ Start simulation in background thread
@app.on_event("startup")
def start_simulation():
    thread = threading.Thread(target=simulate_detection, daemon=True)
    thread.start()
