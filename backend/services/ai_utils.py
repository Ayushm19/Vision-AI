import torch
import numpy as np
from uuid import uuid4
from PIL import Image
import decord
from decord import VideoReader, cpu
from transformers import (
    AutoImageProcessor,
    VideoMAEForVideoClassification,
    BlipProcessor,
    BlipForConditionalGeneration
)

# === Load models once globally ===
# For video classification
video_processor = AutoImageProcessor.from_pretrained("MCG-NJU/videomae-base-finetuned-kinetics")
video_model = VideoMAEForVideoClassification.from_pretrained("MCG-NJU/videomae-base-finetuned-kinetics")

# For summarization
caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

# Decord bridge
decord.bridge.set_bridge("torch")


def run_classification(video_url: str) -> list[str]:
    try:
        print("🚀 [run_classification] Using HuggingFace VideoMAE model")

        vr = VideoReader(video_url, ctx=cpu(0))
        indices = torch.linspace(0, len(vr) - 1, 16).long()
        frames = vr.get_batch(indices)  # decord.NDArray, shape: (16, H, W, 3)

        # Convert to torch.Tensor and permute
        video = torch.from_numpy(frames.asnumpy()).permute(0, 3, 1, 2)  # (T, C, H, W)

        # Run through processor and model
        inputs = video_processor(list(video), return_tensors="pt")
        with torch.no_grad():
            outputs = video_model(**inputs)
            predicted_label = outputs.logits.argmax(-1).item()

        label = video_model.config.id2label[predicted_label]
        print(f"✅ Predicted class: {label}")
        return [label]

    except Exception as e:
        print("❌ Classification error:", e)
        return []


def detect_alerts(video_url: str) -> list[dict]:
    # 🔍 Simulated alerts — replace with real detection later
    return [
        {"type": "fire", "confidence": 0.87},
        {"type": "violence", "confidence": 0.72}
    ]


def summarize_video(video_url: str) -> str:
    try:
        print("🚀 [summarize_video] Running frame-level captioning")

        vr = VideoReader(video_url, ctx=cpu(0))
        total_frames = len(vr)
        indices = np.linspace(0, total_frames - 1, num=5, dtype=int)

        frames = vr.get_batch(indices).asnumpy()
        captions = []

        for frame in frames:
            img = Image.fromarray(frame)
            inputs = caption_processor(images=img, return_tensors="pt")
            with torch.no_grad():
                out = caption_model.generate(**inputs)
                caption = caption_processor.decode(out[0], skip_special_tokens=True)
                captions.append(caption)

        summary = " ".join(captions)
        print("📝 Summary generated:", summary)
        return summary

    except Exception as e:
        print("❌ Summarization error:", e)
        return "Summary generation failed."
