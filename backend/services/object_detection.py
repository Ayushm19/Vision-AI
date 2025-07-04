from ultralytics import YOLO
import cv2
import tempfile

# Load model once
model = YOLO("yolov8n.pt")  # use yolov8s.pt or yolov8m.pt for better accuracy

def run_object_detection(video_path: str):
    results = []

    cap = cv2.VideoCapture(video_path)
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % 30 == 0:  # Every ~1 second for 30fps video
            # Write frame to a temporary image file
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_img:
                cv2.imwrite(temp_img.name, frame)
                detect_result = model(temp_img.name)[0]
                labels = [model.names[int(cls)] for cls in detect_result.boxes.cls]
                results.append({
                    "frame": frame_count,
                    "objects": labels
                })
        frame_count += 1

    cap.release()
    return results
