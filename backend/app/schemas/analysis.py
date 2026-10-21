from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

class VisitMeasurement(BaseModel):
    visit_date: str
    area_cm2: float | None = None
    area_px: float | None = None

class ClinicalData(BaseModel):
    patient_id: str | None = None
    wound_id: str | None = None
    wound_label: str | None = None
    visit_date: str | None = None
    visits: list[VisitMeasurement] = Field(default_factory=list)
    # Optional calibration; only use when supplied by a reliable reference scale.
    pixels_per_cm: float | None = Field(default=None, gt=0)
    # Optional symptom and healing factor fields for clinical triage
    symptoms: list[str] = Field(default_factory=list)
    systemic_symptoms: list[str] = Field(default_factory=list)
    wound_duration: str | None = None
    wound_location: str | None = None
    diabetes_status: str | None = None
    redness_extent: str | None = None
    pain_level: str | None = None
    discharge_type: str | None = None
    fever_present: bool | None = None
    has_symptom_triage: bool | None = None
    has_professional_assessment: bool | None = None
    progression_status: str | None = None
    # Arbitrary supported dataset features; identifiers must not be used for training.
    features: dict[str, Any] = Field(default_factory=dict)

class AnalysisResponse(BaseModel):
    request_id: str
    model_status: Literal["ready", "unavailable"]
    wound_id: str | None = None
    wound_area_px: float | None = None
    wound_area_cm2: float | None = None
    area_change_percent: float | None = None
    trajectory: Literal["improving", "stable", "worsening", "insufficient_data", "unavailable"]
    risk_level: str = "UNAVAILABLE"
    risk_score: float | None = None
    segmentation_mask_png_base64: str | None = None
    explanation: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    # Risk assessment extensions
    risk_basis: str | None = None
    risk_reasons: list[str] = Field(default_factory=list)
    recommended_action: str | None = None
    risk_disclaimer: str | None = None

    # Healing time extensions
    healing_estimate_status: Literal["AVAILABLE", "INSUFFICIENT_DATA", "MODEL_UNAVAILABLE"] = "INSUFFICIENT_DATA"
    estimated_healing_time: str | None = None
    estimated_healing_unit: str | None = None
    estimate_type: Literal[
        "ML_PREDICTION",
        "RULE_BASED_ESTIMATE",
        "EXPERIMENTAL_PIXEL_PROJECTION",
        "OBSERVED_PIXEL_TREND",
        "NOT_AVAILABLE",
    ] = "NOT_AVAILABLE"
    supporting_factors: list[str] = Field(default_factory=list)
    healing_limitations: list[str] = Field(default_factory=list)
    healing_disclaimer: str | None = None

    # Persistent progress tracking extensions
    is_baseline: bool | None = None
    initial_area_px: float | None = None
    elapsed_days: float | None = None
    pixel_reduction_rate_px_per_day: float | None = None
    estimated_remaining_days: float | None = None
    estimated_remaining_weeks: float | None = None
    measurements_history: list[dict[str, Any]] = Field(default_factory=list)
