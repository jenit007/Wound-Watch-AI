import json
import io
import tempfile
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.storage import (
    init_db,
    get_or_create_wound,
    add_measurement,
    get_wound_measurements,
    list_wounds,
    compute_pixel_reduction_trajectory,
)

client = TestClient(app)

def test_storage_crud_in_isolated_db():
    with tempfile.TemporaryDirectory() as tmpdir:
        test_db = Path(tmpdir) / "test_history.db"
        init_db(test_db)

        # Create wound
        w = get_or_create_wound("W-100", label="Test Wound A", wound_duration="1–2 weeks", progression_status="improving", db_path=test_db)
        assert w["wound_id"] == "W-100"
        assert w["label"] == "Test Wound A"

        # Add initial measurement
        m1 = add_measurement("W-100", wound_area_px=12000.0, wound_area_cm2=4.5, recorded_at="2026-10-01T10:00:00Z", risk_level="LOW", db_path=test_db)
        assert m1["wound_area_px"] == 12000.0

        # Add follow-up measurement
        m2 = add_measurement("W-100", wound_area_px=9600.0, wound_area_cm2=3.6, recorded_at="2026-10-08T10:00:00Z", risk_level="LOW", db_path=test_db)
        assert m2["wound_area_px"] == 9600.0

        history = get_wound_measurements("W-100", db_path=test_db)
        assert len(history) == 2
        assert history[0]["wound_area_px"] == 12000.0
        assert history[1]["wound_area_px"] == 9600.0

        all_wounds = list_wounds(db_path=test_db)
        assert len(all_wounds) == 1
        assert all_wounds[0]["measurement_count"] == 2

def test_trajectory_baseline_single_image():
    res = compute_pixel_reduction_trajectory(
        prior_measurements=[],
        current_area_px=10000.0,
        current_recorded_at="2026-10-01T12:00:00Z",
    )
    assert res["is_baseline"] is True
    assert res["measurement_count"] == 1
    assert res["pixel_reduction_rate_px_per_day"] is None
    assert res["percentage_area_change"] is None
    assert res["estimated_remaining_days"] is None
    assert res["estimate_type"] == "NOT_AVAILABLE"
    assert res["healing_estimate_status"] == "INSUFFICIENT_DATA"
    assert any("Baseline measurement established" in exp for exp in res["explanation"])

def test_trajectory_shrinking_positive_rate_projection():
    priors = [
        {"wound_area_px": 10000.0, "recorded_at": "2026-10-01T12:00:00Z"},
    ]
    # 4 days elapsed, area reduced from 10000 to 8000 -> 2000 px reduced over 4 days = 500 px/day
    res = compute_pixel_reduction_trajectory(
        prior_measurements=priors,
        current_area_px=8000.0,
        current_recorded_at="2026-10-05T12:00:00Z",
    )
    assert res["is_baseline"] is False
    assert res["measurement_count"] == 2
    assert res["elapsed_days"] == 4.0
    assert res["pixel_reduction_rate_px_per_day"] == 500.0
    assert res["percentage_area_change"] == -20.0
    # Remaining days: 8000 / 500 = 16.0 days
    assert res["estimated_remaining_days"] == 16.0
    assert res["estimated_remaining_weeks"] == 2.3
    assert res["estimate_type"] == "EXPERIMENTAL_PIXEL_PROJECTION"
    assert res["healing_estimate_status"] == "AVAILABLE"
    assert "16.0 days" in res["estimated_healing_time"]

def test_trajectory_expanding_negative_rate_no_projection():
    priors = [
        {"wound_area_px": 8000.0, "recorded_at": "2026-10-01T12:00:00Z"},
    ]
    # 4 days elapsed, area expanded from 8000 to 10000 -> expanding lesion
    res = compute_pixel_reduction_trajectory(
        prior_measurements=priors,
        current_area_px=10000.0,
        current_recorded_at="2026-10-05T12:00:00Z",
    )
    assert res["is_baseline"] is False
    assert res["percentage_area_change"] == 25.0
    assert res["pixel_reduction_rate_px_per_day"] < 0
    assert res["estimated_remaining_days"] is None
    assert res["estimate_type"] == "OBSERVED_PIXEL_TREND"
    assert res["healing_estimate_status"] == "INSUFFICIENT_DATA"

def test_trajectory_handles_same_minute_gracefully():
    priors = [
        {"wound_area_px": 5000.0, "recorded_at": "2026-10-01T12:00:00Z"},
    ]
    # Same minute upload in rapid testing
    res = compute_pixel_reduction_trajectory(
        prior_measurements=priors,
        current_area_px=4500.0,
        current_recorded_at="2026-10-01T12:00:05Z",
    )
    # Should not raise ZeroDivisionError
    assert res["elapsed_days"] >= 1.0
    assert res["pixel_reduction_rate_px_per_day"] is not None

def test_api_wounds_and_history_endpoints():
    import uuid
    resp = client.get("/api/wounds")
    assert resp.status_code == 200
    assert "wounds" in resp.json()

    # Create dummy image
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color=(220, 90, 90)).save(buf, format="PNG")
    buf.seek(0)

    wound_test_id = f"WOUND-TEST-{uuid.uuid4().hex[:6]}"
    # First upload (Baseline)
    resp1 = client.post(
        "/api/analyze",
        files={"image": ("test1.png", buf.getvalue(), "image/png")},
        data={"clinical_data": json.dumps({"wound_id": wound_test_id, "visit_date": "2026-10-01T00:00:00Z", "wound_duration": "1–2 weeks"})},
    )
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert d1["wound_id"] == wound_test_id
    assert d1["is_baseline"] is True
    assert len(d1["measurements_history"]) == 1

    # Second upload (Follow-up 5 days later)
    resp2 = client.post(
        "/api/analyze",
        files={"image": ("test2.png", buf.getvalue(), "image/png")},
        data={"clinical_data": json.dumps({"wound_id": wound_test_id, "visit_date": "2026-10-06T00:00:00Z", "wound_duration": "1–2 weeks"})},
    )
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d2["wound_id"] == wound_test_id
    assert d2["is_baseline"] is False
    assert len(d2["measurements_history"]) == 2

    # Verify history endpoint
    resp_hist = client.get(f"/api/wounds/{wound_test_id}/history")
    assert resp_hist.status_code == 200
    hist_data = resp_hist.json()
    assert hist_data["wound_id"] == wound_test_id
    assert len(hist_data["measurements"]) == 2
