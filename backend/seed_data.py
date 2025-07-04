from database import SessionLocal
from models import Stream

streams = [
    {
        "id": "stream-001",
        "name": "Main Entrance",
        "status": "active",
        "thumbnail": "/placeholder.svg",
        "detection_count": 0,
        "uptime": "99.2%",
    },
    {
        "id": "stream-002",
        "name": "Home",  # changed here
        "status": "active",
        "thumbnail": "/placeholder.svg",
        "detection_count": 0,
        "uptime": "98.7%",
    },
]

db = SessionLocal()
for s in streams:
    existing = db.query(Stream).filter(Stream.id == s["id"]).first()
    if existing:
        # Update the fields
        for key, value in s.items():
            setattr(existing, key, value)
    else:
        db.add(Stream(**s))

db.commit()
db.close()
print("✅ Seeded (with update) streams successfully")
