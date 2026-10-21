"""Tests for healing-time estimation, risk assessment, and API contract extensions."""
import io
import json
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.risk import evaluate_risk
from app.services.healing import estimate_healing_time

client = TestClient(app)

def test_risk_urgent_override_on_confusion_or_fainting():
    # Even if wound is acute, emergency symptom must trigger URGENT
    clinical = {
        "wound_duration": "Under 1 week",
        "systemic_symptoms": ["confusion", "fainting"],
        "symptoms": ["mild_redness"],
    }
    res = evaluate_risk(clinical)
    assert res["risk_level"] == "URGENT"
    assert "Emergency systemic warning signs detected" in res["risk_basis"]
    assert any("Confusion" in r for r in res["reasons"])
    assert "emergency" in res["recommended_action"].lower()

def test_risk_high_on_fever_and_pus():
    clinical = {
        "wound_duration": "1–2 weeks",
        "fever_present": True,
        "discharge_type": "purulent pus",
        "symptoms": ["spreading_redness"],
    }
    res = evaluate_risk(clinical)
    assert res["risk_level"] == "HIGH"
    assert "Signs consistent with acute localized or spreading wound infection" in res["risk_basis"]
    assert any("Fever" in r for r in res["reasons"])
    assert any("Purulent" in r for r in res["reasons"])
    assert "24 hours" in res["recommended_action"]

def test_risk_moderate_on_chronic_diabetic_wound():
    clinical = {
        "wound_duration": "5–6 weeks",
        "diabetes_status": "Yes",
        "symptoms": [],
        "systemic_symptoms": [],
    }
    res = evaluate_risk(clinical, trajectory="stable")
    assert res["risk_level"] == "MODERATE"
    assert any("diabetes" in r.lower() for r in res["reasons"])
    assert any("chronicity" in r.lower() for r in res["reasons"])

def test_risk_low_on_clean_acute_wound():
    clinical = {
        "wound_duration": "Under 1 week",
        "diabetes_status": "No",
        "symptoms": [],
        "systemic_symptoms": [],
        "has_symptom_triage": True,
    }
    res = evaluate_risk(clinical, trajectory="improving")
    assert res["risk_level"] == "LOW"
    assert "No acute infection flags" in res["risk_basis"]

def test_risk_unavailable_when_symptoms_missing():
    # If no symptoms questionnaire answered and no data provided
    res = evaluate_risk({})
    assert res["risk_level"] == "UNAVAILABLE"
    assert "No clinical symptom or triage information provided" in res["risk_basis"]

def test_healing_insufficient_data_when_duration_omitted():
    clinical = {"diabetes_status": "No", "wound_duration": "Unknown"}
    res = estimate_healing_time(clinical)
    assert res["healing_estimate_status"] == "INSUFFICIENT_DATA"
    assert res["estimated_healing_time"] is None
    assert res["estimate_type"] == "NOT_AVAILABLE"
    assert any("duration" in lim.lower() for lim in res["limitations"])

def test_healing_unavailable_on_urgent_systemic_infection():
    clinical = {"wound_duration": "1–2 weeks"}
    res = estimate_healing_time(clinical, risk_level="URGENT")
    assert res["healing_estimate_status"] == "INSUFFICIENT_DATA"
    assert res["estimated_healing_time"] is None
    assert any("emergency" in lim.lower() for lim in res["limitations"])

def test_healing_acute_uncomplicated_benchmark():
    clinical = {
        "wound_duration": "1–2 weeks",
        "diabetes_status": "No",
        "wound_location": "Forearm",
    }
    res = estimate_healing_time(clinical, trajectory="improving", area_cm2=2.1)
    assert res["healing_estimate_status"] == "AVAILABLE"
    assert res["estimated_healing_time"] == "1–3"
    assert res["estimated_healing_unit"] == "weeks"
    assert res["estimate_type"] == "RULE_BASED_ESTIMATE"
    assert any("Acute" in f for f in res["supporting_factors"])

def test_healing_chronic_diabetic_improving_benchmark():
    clinical = {
        "wound_duration": "5–6 weeks",
        "diabetes_status": "Yes",
        "wound_location": "Foot",
    }
    res = estimate_healing_time(clinical, trajectory="improving", area_cm2=4.5)
    assert res["healing_estimate_status"] == "AVAILABLE"
    assert res["estimated_healing_time"] == "8–14"
    assert res["estimated_healing_unit"] == "weeks"
    assert res["estimate_type"] == "RULE_BASED_ESTIMATE"

def test_healing_chronic_worsening_benchmark():
    clinical = {
        "wound_duration": "7+ weeks",
        "diabetes_status": "Yes",
        "wound_location": "Heel",
    }
    res = estimate_healing_time(clinical, trajectory="worsening")
    assert res["healing_estimate_status"] == "AVAILABLE"
    assert "16–24+" in res["estimated_healing_time"]
    assert res["estimated_healing_unit"] == "weeks"
    assert res["estimate_type"] == "RULE_BASED_ESTIMATE"

def test_api_analyze_endpoint_returns_extended_risk_and_healing_contracts():
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color=(200, 80, 80)).save(buf, format="PNG")
    buf.seek(0)

    clinical_payload = {
        "wound_duration": "1–2 weeks",
        "wound_location": "Lower leg",
        "diabetes_status": "No",
        "symptoms": ["mild_redness"],
        "systemic_symptoms": [],
        "has_symptom_triage": True,
        "pixels_per_cm": 40.0,
    }

    resp = client.post(
        "/api/analyze",
        files={"image": ("test.png", buf.getvalue(), "image/png")},
        data={"clinical_data": json.dumps(clinical_payload)},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Core existing fields
    assert "request_id" in data
    assert data["model_status"] == "ready"
    assert data["wound_area_px"] is not None
    assert data["segmentation_mask_png_base64"] is not None

    # New risk assessment fields
    assert data["risk_level"] in {"LOW", "MODERATE", "HIGH", "URGENT", "UNAVAILABLE"}
    assert "risk_basis" in data
    assert isinstance(data["risk_reasons"], list)
    assert "recommended_action" in data
    assert "risk_disclaimer" in data

    # New healing time fields
    assert data["healing_estimate_status"] in {"AVAILABLE", "INSUFFICIENT_DATA", "MODEL_UNAVAILABLE"}
    assert data["estimate_type"] in {"ML_PREDICTION", "RULE_BASED_ESTIMATE", "NOT_AVAILABLE"}
    assert isinstance(data["supporting_factors"], list)
    assert isinstance(data["healing_limitations"], list)
    assert "healing_disclaimer" in data
