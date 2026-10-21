import json
import httpx

base_url = "http://127.0.0.1:8000"

# 1. Health check
h = httpx.get(f"{base_url}/health")
assert h.status_code == 200 and h.json() == {"status": "ok"}, "Health check failed"
print("1. Health check: PASSED")

# Load real validation image
with open("data/FUSeg/data/Foot Ulcer Segmentation Challenge/validation/images/0001.png", "rb") as f:
    img_bytes = f.read()

# 2. Acute clean wound -> LOW, 1-3 weeks
r_low = httpx.post(
    f"{base_url}/api/analyze",
    files={"image": ("0001.png", img_bytes, "image/png")},
    data={"clinical_data": json.dumps({"wound_duration": "1–2 weeks", "diabetes_status": "No", "has_symptom_triage": True})},
    timeout=30.0,
).json()
assert r_low["risk_level"] == "LOW", f"Expected LOW, got {r_low['risk_level']}"
assert r_low["healing_estimate_status"] == "AVAILABLE"
assert r_low["estimated_healing_time"] == "1–3"
assert r_low["estimate_type"] == "RULE_BASED_ESTIMATE"
print("2. Acute clean wound (LOW, 1-3 weeks): PASSED")

# 3. High infection wound -> HIGH
r_high = httpx.post(
    f"{base_url}/api/analyze",
    files={"image": ("0001.png", img_bytes, "image/png")},
    data={"clinical_data": json.dumps({"wound_duration": "2–3 weeks", "fever_present": True, "discharge_type": "purulent"})},
    timeout=30.0,
).json()
assert r_high["risk_level"] == "HIGH", f"Expected HIGH, got {r_high['risk_level']}"
assert len(r_high["risk_reasons"]) >= 2
print("3. Infection warning wound (HIGH): PASSED")

# 4. Emergency warning sign -> URGENT
r_urgent = httpx.post(
    f"{base_url}/api/analyze",
    files={"image": ("0001.png", img_bytes, "image/png")},
    data={"clinical_data": json.dumps({"wound_duration": "1 week", "systemic_symptoms": ["confusion", "fainting"]})},
    timeout=30.0,
).json()
assert r_urgent["risk_level"] == "URGENT", f"Expected URGENT, got {r_urgent['risk_level']}"
assert r_urgent["healing_estimate_status"] == "INSUFFICIENT_DATA"
print("4. Emergency systemic signs (URGENT override): PASSED")

# 5. Chronic diabetic wound with worsening trajectory -> MODERATE, 16-24+ weeks
r_mod = httpx.post(
    f"{base_url}/api/analyze",
    files={"image": ("0001.png", img_bytes, "image/png")},
    data={"clinical_data": json.dumps({"wound_duration": "7+ weeks", "diabetes_status": "Yes", "progression_status": "worsening"})},
    timeout=30.0,
).json()
assert r_mod["risk_level"] == "MODERATE", f"Expected MODERATE, got {r_mod['risk_level']}"
assert r_mod["healing_estimate_status"] == "AVAILABLE"
assert "16–24+" in r_mod["estimated_healing_time"]
print("5. Chronic diabetic worsening wound (MODERATE, 16-24+ weeks): PASSED")

# 6. Missing triage data -> UNAVAILABLE
r_unavail = httpx.post(
    f"{base_url}/api/analyze",
    files={"image": ("0001.png", img_bytes, "image/png")},
    data={"clinical_data": "{}"},
    timeout=30.0,
).json()
assert r_unavail["risk_level"] == "UNAVAILABLE", f"Expected UNAVAILABLE, got {r_unavail['risk_level']}"
assert r_unavail["healing_estimate_status"] == "INSUFFICIENT_DATA"
assert r_unavail["estimated_healing_time"] is None
print("6. Missing parameters (UNAVAILABLE, INSUFFICIENT_DATA): PASSED")

print("\nALL 6 END-TO-END INFERENCE TESTS PASSED!")
