import time
import threading
import uuid
from datetime import datetime
from random import choice, uniform

from models import Detection, Alert
from database import SessionLocal

TYPES = ["Person", "Vehicle", "Animal"]
LEVELS = ["low", "medium", "high"]

def simulate_detection():
    while True:
        db = SessionLocal()

        try:
            stream_id = choice(["stream-001", "stream-002"])
            detection_type = choice(TYPES)
            confidence = round(uniform(0.7, 0.98), 2)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            bbox = {
                "x": int(uniform(50, 300)),
                "y": int(uniform(50, 300)),
                "width": int(uniform(50, 200)),
                "height": int(uniform(50, 200)),
            }

            # 🟡 Save detection
            detection = Detection(
                id=str(uuid.uuid4()),
                stream_id=stream_id,
                type=detection_type,
                confidence=confidence,
                timestamp=timestamp,
                bbox=bbox
            )
            db.add(detection)

            # 🟢 Save alert
            alert = Alert(
                id=str(uuid.uuid4()),
                stream_id=stream_id,
                message=f"{detection_type} detected with {int(confidence * 100)}% confidence",
                level=choice(LEVELS),
                timestamp="just now"
            )
            db.add(alert)

            db.commit()

        except Exception as e:
            print("❌ Error in simulate_detection:", e)
            db.rollback()
        finally:
            db.close()

        time.sleep(10)
