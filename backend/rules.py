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


def calculate_segment_cost(diagnosis):
    """Calculate total estimated cost for a segment based on recommended works."""
    works = diagnosis.get("works", [])
    total = sum(COSTS.get(w, {}).get("rate", 0) for w in works if w != "none")
    return total


def calculate_benefit_score(assessment, diagnosis):
    """
    Benefit score based on:
    - Overall condition severity (1 to 5, higher means more critical damage)
    - Root cause urgency:
        * Drainage (R1): multiplier 1.4 (preventing compound damage to road bed)
        * Edge failure (R2): multiplier 1.25 (preventing road edge erosion & water infiltration)
        * Overloading (R3): multiplier 1.15
        * Surface wear (R4): multiplier 1.0
        * None (R0): multiplier 0.0
    - AI Confidence weighting
    """
    condition = assessment.get("overall_condition", 1)
    cause = diagnosis.get("cause", "none_detected")
    
    urgency_multipliers = {
        "drainage": 1.4,
        "edge_failure": 1.25,
        "overloading": 1.15,
        "surface_wear": 1.0,
        "none_detected": 0.0,
    }
    multiplier = urgency_multipliers.get(cause, 1.0)
    
    # Severity points (condition 1 = 0, condition 2 = 20, condition 3 = 45, condition 4 = 75, condition 5 = 100)
    severity_map = {1: 0, 2: 25, 3: 50, 4: 80, 5: 100}
    base_severity = severity_map.get(condition, condition * 20)
    
    confidence = assessment.get("confidence", 0.8)
    
    benefit = base_severity * multiplier * (0.5 + 0.5 * confidence)
    return round(benefit, 2)


def rank_segments(segments, budget=None):
    """
    Ranks segments using Benefit-Cost Ratio (BCR = Benefit / Cost).
    If budget is provided, allocates budget greedily by BCR until exhausted.
    
    Each segment in segments should have:
    - id
    - filename / name
    - assessment
    - diagnosis
    - timestamp (optional)
    """
    ranked = []
    
    for seg in segments:
        assessment = seg.get("assessment", {})
        diagnosis = seg.get("diagnosis", {})
        cost = calculate_segment_cost(diagnosis)
        benefit = calculate_benefit_score(assessment, diagnosis)
        
        # Benefit-to-cost ratio (per thousand Rs to have clean human-readable ratio)
        bcr = round((benefit / (cost / 1000.0)), 4) if cost > 0 else (benefit if benefit > 0 else 0.0)
        
        ranked.append({
            **seg,
            "cost": cost,
            "benefit_score": benefit,
            "bcr": bcr,
        })
    
    # Sort primarily by BCR descending, secondarily by benefit_score descending, then condition descending
    ranked.sort(
        key=lambda s: (
            s["bcr"],
            s["benefit_score"],
            s.get("assessment", {}).get("overall_condition", 0)
        ),
        reverse=True
    )
    
    # Assign rank order and budget allocation if budget is given
    current_spent = 0
    for idx, item in enumerate(ranked):
        item["rank"] = idx + 1
        item_cost = item["cost"]
        
        if budget is not None:
            if item_cost == 0:
                item["funded"] = False
                item["status"] = "no_action_needed"
            elif current_spent + item_cost <= budget:
                item["funded"] = True
                item["status"] = "approved"
                current_spent += item_cost
            else:
                item["funded"] = False
                item["status"] = "budget_exceeded"
        else:
            item["funded"] = True
            item["status"] = "approved" if item_cost > 0 else "no_action_needed"
            current_spent += item_cost

    summary = {
        "total_segments": len(ranked),
        "approved_segments": sum(1 for s in ranked if s.get("funded")),
        "total_estimated_cost": sum(s["cost"] for s in ranked),
        "allocated_spend": current_spent,
        "remaining_budget": (budget - current_spent) if budget is not None else 0,
        "total_budget": budget
    }
    
    return {"ranked_list": ranked, "summary": summary}