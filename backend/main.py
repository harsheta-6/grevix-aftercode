from vision import analyze_frames
from rules import diagnose, COSTS, rank_segments, calculate_segment_cost, calculate_benefit_score
import os, shutil, uuid
import cv2
from timestamps import assess_timestamp, usable_for_timing
from fastapi import FastAPI, File, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any

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

# In-memory session store of processed segments
PROCESSED_SEGMENTS: List[Dict[str, Any]] = []

def extract_frames(video_path, out_prefix, every_sec=3):
    frames = []
    
    # Primary method: OpenCV VideoCapture
    try:
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            if fps <= 0 or fps > 120:
                fps = 30.0
            step = max(1, int(fps * every_sec))
            i = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if i % step == 0:
                    h, w = frame.shape[:2]
                    if w > 1024:
                        frame = cv2.resize(frame, (1024, int(h * 1024 / w)))
                    path = f"{FRAME_DIR}/{out_prefix}_{i}.jpg"
                    if cv2.imwrite(path, frame):
                        frames.append(path)
                i += 1
            cap.release()
    except Exception as e:
        print(f"OpenCV frame extraction exception: {e}")

    # Fallback method if OpenCV yielded 0 frames (e.g. unsupported codec or container on Windows)
    if not frames:
        try:
            import subprocess
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            out_pattern = f"{FRAME_DIR}/{out_prefix}_%03d.jpg"
            # Extract 1 frame every 3 seconds, scale width to 1024 keeping aspect ratio
            cmd = [
                ffmpeg_exe, "-y", "-i", video_path,
                "-vf", f"fps=1/{every_sec},scale=1024:-1",
                "-frames:v", "10",
                out_pattern
            ]
            subprocess.run(cmd, capture_output=True, timeout=30)
            import glob
            frames = sorted(glob.glob(f"{FRAME_DIR}/{out_prefix}_*.jpg"))
        except Exception as e:
            print(f"FFmpeg fallback frame extraction exception: {e}")

    return frames


@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/segments")
def get_segments():
    return {"segments": PROCESSED_SEGMENTS}

@app.delete("/api/segments")
def clear_segments():
    global PROCESSED_SEGMENTS
    PROCESSED_SEGMENTS = []
    return {"status": "cleared"}

@app.delete("/api/segments/{segment_id}")
def delete_segment(segment_id: str):
    global PROCESSED_SEGMENTS
    PROCESSED_SEGMENTS = [s for s in PROCESSED_SEGMENTS if s.get("id") != segment_id]
    return {"status": "deleted", "id": segment_id}

@app.post("/api/rank")
def get_ranked_work_list(payload: Dict[str, Any] = Body(...)):
    segments = payload.get("segments", PROCESSED_SEGMENTS)
    budget = payload.get("budget", None)
    if budget is not None:
        try:
            budget = float(budget)
        except (ValueError, TypeError):
            budget = None
    return rank_segments(segments, budget=budget)

@app.post("/api/upload")
async def upload(video: UploadFile = File(...),
                 last_modified: int = Form(None),
                 recorded_date: str = Form(None),
                 batch: str = Form(None),
                 lat: float = Form(None),
                 lng: float = Form(None)):
    try:
        vid_id = uuid.uuid4().hex[:8]
        safe_filename = "".join(c for c in (video.filename or "video.mp4") if c.isalnum() or c in "._- ")
        path = f"{UPLOAD_DIR}/{vid_id}_{safe_filename}"
        
        # Save video stream to disk safely
        with open(path, "wb") as f:
            shutil.copyfileobj(video.file, f)

        # Check that file is not empty
        file_size = os.path.getsize(path) if os.path.exists(path) else 0
        if file_size == 0:
            return {
                "id": vid_id,
                "error": "The uploaded video file is empty (0 bytes). Please upload a valid video file."
            }

        try:   
            ts = assess_timestamp(path, safe_filename, last_modified,
                                  recorded_date or None, batch)
        except Exception as ts_err:
            print(f"Timestamp evaluation failed: {ts_err}")
            ts = FALLBACK_TS

        frames = extract_frames(path, vid_id)
        if not frames:
            return {
                "id": vid_id,
                "error": f"No video frames could be decoded from '{video.filename}'. Ensure the video is in standard MP4, MOV, AVI, or WebM format and is not corrupted."
            }
        
        assessment = analyze_frames(frames[:5])
        diagnosis = diagnose(assessment["observations"], assessment["overall_condition"])
        diagnosis["works_detail"] = [{"work": w, **COSTS[w]} for w in diagnosis["works"]]

        cost = calculate_segment_cost(diagnosis)
        benefit_score = calculate_benefit_score(assessment, diagnosis)
        bcr = round((benefit_score / (cost / 1000.0)), 4) if cost > 0 else (benefit_score if benefit_score > 0 else 0.0)

        # Default road survey corridor location if not provided
        # Base: 12.9716° N, 77.5946° E (or user provided location)
        seg_idx = len(PROCESSED_SEGMENTS)
        coord_lat = lat if lat is not None else round(12.9716 + (seg_idx * 0.005) + (hash(vid_id) % 20) * 0.0003, 6)
        coord_lng = lng if lng is not None else round(77.5946 + (seg_idx * 0.007) + (hash(vid_id) % 15) * 0.0004, 6)

        result = {
            "id": vid_id,
            "filename": video.filename,
            "frame_count": len(frames),
            "assessment": assessment,
            "diagnosis": diagnosis,
            "timestamp": ts,
            "time_usable": usable_for_timing(ts),
            "needs_recheck": ts["status"] == "unverified" and assessment["overall_condition"] >= 4,
            "cost": cost,
            "benefit_score": benefit_score,
            "bcr": bcr,
            "coordinates": {
                "lat": coord_lat,
                "lng": coord_lng,
            }
        }

        # Save to in-memory list
        PROCESSED_SEGMENTS.append(result)

        return result
    except Exception as e:
        print(f"Upload error: {e}")
        return {
            "id": None,
            "error": f"Failed to process video '{video.filename}': {str(e)}"
        }