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
    step = int(fps * every_sec)
    frames, i = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
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
    return {"id": vid_id, "filename": video.filename, "frame_count": len(frames)}