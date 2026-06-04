"""
Single-shot aggregate endpoint for the Dashboard page.

Replaces the 5 separate requests the UI used to make
(/api/machines/ + /api/logs/ + /api/predictions/<id> × 3) with one call
that returns all necessary data in a single database round-trip.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, MaintenanceLog, SensorReading

router = APIRouter()

_STATUS_PRIORITY = {'red': 0, 'yellow': 1, 'green': 2}

# How many sensor readings to return per top-3 machine (newest first).
# 60 readings ≈ 1 hour at 1-per-minute; more than enough for the trend chart.
_READINGS_LIMIT = 60


def _row(obj) -> dict:
    """Serialize a SQLAlchemy ORM row to a plain JSON-safe dict."""
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


@router.get('/')
def get_dashboard(db: Session = Depends(get_db)):
    """
    Aggregate dashboard payload — one request, everything the UI needs:
      - machines       : all active (non-deleted) machines
      - logs           : all maintenance logs (for the cost bar chart)
      - top3_ids       : machine IDs of the 3 most at-risk assets (red → yellow → green)
      - top3_readings  : last 60 sensor readings per top-3 machine, keyed by machine id
    """
    # ── Active machines ───────────────────────────────────────────────────────
    machines = (
        db.query(Machine)
        .filter((Machine.is_deleted == False) | (Machine.is_deleted == None))  # noqa: E712
        .all()
    )

    # ── All maintenance logs (cost chart) ─────────────────────────────────────
    logs = db.query(MaintenanceLog).all()

    # ── Top-3 most at-risk machines ───────────────────────────────────────────
    top3 = sorted(
        machines,
        key=lambda m: _STATUS_PRIORITY.get(m.status or 'unknown', 3),
    )[:3]

    # ── Last N sensor readings per top-3 machine ──────────────────────────────
    top3_readings: dict[str, list] = {}
    for m in top3:
        rows = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == m.id)
            .order_by(SensorReading.recorded_at.desc())
            .limit(_READINGS_LIMIT)
            .all()
        )
        top3_readings[str(m.id)] = [_row(r) for r in rows]

    return {
        'machines':      [_row(m) for m in machines],
        'logs':          [_row(l) for l in logs],
        'top3_ids':      [m.id for m in top3],
        'top3_readings': top3_readings,
    }
