LEVEL = {"none": 0, "minor": 1, "moderate": 2, "severe": 3, "cannot_tell": 0}


COSTS = {
    "clear_drain":      {"unit": "per 10 m", "rate": 2000},
    "edge_repair":      {"unit": "per 10 m", "rate": 8000},
    "pothole_patching": {"unit": "per 10 m", "rate": 6000},
    "resurfacing":      {"unit": "per 10 m", "rate": 25000},
    "none":             {"unit": "",         "rate": 0},
}

def diagnose(obs, overall_condition):
    L = lambda k: LEVEL.get(obs[k], 0)
    water = L("standing_water") >= 1 or obs["side_drain_condition"] in ("blocked", "partly_blocked")
    damage = max(L("potholes"), L("cracking"), L("raveling_surface_wear"))

   
    if water and damage >= 1:
        return {"cause": "drainage", "rule": "R1",
                "works": ["clear_drain", "pothole_patching" if L("potholes") else "resurfacing"],
                "why": "Water is not draining; resurfacing first would fail again."}
    if L("edge_breakup") >= 2:
        return {"cause": "edge_failure", "rule": "R2",
                "works": ["edge_repair", "pothole_patching"],
                "why": "Broken edge lets water in and weakens the carriageway."}
    if obs["heavy_vehicle_signs"] == "many" and damage >= 2:
        return {"cause": "overloading", "rule": "R3",
                "works": ["resurfacing"],
                "why": "Heavy traffic damage; surface may need strengthening, so confirm with an engineer."}
    if damage >= 1:
        return {"cause": "surface_wear", "rule": "R4",
                "works": ["pothole_patching" if L("potholes") else "resurfacing"],
                "why": "Wear without a visible water or edge cause."}
    return {"cause": "none_detected", "rule": "R0", "works": ["none"], "why": "No action needed."}