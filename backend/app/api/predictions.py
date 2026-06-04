from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, SensorReading
from app.ml.predictor import predict_days_until_service, train_model
from pydantic import BaseModel

router = APIRouter()


# ── Shared label + auto-train helper (used by startup and the /train endpoint) ──
def _label(r) -> float:
    """Derive a positive days_until_service label from sensor thresholds."""
    t, v, p = r.temperature, r.vibration, r.pressure
    if t > 90 or v > 8 or p > 120:
        penalty = max(t - 90, 0) * 0.5 + max(v - 8, 0) * 2 + max(p - 120, 0) * 0.1
        return float(max(3, 14 - int(penalty)))
    elif t > 75 or v > 5 or p > 100:
        penalty = max(t - 75, 0) * 0.8 + max(v - 5, 0) * 2 + max(p - 100, 0) * 0.1
        return float(max(15, 30 - int(penalty)))
    else:
        stress = (t - 60) * 0.4 + v * 1.5 + (p - 70) * 0.2
        return float(min(90, max(31, int(90 - stress))))


def auto_train_from_db(db) -> dict | None:
    """
    Train the ML model using all sensor readings currently in the database.
    Called on pod startup so every replica boots with a trained model.
    Returns the train_model result dict, or None if there aren't enough readings.
    """
    readings = db.query(SensorReading).all()
    if len(readings) < 20:
        return None
    data = [
        {
            'temperature':      r.temperature,
            'vibration':        r.vibration,
            'pressure':         r.pressure,
            'runtime_hours':    r.runtime_hours,
            'days_until_service': _label(r),
        }
        for r in readings
    ]
    return train_model(data)


class SensorReadingCreate(BaseModel):
    machine_id: int
    temperature: float
    vibration: float
    pressure: float
    runtime_hours: float


# ── GET all readings ─────────────────────────────────────────────────────────
@router.get('/')
def get_all_readings(db: Session = Depends(get_db)):
    return db.query(SensorReading).all()


# ── Specific routes BEFORE the wildcard GET /{machine_id} ────────────────────

@router.get('/status/{machine_id}')
def get_machine_status(machine_id: int, db: Session = Depends(get_db)):
    """Return current status and latest sensor reading for a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    latest_reading = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.recorded_at.desc())
        .first()
    )
    return {
        'machine_id': machine_id,
        'machine_name': machine.name,
        'current_status': machine.status,
        'latest_reading': latest_reading,
    }


@router.post('/run/{machine_id}')
def run_prediction(machine_id: int, db: Session = Depends(get_db)):
    """
    Run ML prediction for a single machine using its latest stored sensor reading.
    Does NOT write any new reading — pure prediction call.
    Falls back to default sensor values when no reading exists.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.recorded_at.desc())
        .first()
    )

    if latest:
        t = latest.temperature
        v = latest.vibration
        p = latest.pressure
        r = latest.runtime_hours
        using_fallback = False
    else:
        t, v, p, r = 70.0, 3.0, 85.0, 200.0
        using_fallback = True

    result = predict_days_until_service(t, v, p, r)

    # Update machine status if model is trained
    if result['status'] != 'model_not_trained':
        machine.status = result['status']
        db.commit()

    return {
        'machine_id': machine_id,
        'using_fallback': using_fallback,
        **result,
    }


# ── Wildcard GET — must come AFTER specific paths ────────────────────────────
@router.get('/{machine_id}')
def get_machine_readings(
    machine_id: int,
    limit: int = Query(default=None, ge=1, le=100_000, description='Cap the number of readings returned (newest first)'),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    q = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.recorded_at.desc())
    )
    if limit:
        q = q.limit(limit)
    return q.all()


# ── Write a new sensor reading (rule-based status update) ────────────────────
@router.post('/')
def add_sensor_reading(reading: SensorReadingCreate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == reading.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')

    db_reading = SensorReading(**reading.dict())
    db.add(db_reading)

    status = 'green'
    if reading.temperature > 90 or reading.vibration > 8 or reading.pressure > 120:
        status = 'red'
    elif reading.temperature > 75 or reading.vibration > 5 or reading.pressure > 100:
        status = 'yellow'

    machine.status = status
    db.commit()
    db.refresh(db_reading)
    return {'reading': db_reading, 'predicted_status': status, 'machine_id': reading.machine_id}


# ── ML prediction with caller-supplied sensor values (no DB write) ───────────
@router.post('/predict')
def get_ml_prediction(reading: SensorReadingCreate, db: Session = Depends(get_db)):
    """
    Run ML prediction with caller-supplied sensor values.
    Does NOT save the reading to the database.
    """
    machine = db.query(Machine).filter(Machine.id == reading.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')

    result = predict_days_until_service(
        reading.temperature,
        reading.vibration,
        reading.pressure,
        reading.runtime_hours,
    )

    if result['status'] != 'model_not_trained':
        machine.status = result['status']
        db.commit()

    return {'machine_id': reading.machine_id, **result}


# ── Train the ML model ───────────────────────────────────────────────────────
@router.post('/train')
def trigger_training(db: Session = Depends(get_db)):
    """
    Train the RandomForest model on all stored sensor readings.
    Requires at least 20 readings.
    """
    result = auto_train_from_db(db)
    if result is None:
        count = db.query(SensorReading).count()
        return {'error': 'Need at least 20 readings to train', 'current': count}
    return result
