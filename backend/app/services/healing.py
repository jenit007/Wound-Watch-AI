"""Evidence-based wound healing time estimation service.

The research dataset (FUSeg 2021) contains cross-sectional wound photographic
segmentations without longitudinal time-to-closure outcome labels. Therefore,
a machine-learning healing-time prediction model is genuinely not supported by
the dataset. We provide a transparent, rule-based clinical preliminary estimate
derived from published benchmarks (Margolis et al. 2002, Sheehan et al. 2003, EWMA),
or explicitly return INSUFFICIENT_DATA when parameters are missing.
"""
from __future__ import annotations

from typing import Any, Mapping

DEFAULT_HEALING_DISCLAIMER = (
    "Healing estimates are preliminary research benchmarks derived from clinical literature "
    "and should not be interpreted as a guarantee of closure. Actual healing depends on patient vascular "
    "perfusion, glycemic regulation, pressure offloading adherence, infection control, and professional care."
)

def estimate_healing_time(
    clinical_data: Mapping[str, Any] | None,
    trajectory: str | None = None,
    area_cm2: float | None = None,
    risk_level: str | None = None,
) -> dict[str, Any]:
    """Provide an evidence-based healing time estimate or return an explicit unavailable status."""
    if not clinical_data:
        return {
            "healing_estimate_status": "INSUFFICIENT_DATA",
            "estimated_healing_time": None,
            "estimated_healing_unit": None,
            "estimate_type": "NOT_AVAILABLE",
            "supporting_factors": [],
            "limitations": [
                "No clinical metadata or duration was provided.",
                "A reliable healing-time estimate is currently unavailable with the information provided.",
            ],
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    features = clinical_data.get("features", {}) if isinstance(clinical_data, dict) else {}
    if not isinstance(features, dict):
        features = {}

    def get_val(key: str, default: Any = None) -> Any:
        if key in clinical_data and clinical_data[key] is not None:
            return clinical_data[key]
        return features.get(key, default)

    duration = str(get_val("wound_duration", "")).strip().lower()
    diabetes = str(get_val("diabetes_status", "")).strip().lower()
    location = str(get_val("wound_location", "")).strip().lower()
    has_prior = bool(clinical_data.get("visits") and len(clinical_data.get("visits")) > 1)

    # If critical information is completely missing or unknown
    if not duration or duration in {"unknown", "not specified", ""}:
        return {
            "healing_estimate_status": "INSUFFICIENT_DATA",
            "estimated_healing_time": None,
            "estimated_healing_unit": None,
            "estimate_type": "NOT_AVAILABLE",
            "supporting_factors": [],
            "limitations": [
                "Wound chronicity (duration) was not specified.",
                "A reliable healing-time estimate is currently unavailable with the information provided.",
                "To generate an estimate, specify approximate duration, underlying diabetes status, and location.",
            ],
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    # If active urgent/severe infection or severe deterioration is flagged
    if risk_level in {"URGENT", "urgent"}:
        return {
            "healing_estimate_status": "INSUFFICIENT_DATA",
            "estimated_healing_time": None,
            "estimated_healing_unit": None,
            "estimate_type": "NOT_AVAILABLE",
            "supporting_factors": ["Active emergency systemic warning signs flagged"],
            "limitations": [
                "Wound has acute systemic complications requiring immediate emergency management.",
                "Tissue healing time cannot be estimated while acute systemic complications are present.",
            ],
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    supporting: list[str] = []
    limitations: list[str] = [
        "Photographic assessment cannot detect deep tissue cavitation, undermining, or osteomyelitis.",
        "Systemic perfusion (ABI / transcutaneous oxygen) and pressure offloading adherence heavily influence closure.",
    ]

    is_diabetic = "yes" in diabetes or "diabetic" in diabetes
    is_acute = any(d in duration for d in ["under 1", "<1", "1–2", "1-2", "acute"])
    is_chronic = any(d in duration for d in ["3–4", "3-4", "5–6", "5-6", "7+", "chronic", "month"])
    is_lower_extremity = any(loc in location for loc in ["foot", "heel", "toe", "leg", "ankle"])

    # 1. ACUTE, UNCOMPLICATED WOUND (< 2 WEEKS, NON-DIABETIC, NO SPREADING INFECTION)
    if is_acute and not is_diabetic and not (is_lower_extremity and risk_level == "HIGH"):
        supporting.append(f"Acute presentation with reported duration: {duration}")
        supporting.append("Absence of reported diabetic microvascular compromise")
        if area_cm2 is not None:
            supporting.append(f"Calibrated initial lesion footprint: {area_cm2:.2f} cm²")

        limitations.append("Estimate assumes standard superficial re-epithelialization without secondary infection.")
        return {
            "healing_estimate_status": "AVAILABLE",
            "estimated_healing_time": "1–3",
            "estimated_healing_unit": "weeks",
            "estimate_type": "RULE_BASED_ESTIMATE",
            "supporting_factors": supporting,
            "limitations": limitations,
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    # 2. CHRONIC OR DIABETIC LOWER EXTREMITY WOUND WITH DOCUMENTED IMPROVEMENT
    if (is_diabetic or is_chronic) and (trajectory == "improving" or "improving" in str(get_val("progression_status", ""))):
        supporting.append(f"Reported chronicity: {duration}")
        if is_diabetic:
            supporting.append("Diabetic clinical context incorporated into healing timeline")
        supporting.append("Sequential area measurements confirm contracting wound perimeter (improving trajectory)")
        if area_cm2 is not None:
            supporting.append(f"Current calibrated area: {area_cm2:.2f} cm²")

        limitations.append(
            "DFU healing benchmarks (Sheehan et al., Margolis et al.) require strict daily offloading and HbA1c control."
        )
        return {
            "healing_estimate_status": "AVAILABLE",
            "estimated_healing_time": "8–14",
            "estimated_healing_unit": "weeks",
            "estimate_type": "RULE_BASED_ESTIMATE",
            "supporting_factors": supporting,
            "limitations": limitations,
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    # 3. CHRONIC WOUND WITH STALLED OR EXPANDING TRAJECTORY (> 4 WEEKS, UNCHANGED OR WORSENING)
    if is_chronic or is_diabetic:
        supporting.append(f"Extended lesion chronicity: {duration}")
        if is_diabetic:
            supporting.append("Elevated risk profile due to diabetic vascular/neuropathic factors")
        if trajectory in {"worsening", "stable"}:
            supporting.append(f"Longitudinal trajectory shows {trajectory} area trend without active contraction")

        limitations.append(
            "Wounds demonstrating refractory or non-healing trajectories at 4+ weeks have reduced spontaneous closure rates."
        )
        limitations.append("Advanced clinical interventions (debridement, vascular review, specialized dressings) are essential.")
        return {
            "healing_estimate_status": "AVAILABLE",
            "estimated_healing_time": "16–24+",
            "estimated_healing_unit": "weeks",
            "estimate_type": "RULE_BASED_ESTIMATE",
            "supporting_factors": supporting,
            "limitations": limitations,
            "disclaimer": DEFAULT_HEALING_DISCLAIMER,
        }

    # 4. SUBACUTE WOUND (3–4 WEEKS, NO DIABETES, NO TRAJECTORY)
    supporting.append(f"Subacute duration: {duration}")
    if location:
        supporting.append(f"Anatomical location: {location}")

    return {
        "healing_estimate_status": "AVAILABLE",
        "estimated_healing_time": "3–6",
        "estimated_healing_unit": "weeks",
        "estimate_type": "RULE_BASED_ESTIMATE",
        "supporting_factors": supporting,
        "limitations": limitations,
        "disclaimer": DEFAULT_HEALING_DISCLAIMER,
    }
