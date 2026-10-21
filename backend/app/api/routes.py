from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from app.preprocessing.images import load_rgb_image
from app.schemas.analysis import AnalysisResponse, ClinicalData
from app.services.trajectory import analyze_trajectory
from app.services.measurement import area_px_to_cm2
from app.services.risk import evaluate_risk
from app.services.healing import estimate_healing_time
from app.services.storage import (
    add_measurement,
    compute_pixel_reduction_trajectory,
    get_or_create_wound,
    get_wound_measurements,
    list_wounds,
)

router = APIRouter()
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

@router.get("/health")
@router.get("/api/health")
def health():
    return {"status": "ok"}

@router.get("/api/diagnostic")
def diagnostic():
    service = getattr(router, "segmentation_service", None)
    return {
        "status": "ok",
        "model_ready": service.ready if service else False,
        "load_error": service.load_error if service else None,
        "checkpoint_path": str(service.checkpoint_path) if service else None,
        "checkpoint_exists": service.checkpoint_path.is_file() if service and hasattr(service, "checkpoint_path") else False,
    }

@router.get("/api/wounds")
def get_wounds():
    """List all tracked wounds with their latest recorded measurements."""
    return {"wounds": list_wounds()}

@router.get("/api/wounds/{wound_id}/history")
def get_history(wound_id: str):
    """Retrieve chronological measurement history for a specific wound record."""
    measurements = get_wound_measurements(wound_id)
    return {"wound_id": wound_id, "measurements": measurements}

@router.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(image: UploadFile = File(...), clinical_data: str = Form("{}")):
    request_id = str(uuid.uuid4())
    content_type = (image.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are supported")
    data = await image.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB upload limit")
    try:
        image_obj = load_rgb_image(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        parsed = json.loads(clinical_data)
        clinical = ClinicalData.model_validate(parsed)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="clinical_data must be valid JSON matching the documented schema") from exc

    effective_wound_id = clinical.wound_id or clinical.patient_id or f"WOUND-{uuid.uuid4().hex[:6].upper()}"
    effective_label = clinical.wound_label or f"Wound Record {effective_wound_id}"
    get_or_create_wound(
        effective_wound_id,
        label=effective_label,
        wound_duration=clinical.wound_duration,
        progression_status=clinical.progression_status,
    )
    prior_measurements = get_wound_measurements(effective_wound_id)

    service = router.segmentation_service
    warnings = []
    if not service.ready:
        risk_result = evaluate_risk(clinical.model_dump(), trajectory="unavailable")
        healing_result = estimate_healing_time(clinical.model_dump(), trajectory="unavailable", area_cm2=None, risk_level=risk_result["risk_level"])
        return AnalysisResponse(
            request_id=request_id,
            model_status="unavailable",
            wound_id=effective_wound_id,
            trajectory="unavailable",
            risk_level=risk_result["risk_level"],
            risk_basis=risk_result["risk_basis"],
            risk_reasons=risk_result["reasons"],
            recommended_action=risk_result["recommended_action"],
            risk_disclaimer=risk_result["disclaimer"],
            healing_estimate_status=healing_result["healing_estimate_status"],
            estimated_healing_time=healing_result["estimated_healing_time"],
            estimated_healing_unit=healing_result["estimated_healing_unit"],
            estimate_type=healing_result["estimate_type"],
            supporting_factors=healing_result["supporting_factors"],
            healing_limitations=healing_result["limitations"],
            healing_disclaimer=healing_result["disclaimer"],
            explanation=["No trained segmentation model is available; no mask or area was generated."],
            warnings=["Train a model and configure WOUNDWATCH_CHECKPOINT before requesting inference."],
        )
    try:
        result = service.predict(image_obj)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    area_cm2 = area_px_to_cm2(result["wound_area_px"], clinical.pixels_per_cm)
    current_recorded_at = clinical.visit_date or datetime.now(timezone.utc).isoformat()

    # If client passed synthetic/legacy visits in clinical.visits but no SQLite measurements yet, support both
    legacy_visits = [v.model_dump() for v in clinical.visits]
    legacy_traj = analyze_trajectory(legacy_visits, current_area_cm2=area_cm2) if legacy_visits else None

    # Calculate real pixel reduction trajectory
    pix_traj = compute_pixel_reduction_trajectory(
        prior_measurements,
        current_area_px=result["wound_area_px"],
        current_recorded_at=current_recorded_at,
    )

    if area_cm2 is None:
        warnings.append("Physical area in cm² is unavailable because valid image calibration was not provided.")
    warnings.append("This research prototype is not a diagnostic or treatment system.")

    effective_trajectory = pix_traj["trajectory"]
    if pix_traj["is_baseline"] and legacy_traj:
        effective_trajectory = legacy_traj["trajectory"]

    risk_result = evaluate_risk(clinical.model_dump(), trajectory=effective_trajectory)

    # Record new measurement in SQLite database
    add_measurement(
        wound_id=effective_wound_id,
        wound_area_px=result["wound_area_px"],
        wound_area_cm2=area_cm2,
        recorded_at=current_recorded_at,
        risk_level=risk_result["risk_level"],
    )
    updated_history = get_wound_measurements(effective_wound_id)

    # Determine healing outcome representation
    if not pix_traj["is_baseline"] and pix_traj["estimate_type"] == "EXPERIMENTAL_PIXEL_PROJECTION":
        healing_estimate_status = "AVAILABLE"
        estimated_healing_time = pix_traj["estimated_healing_time"]
        estimated_healing_unit = pix_traj["estimated_healing_unit"]
        estimate_type = "EXPERIMENTAL_PIXEL_PROJECTION"
        supporting_factors = pix_traj["explanation"]
        healing_limitations = pix_traj["limitations"]
        healing_disclaimer = (
            "Healing estimates are linear mathematical projections of observed pixel boundary contraction. "
            "They are experimental software benchmarks and must not be used as clinical forecasts or treatment guidance."
        )
    elif not pix_traj["is_baseline"] and pix_traj["estimate_type"] == "OBSERVED_PIXEL_TREND":
        healing_estimate_status = "INSUFFICIENT_DATA"
        estimated_healing_time = None
        estimated_healing_unit = None
        estimate_type = "OBSERVED_PIXEL_TREND"
        supporting_factors = pix_traj["explanation"]
        healing_limitations = pix_traj["limitations"]
        healing_disclaimer = (
            "Wound area contraction was not observed over the monitored period. "
            "Consult a medical professional for specialized wound bed preparation and offloading."
        )
    else:
        # Baseline single photographic timepoint
        lit_healing = estimate_healing_time(
            clinical.model_dump(),
            trajectory=effective_trajectory,
            area_cm2=area_cm2,
            risk_level=risk_result["risk_level"],
        )
        healing_estimate_status = lit_healing["healing_estimate_status"]
        estimated_healing_time = lit_healing["estimated_healing_time"]
        estimated_healing_unit = lit_healing["estimated_healing_unit"]
        estimate_type = lit_healing["estimate_type"]
        supporting_factors = [
            "Baseline photographic measurement established for this wound.",
        ] + lit_healing["supporting_factors"]
        healing_limitations = [
            "Single image baseline: a reduction rate cannot be calculated from a single photographic timepoint.",
            "Upload a follow-up image in 3–7 days to calculate your observed pixel reduction rate and healing trajectory.",
        ] + lit_healing["limitations"]
        healing_disclaimer = lit_healing["disclaimer"]

    explanation_items = pix_traj["explanation"]
    if legacy_traj:
        explanation_items = legacy_traj["explanation"] + explanation_items
    explanation_items.append("Mask represents the trained model's segmentation output; inspect it visually.")

    return AnalysisResponse(
        request_id=request_id,
        model_status="ready",
        wound_id=effective_wound_id,
        wound_area_px=result["wound_area_px"],
        wound_area_cm2=area_cm2,
        area_change_percent=pix_traj["percentage_area_change"] if not pix_traj["is_baseline"] else (legacy_traj["area_change_percent"] if legacy_traj else None),
        trajectory=effective_trajectory,
        risk_level=risk_result["risk_level"],
        risk_score=None,
        risk_basis=risk_result["risk_basis"],
        risk_reasons=risk_result["reasons"],
        recommended_action=risk_result["recommended_action"],
        risk_disclaimer=risk_result["disclaimer"],
        healing_estimate_status=healing_estimate_status,
        estimated_healing_time=estimated_healing_time,
        estimated_healing_unit=estimated_healing_unit,
        estimate_type=estimate_type,
        supporting_factors=supporting_factors,
        healing_limitations=healing_limitations,
        healing_disclaimer=healing_disclaimer,
        is_baseline=pix_traj["is_baseline"],
        initial_area_px=pix_traj["initial_area_px"],
        elapsed_days=pix_traj["elapsed_days"],
        pixel_reduction_rate_px_per_day=pix_traj["pixel_reduction_rate_px_per_day"],
        estimated_remaining_days=pix_traj["estimated_remaining_days"],
        estimated_remaining_weeks=pix_traj["estimated_remaining_weeks"],
        measurements_history=updated_history,
        segmentation_mask_png_base64=result["segmentation_mask_png_base64"],
        explanation=explanation_items,
        warnings=warnings,
    )
