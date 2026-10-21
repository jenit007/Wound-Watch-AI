"""Transparent, conservative, rule-based clinical risk assessment and triage.

This module evaluates explicit clinical symptoms, systemic warning signs,
and wound characteristics to provide transparent preliminary triage guidance.
Not a clinical diagnosis or medical dispatch system.
"""
from __future__ import annotations

from typing import Any, Mapping

VALID_RISK_LEVELS = {"LOW", "MODERATE", "HIGH", "URGENT", "UNAVAILABLE"}

DEFAULT_DISCLAIMER = (
    "This preliminary risk triage is an automated software heuristic for research and educational "
    "screening, not a medical diagnosis. Anyone experiencing severe or worsening symptoms should seek "
    "prompt evaluation from a qualified healthcare professional."
)

def evaluate_risk(clinical_data: Mapping[str, Any] | None, trajectory: str | None = None) -> dict[str, Any]:
    """Evaluate preliminary wound risk category based on reported symptoms and clinical features.

    Rules hierarchy:
    1. Emergency systemic signs -> URGENT
    2. Infection warning signs -> HIGH
    3. Chronic risk factors / worsening -> MODERATE
    4. Clean, acute, non-complicated -> LOW
    5. Missing / incomplete answers -> UNAVAILABLE
    """
    if not clinical_data:
        return {
            "risk_level": "UNAVAILABLE",
            "risk_basis": "No clinical symptom or triage information provided",
            "reasons": ["Clinical triage questionnaire was not completed."],
            "recommended_action": "Complete the symptom triage questionnaire or consult a healthcare professional.",
            "disclaimer": DEFAULT_DISCLAIMER,
        }

    # Extract symptoms from direct fields or features dictionary
    features = clinical_data.get("features", {}) if isinstance(clinical_data, dict) else {}
    if not isinstance(features, dict):
        features = {}

    def get_val(key: str, default: Any = None) -> Any:
        if key in clinical_data and clinical_data[key] is not None:
            return clinical_data[key]
        return features.get(key, default)

    symptoms_raw = get_val("symptoms", [])
    if isinstance(symptoms_raw, str):
        symptoms = [s.strip().lower() for s in symptoms_raw.split(",") if s.strip()]
    elif isinstance(symptoms_raw, list):
        symptoms = [str(s).strip().lower() for s in symptoms_raw if str(s).strip()]
    else:
        symptoms = []

    systemic_raw = get_val("systemic_symptoms", [])
    if isinstance(systemic_raw, str):
        systemic = [s.strip().lower() for s in systemic_raw.split(",") if s.strip()]
    elif isinstance(systemic_raw, list):
        systemic = [str(s).strip().lower() for s in systemic_raw if str(s).strip()]
    else:
        systemic = []

    duration = str(get_val("wound_duration", "")).lower()
    diabetes = str(get_val("diabetes_status", "")).lower()
    redness_extent = str(get_val("redness_extent", "")).lower()
    pain_level = str(get_val("pain_level", "")).lower()
    discharge_type = str(get_val("discharge_type", "")).lower()
    fever_present = bool(get_val("fever_present", False)) or "fever" in symptoms or "chills" in symptoms

    # 1. EMERGENCY SIGNS (Override all other answers) -> URGENT
    emergency_reasons = []
    urgent_keywords = {
        "confusion": "Confusion or altered mental status reported",
        "fainting": "Fainting, syncope, or dizziness reported",
        "severe_illness": "Severe, rapidly progressing systemic illness reported",
        "rapid_deterioration": "Rapid deterioration over hours reported",
        "sepsis_signs": "Signs of potential systemic sepsis reported",
        "difficulty_breathing": "Difficulty breathing or acute distress reported",
    }
    for item in systemic + symptoms:
        for k, text in urgent_keywords.items():
            if k in item and text not in emergency_reasons:
                emergency_reasons.append(text)

    if emergency_reasons:
        return {
            "risk_level": "URGENT",
            "risk_basis": "Emergency systemic warning signs detected",
            "reasons": emergency_reasons,
            "recommended_action": (
                "Seek immediate emergency medical evaluation. Go to the nearest emergency room or "
                "contact emergency medical services (such as 911 / 112 / 108). Systemic symptoms can "
                "indicate life-threatening infection or sepsis requiring urgent clinical intervention."
            ),
            "disclaimer": DEFAULT_DISCLAIMER,
        }

    # 2. INFECTION SIGNS -> HIGH
    high_reasons = []
    if fever_present:
        high_reasons.append("Fever or shaking chills reported")
    if "pus" in discharge_type or "purulent" in discharge_type or "pus_discharge" in symptoms or "foul_odor" in symptoms:
        high_reasons.append("Purulent (pus) or foul-smelling drainage reported")
    if "spreading" in redness_extent or "spreading_redness" in symptoms or "red_streaks" in symptoms:
        high_reasons.append("Spreading redness (>2 cm from wound margin) or red streaking reported")
    if "severe" in pain_level or "increasing_pain" in symptoms or "extreme_pain" in symptoms:
        high_reasons.append("Severe or rapidly increasing localized pain and warmth reported")

    if high_reasons:
        return {
            "risk_level": "HIGH",
            "risk_basis": "Signs consistent with acute localized or spreading wound infection",
            "reasons": high_reasons,
            "recommended_action": (
                "Prompt in-person clinical evaluation is recommended within 24 hours. A healthcare provider "
                "should inspect the wound for cellulitis, abscess, or tissue necrosis, and determine whether "
                "oral or intravenous antibiotics, debridement, or wound cultures are required."
            ),
            "disclaimer": DEFAULT_DISCLAIMER,
        }

    # 3. MODERATE RISK (Chronicity, comorbidity, non-healing trajectory) -> MODERATE
    moderate_reasons = []
    is_chronic = any(w in duration for w in ["3–4", "5–6", "7+", "chronic", "month"])
    is_diabetic = "yes" in diabetes or "diabetic" in diabetes
    is_worsening = trajectory == "worsening" or "worsening" in symptoms

    if is_diabetic:
        moderate_reasons.append("Patient has diabetes, increasing the risk of neuropathy, ischemia, and delayed healing")
    if is_chronic:
        moderate_reasons.append("Prolonged wound chronicity (>3–4 weeks without complete closure)")
    if is_worsening:
        moderate_reasons.append("Wound area is expanding or condition is reported as worsening")
    if "mild_redness" in symptoms or "moderate_drainage" in symptoms:
        moderate_reasons.append("Localized mild redness or serous exudate noted")

    if moderate_reasons:
        return {
            "risk_level": "MODERATE",
            "risk_basis": "Presence of chronicity factors or co-morbidities that elevate complication risk",
            "reasons": moderate_reasons,
            "recommended_action": (
                "Non-urgent medical evaluation by a primary care provider or certified wound specialist is "
                "recommended. Ensure appropriate offloading, blood glucose control, and moisture-balanced dressings."
            ),
            "disclaimer": DEFAULT_DISCLAIMER,
        }

    # 4. CHECK FOR COMPLETENESS BEFORE ASSIGNING LOW
    has_triage_answers = get_val("has_symptom_triage") is True or bool(symptoms or systemic or duration or diabetes)
    if not has_triage_answers:
        return {
            "risk_level": "UNAVAILABLE",
            "risk_basis": "Essential symptom information was not reported",
            "reasons": ["Symptom questions were left unanswered; risk cannot be safely assumed to be low."],
            "recommended_action": "Complete the symptom triage questionnaire to receive a preliminary risk assessment.",
            "disclaimer": DEFAULT_DISCLAIMER,
        }

    # 5. LOW RISK (Explicitly clean acute wound) -> LOW
    return {
        "risk_level": "LOW",
        "risk_basis": "No acute infection flags, emergency signs, or high-risk chronicity reported",
        "reasons": [
            "No spreading redness, red streaks, or severe localized swelling reported",
            "No fever, chills, or purulent pus drainage reported",
            "No systemic illness or emergency red flags reported",
            "Wound appears acute or progressing without documented high-risk complications",
        ],
        "recommended_action": (
            "Continue standard protective wound hygiene, clean moisture-balanced dressings, and avoid trauma. "
            "Seek medical review promptly if new pain, expanding redness, heat, or discharge develops."
        ),
        "disclaimer": DEFAULT_DISCLAIMER,
    }
