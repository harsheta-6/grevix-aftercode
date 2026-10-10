import os, json
from typing import Literal, List
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

Level = Literal["none", "minor", "moderate", "severe", "cannot_tell"]

class Observations(BaseModel):
    potholes: Level
    cracking: Level                  
    raveling_surface_wear: Level
    edge_breakup: Level          
    standing_water: Level            
    side_drain_condition: Literal["clear", "partly_blocked", "blocked", "absent", "cannot_tell"]
    vegetation_or_silt_at_edge: Level
    heavy_vehicle_signs: Literal["none", "some", "many", "cannot_tell"]  
    road_type: Literal["paved_bitumen", "concrete", "gravel_or_earth", "unclear"]

class SegmentAssessment(BaseModel):
    observations: Observations
    overall_condition: int = Field(ge=1, le=5, description="1 = good, 5 = failed")
    visible_evidence: List[str] = Field(description="Short phrases describing what you actually see")
    confidence: float = Field(ge=0, le=1)
    image_quality_issues: List[str]

PROMPT = """You are assisting a road maintenance engineer. You are given several frames
from one stretch of road, taken from a phone or dashcam.

Report ONLY what is visible. Do not guess hidden causes. If something cannot be
judged from the frames (blur, glare, night, obstruction), use "cannot_tell".

Condition scale (overall_condition):
1 = good, no meaningful distress
2 = minor wear or hairline cracks
3 = moderate: scattered potholes, cracking, or edge damage
4 = poor: extensive potholes or alligator cracking, driveability affected
5 = failed: road barely passable or base exposed

Lower your confidence when frames are blurry, dark, or show little road.
List any such problems in image_quality_issues."""

def analyze_frames(frame_paths):
    parts = []
    for p in frame_paths:
        with open(p, "rb") as f:
            parts.append(types.Part.from_bytes(data=f.read(), mime_type="image/jpeg"))
    parts.append(PROMPT)

    resp = client.models.generate_content(
        model=MODEL,
        contents=parts,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SegmentAssessment,
            temperature=0.2,
        ),
    )
    return json.loads(resp.text)