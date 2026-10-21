"""Lightweight SQLite persistence and pixel-reduction trajectory engine for WoundWatch AI.

Stores wound records and dated measurements without external heavy database dependencies.
Ensures history is persisted across restarts and prevents mixing different wounds.
"""
from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "wound_history.db"

def get_db_path(custom_path: Path | str | None = None) -> Path:
    if custom_path is not None:
        p = Path(custom_path)
    else:
        env_val = os.getenv("WOUNDWATCH_DB_PATH")
        p = Path(env_val) if env_val else DEFAULT_DB_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    target = get_db_path(db_path)
    conn = sqlite3.connect(str(target), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS wounds (
                    wound_id TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    wound_duration TEXT,
                    progression_status TEXT,
                    notes TEXT
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS measurements (
                    id TEXT PRIMARY KEY,
                    wound_id TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    wound_area_px REAL NOT NULL,
                    wound_area_cm2 REAL,
                    risk_level TEXT,
                    notes TEXT,
                    FOREIGN KEY (wound_id) REFERENCES wounds(wound_id)
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_measurements_wound_date 
                ON measurements(wound_id, recorded_at);
            """)
    finally:
        conn.close()

def get_or_create_wound(
    wound_id: str | None = None,
    label: str | None = None,
    wound_duration: str | None = None,
    progression_status: str | None = None,
    notes: str | None = None,
    db_path: Path | str | None = None,
) -> dict[str, Any]:
    init_db(db_path)
    conn = get_connection(db_path)
    try:
        if wound_id:
            cur = conn.execute("SELECT * FROM wounds WHERE wound_id = ?", (wound_id,))
            row = cur.fetchone()
            if row:
                return dict(row)

        effective_id = wound_id.strip() if (wound_id and wound_id.strip()) else f"WOUND-{uuid.uuid4().hex[:6].upper()}"
        effective_label = label.strip() if (label and label.strip()) else f"Wound Record {effective_id}"
        created_at = datetime.now(timezone.utc).isoformat()

        with conn:
            conn.execute(
                """
                INSERT INTO wounds (wound_id, label, created_at, wound_duration, progression_status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (effective_id, effective_label, created_at, wound_duration, progression_status, notes),
            )
        return {
            "wound_id": effective_id,
            "label": effective_label,
            "created_at": created_at,
            "wound_duration": wound_duration,
            "progression_status": progression_status,
            "notes": notes,
        }
    finally:
        conn.close()

def add_measurement(
    wound_id: str,
    wound_area_px: float,
    wound_area_cm2: float | None = None,
    recorded_at: str | None = None,
    risk_level: str | None = None,
    notes: str | None = None,
    db_path: Path | str | None = None,
) -> dict[str, Any]:
    init_db(db_path)
    conn = get_connection(db_path)
    meas_id = str(uuid.uuid4())
    effective_recorded = recorded_at or datetime.now(timezone.utc).isoformat()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO measurements (id, wound_id, recorded_at, wound_area_px, wound_area_cm2, risk_level, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (meas_id, wound_id, effective_recorded, float(wound_area_px), wound_area_cm2, risk_level, notes),
            )
        return {
            "id": meas_id,
            "wound_id": wound_id,
            "recorded_at": effective_recorded,
            "wound_area_px": float(wound_area_px),
            "wound_area_cm2": wound_area_cm2,
            "risk_level": risk_level,
            "notes": notes,
        }
    finally:
        conn.close()

def get_wound_measurements(wound_id: str, db_path: Path | str | None = None) -> list[dict[str, Any]]:
    init_db(db_path)
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            SELECT id, wound_id, recorded_at, wound_area_px, wound_area_cm2, risk_level, notes
            FROM measurements
            WHERE wound_id = ?
            ORDER BY recorded_at ASC
            """,
            (wound_id,),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()

def list_wounds(db_path: Path | str | None = None) -> list[dict[str, Any]]:
    init_db(db_path)
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            SELECT w.wound_id, w.label, w.created_at, w.wound_duration, w.progression_status, w.notes,
                   COUNT(m.id) as measurement_count,
                   MAX(m.recorded_at) as latest_recorded_at
            FROM wounds w
            LEFT JOIN measurements m ON w.wound_id = m.wound_id
            GROUP BY w.wound_id
            ORDER BY latest_recorded_at DESC NULLS LAST, w.created_at DESC
            """
        )
        results = []
        for r in cur.fetchall():
            d = dict(r)
            results.append(d)
        return results
    finally:
        conn.close()

def parse_iso_or_date(date_str: str) -> datetime:
    """Robust parser for ISO timestamp, YYYY-MM-DD, or fallback to current UTC."""
    if not date_str:
        return datetime.now(timezone.utc)
    cleaned = date_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass
    try:
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)

def compute_pixel_reduction_trajectory(
    prior_measurements: list[dict[str, Any]],
    current_area_px: float,
    current_recorded_at: str | None = None,
) -> dict[str, Any]:
    """Compute observed pixel reduction rate and experimental linear projection.

    Rules:
    - If no prior measurements: Initial baseline recorded. Healing rate cannot be calculated from a single photographic timepoint.
    - If >= 1 prior measurement:
        initial = prior_measurements[0]
        elapsed_days = (current_dt - initial_dt) in days
        pixel_reduction_rate_px_per_day = (initial_area_px - current_area_px) / elapsed_days
        percentage_area_change = ((current_area_px - initial_area_px) / initial_area_px) * 100
        if pixel_reduction_rate_px_per_day > 0 and shrinking:
            estimated_remaining_days = current_area_px / pixel_reduction_rate_px_per_day
    """
    if not prior_measurements:
        return {
            "is_baseline": True,
            "measurement_count": 1,
            "initial_area_px": current_area_px,
            "current_area_px": current_area_px,
            "elapsed_days": 0.0,
            "pixel_reduction_rate_px_per_day": None,
            "percentage_area_change": None,
            "estimated_remaining_days": None,
            "estimated_remaining_weeks": None,
            "trajectory": "insufficient_data",
            "estimate_type": "NOT_AVAILABLE",
            "healing_estimate_status": "INSUFFICIENT_DATA",
            "estimated_healing_time": None,
            "estimated_healing_unit": None,
            "explanation": [
                "Baseline measurement established.",
                "Rate of healing and estimated time to closure cannot be calculated from a single photographic timepoint.",
                "Upload a follow-up photograph in 3–7 days to calculate your observed pixel reduction rate and progress graph.",
            ],
            "limitations": [
                "Single photograph baseline: sequential timepoints are required to measure boundary contraction.",
                "Tissue depth and volume changes cannot be assessed from 2D pixel contours alone.",
            ],
        }

    initial_m = prior_measurements[0]
    initial_area_px = float(initial_m["wound_area_px"])
    initial_dt = parse_iso_or_date(initial_m["recorded_at"])
    current_dt = parse_iso_or_date(current_recorded_at) if current_recorded_at else datetime.now(timezone.utc)

    diff_seconds = (current_dt - initial_dt).total_seconds()
    # If uploaded same minute in testing or negative timestamp, ensure minimum positive elapsed_days
    raw_days = diff_seconds / 86400.0
    elapsed_days = max(raw_days, 1.0) if raw_days < 0.01 else round(raw_days, 2)

    delta_px = initial_area_px - current_area_px
    rate_px_per_day = round(delta_px / elapsed_days, 2)
    pct_change = round(((current_area_px - initial_area_px) / initial_area_px) * 100.0, 1) if initial_area_px > 0 else 0.0

    total_measurements = len(prior_measurements) + 1

    if delta_px > 0 and rate_px_per_day > 0:
        # Wound is shrinking / contracting
        est_days = round(current_area_px / rate_px_per_day, 1)
        est_weeks = round(est_days / 7.0, 1)
        time_str = f"{est_days} days (~{est_weeks} wks)"

        return {
            "is_baseline": False,
            "measurement_count": total_measurements,
            "initial_area_px": initial_area_px,
            "current_area_px": current_area_px,
            "elapsed_days": elapsed_days,
            "pixel_reduction_rate_px_per_day": rate_px_per_day,
            "percentage_area_change": pct_change,
            "estimated_remaining_days": est_days,
            "estimated_remaining_weeks": est_weeks,
            "trajectory": "improving",
            "estimate_type": "EXPERIMENTAL_PIXEL_PROJECTION",
            "healing_estimate_status": "AVAILABLE",
            "estimated_healing_time": time_str,
            "estimated_healing_unit": "days",
            "explanation": [
                f"Observed contraction rate: {rate_px_per_day:g} pixels/day across {elapsed_days} elapsed day(s).",
                f"Wound perimeter has contracted by {abs(pct_change):g}% compared to baseline.",
                f"Experimental projection to zero pixel area: approximately {est_days} days (~{est_weeks} weeks).",
            ],
            "limitations": [
                "EXPERIMENTAL_PIXEL_PROJECTION is a mathematical extrapolation of 2D pixel contraction rate, not a verified clinical prediction.",
                "Actual physiological wound closure depends on cellular granulation, microvascular perfusion, infection control, and glycemic regulation.",
                "Healing rates often decelerate as wounds approach epithelial closure (hyperbolic, not strictly linear).",
            ],
        }
    else:
        # Wound is stable or expanding
        traj = "worsening" if pct_change > 2.0 else "stable"
        change_desc = f"expanded by +{pct_change:g}%" if pct_change > 0 else "remained essentially unchanged (0% delta)"

        return {
            "is_baseline": False,
            "measurement_count": total_measurements,
            "initial_area_px": initial_area_px,
            "current_area_px": current_area_px,
            "elapsed_days": elapsed_days,
            "pixel_reduction_rate_px_per_day": rate_px_per_day,
            "percentage_area_change": pct_change,
            "estimated_remaining_days": None,
            "estimated_remaining_weeks": None,
            "trajectory": traj,
            "estimate_type": "OBSERVED_PIXEL_TREND",
            "healing_estimate_status": "INSUFFICIENT_DATA",
            "estimated_healing_time": None,
            "estimated_healing_unit": None,
            "explanation": [
                f"Wound area has {change_desc} over {elapsed_days} elapsed day(s).",
                "A positive closure rate was not observed; linear projection to zero cannot be computed while the wound is expanding or stalled.",
                "Clinical re-evaluation and professional wound care consultation are recommended.",
            ],
            "limitations": [
                "Non-contracting or expanding ulcers carry elevated risks of biofilm formation, infection, or vascular insufficiency.",
                "Consult a certified wound specialist for pressure offloading, debridement, or microbial management.",
            ],
        }
