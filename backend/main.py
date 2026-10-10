from vision import analyze_frames
import os, shutil, uuid
import cv2
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = "uploads"
FRAME_DIR = "frames"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAME_DIR, exist_ok=True)

def extract_frames(video_path, out_prefix, every_sec=3):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, int(fps * every_sec))
    frames, i = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            h, w = frame.shape[:2]
            if w > 1024:
                frame = cv2.resize(frame, (1024, int(h * 1024 / w)))
            path = f"{FRAME_DIR}/{out_prefix}_{i}.jpg"
            cv2.imwrite(path, frame)
            frames.append(path)
        i += 1
    cap.release()
    return frames


@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload(video: UploadFile = File(...)):
    vid_id = uuid.uuid4().hex[:8]
    path = f"{UPLOAD_DIR}/{vid_id}_{video.filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    frames = extract_frames(path, vid_id)
    if not frames:
        return {"id": vid_id, "error": "No frames could be read from this video"}
    sample = frames[:5]
    assessment = analyze_frames(sample)
    return {"id": vid_id, "filename": video.filename,
            "frame_count": len(frames), "assessment": assessment}