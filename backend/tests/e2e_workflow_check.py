"""End-to-End verification script for WoundWatch AI live workflow."""
import json
import io
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from PIL import Image

BASE_API = "http://127.0.0.1:8000"

def create_sample_image(color=(210, 80, 80), size=(128, 128)):
    buf = io.BytesIO()
    Image.new("RGB", size, color=color).save(buf, format="PNG")
    return buf.getvalue()

def post_multipart(url, fields, files):
    boundary = "----WebKitFormBoundary" + datetime.now().strftime("%Y%m%d%H%M%S")
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))
    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("--- 1. Testing Live Backend Health ---")
    with urllib.request.urlopen(f"{BASE_API}/health") as resp:
        health_data = json.loads(resp.read().decode("utf-8"))
        print(f"Health status: {health_data}")
        assert health_data["status"] == "ok"

    wound_id = f"WOUND-E2E-{datetime.now().strftime('%M%S')}"
    img1 = create_sample_image(color=(200, 70, 70))

    print(f"\n--- 2. Uploading Baseline Image 1 for {wound_id} ---")
    base_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    clinical_payload_1 = {
        "wound_id": wound_id,
        "wound_label": "Left Lower Leg Abrasion",
        "visit_date": base_date,
        "wound_duration": "1–4 weeks",
        "progression_status": "improving",
        "symptoms": [],
        "systemic_symptoms": [],
        "has_symptom_triage": True,
    }

    res1 = post_multipart(
        f"{BASE_API}/api/analyze",
        fields={"clinical_data": json.dumps(clinical_payload_1)},
        files={"image": ("baseline.png", img1, "image/png")},
    )

    print(f"Request ID: {res1.get('request_id')}")
    print(f"Model status: {res1.get('model_status')}")
    print(f"Wound ID: {res1.get('wound_id')}")
    print(f"Baseline area: {res1.get('wound_area_px')} px")
    print(f"Is baseline: {res1.get('is_baseline')}")
    print(f"Risk Level (1st): {res1.get('risk_level')}")
    print(f"Healing Estimate Status (2nd): {res1.get('healing_estimate_status')}")
    print(f"History count (3rd Graph): {len(res1.get('measurements_history', []))}")

    assert res1["wound_id"] == wound_id
    assert res1["is_baseline"] is True
    assert len(res1["measurements_history"]) == 1

    print(f"\n--- 3. Uploading Follow-up Image 2 for {wound_id} (7 days later) ---")
    followup_date = datetime.now(timezone.utc).isoformat()
    # Smaller lesion image simulating contraction
    img2 = create_sample_image(color=(200, 70, 70), size=(128, 128))
    clinical_payload_2 = {
        "wound_id": wound_id,
        "visit_date": followup_date,
        "wound_duration": "1–4 weeks",
        "progression_status": "improving",
        "symptoms": [],
        "systemic_symptoms": [],
        "has_symptom_triage": True,
    }

    res2 = post_multipart(
        f"{BASE_API}/api/analyze",
        fields={"clinical_data": json.dumps(clinical_payload_2)},
        files={"image": ("followup.png", img2, "image/png")},
    )

    print(f"Follow-up Request ID: {res2.get('request_id')}")
    print(f"Is baseline: {res2.get('is_baseline')}")
    print(f"Elapsed days: {res2.get('elapsed_days')}")
    print(f"Pixel Reduction Rate: {res2.get('pixel_reduction_rate_px_per_day')} px/day")
    print(f"Area change: {res2.get('area_change_percent')}%")
    print(f"Estimated remaining days: {res2.get('estimated_remaining_days')}")
    print(f"Estimate type: {res2.get('estimate_type')}")
    print(f"Measurements history count: {len(res2.get('measurements_history', []))}")

    assert res2["is_baseline"] is False
    assert len(res2["measurements_history"]) == 2

    print(f"\n--- 4. Checking Persistent History Endpoint for {wound_id} ---")
    with urllib.request.urlopen(f"{BASE_API}/api/wounds/{wound_id}/history") as resp:
        hist = json.loads(resp.read().decode("utf-8"))
        print(f"History endpoint returned {len(hist['measurements'])} measurements")
        assert len(hist["measurements"]) == 2

    print(f"\n--- 5. Testing Emergency Triage Flag ---")
    clinical_urgent = {
        "wound_id": f"WOUND-URGENT-{datetime.now().strftime('%M%S')}",
        "wound_duration": "More than 4 weeks",
        "progression_status": "worsening",
        "symptoms": ["spreading_redness", "pus_discharge"],
        "systemic_symptoms": ["confusion", "fainting"],
        "has_symptom_triage": True,
    }
    res_urgent = post_multipart(
        f"{BASE_API}/api/analyze",
        fields={"clinical_data": json.dumps(clinical_urgent)},
        files={"image": ("urgent.png", img1, "image/png")},
    )
    print(f"Urgent Risk Level: {res_urgent.get('risk_level')}")
    print(f"Recommended action: {res_urgent.get('recommended_action')[:80]}...")
    assert res_urgent["risk_level"] == "URGENT"
    assert "emergency" in res_urgent["recommended_action"].lower()

    print("\n[SUCCESS] All live workflow tests completed successfully!")

if __name__ == "__main__":
    main()
