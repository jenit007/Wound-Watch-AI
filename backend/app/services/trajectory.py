"""Descriptive longitudinal wound-area trend analysis; not a clinical diagnosis."""
from datetime import date
from typing import Any
import math

VALID_TRAJECTORIES = {"improving", "stable", "worsening", "insufficient_data", "unavailable"}

def analyze_trajectory(visits: list[dict[str, Any]] | None, current_area_cm2: float | None = None,
                       stable_change_percent: float = 5.0) -> dict[str, Any]:
    """Compare the latest two valid measurements. Lower area is descriptively improving.

    Percent change = (new area - previous area) / previous area * 100.
    A configurable absolute percentage change <= stable_change_percent is called stable.
    These are provisional descriptive thresholds, not validated clinical thresholds.
    """
    valid = []
    for item in visits or []:
        try:
            d = date.fromisoformat(str(item.get("visit_date", "")))
            a = float(item.get("area_cm2"))
            if math.isfinite(a) and a >= 0:
                valid.append((d, a))
        except (ValueError, TypeError):
            continue
    if current_area_cm2 is not None:
        try:
            current_area_cm2 = float(current_area_cm2)
            if not math.isfinite(current_area_cm2) or current_area_cm2 < 0:
                current_area_cm2 = None
        except (ValueError, TypeError):
            current_area_cm2 = None
    valid.sort(key=lambda x: x[0])
    if current_area_cm2 is not None:
        # API may send current visit separately; use the latest dated visit as previous.
        if valid:
            previous = valid[-1][1]
            if previous == 0:
                return {"trajectory": "insufficient_data", "area_change_percent": None,
                        "explanation": ["Previous area is zero; percentage change is undefined."]}
            change = (current_area_cm2 - previous) / previous * 100.0
            status = "stable" if abs(change) <= stable_change_percent else ("improving" if change < 0 else "worsening")
            return {"trajectory": status, "area_change_percent": float(change),
                    "explanation": [f"Area changed by {change:.1f}% relative to the latest recorded visit.",
                                    "This is a descriptive area trend, not proof of normal healing."]}
    if len(valid) < 2:
        return {"trajectory": "insufficient_data", "area_change_percent": None,
                "explanation": ["At least two valid, comparable area measurements are required."]}
    previous, latest = valid[-2][1], valid[-1][1]
    if previous == 0:
        return {"trajectory": "insufficient_data", "area_change_percent": None,
                "explanation": ["Previous area is zero; percentage change is undefined."]}
    change = (latest - previous) / previous * 100.0
    status = "stable" if abs(change) <= stable_change_percent else ("improving" if change < 0 else "worsening")
    days = (valid[-1][0] - valid[-2][0]).days
    return {"trajectory": status, "area_change_percent": float(change),
            "explanation": [f"Recorded area changed by {change:.1f}% over {days} day(s).",
                            "This is a descriptive area trend, not proof of normal healing."]}
