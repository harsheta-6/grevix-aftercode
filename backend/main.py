from vision import analyze_frames
from rules import diagnose, COSTS
import os, shutil, uuid
import cv2
from timestamps import assess_timestamp, usable_for_timing
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

FALLBACK_TS = {"status": "unverified", "effective": None, "claimed": None,
               "latest_possible": None, "conflict": False, "resolution": "unknown",
               "reason": "timestamp_check_failed", "notes": [], "sources": {}}

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
async def upload(video: UploadFile = File(...),
                 last_modified: int = Form(None),
                 recorded_date: str = Form(None),
                 batch: str = Form(None)):
    vid_id = uuid.uuid4().hex[:8]
    path = f"{UPLOAD_DIR}/{vid_id}_{video.filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    try:   
        ts = assess_timestamp(path, video.filename, last_modified,
                              recorded_date or None, batch)
    except Exception:
        ts = FALLBACK_TS

    frames = extract_frames(path, vid_id)
    if not frames:
        return {"id": vid_id, "error": "No frames could be read from this video"}
    assessment = analyze_frames(frames[:5])
    diagnosis = diagnose(assessment["observations"], assessment["overall_condition"])
    diagnosis["works_detail"] = [{"work": w, **COSTS[w]} for w in diagnosis["works"]]

    return {"id": vid_id, "filename": video.filename, "frame_count": len(frames),
            "assessment": assessment, "diagnosis": diagnosis,
            "timestamp": ts, "time_usable": usable_for_timing(ts),
            "needs_recheck": ts["status"] == "unverified"
                             and assessment["overall_condition"] >= 4}