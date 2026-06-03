from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, SensorReading
from app.ml.predictor import predict_days_until_service, train_model
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class SensorReadingCreate(BaseModel):
    machine_id: int
    temperature: float
    vibration: float
    pressure: float
    runtime_hours: float


@router.get('/')
def get_all_readings(db: Session = Depends(get_db)):
    return db.query(SensorReading).all()


@router.get('/{machine_id}')
def get_machine_readings(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    readings = db.query(SensorReading).filter(SensorReading.machine_id == machine_id).all()
    return readings


@router.post('/')
def add_sensor_reading(reading: SensorReadingCreate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == reading.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')

    db_reading = SensorReading(**reading.dict())
    db.add(db_reading)

    # Simple rule-based prediction to update machine status
    status = 'green'
    if reading.temperature > 90 or reading.vibration > 8 or reading.pressure > 120:
        status = 'red'
    elif reading.temperature > 75 or reading.vibration > 5 or reading.pressure > 100:
        status = 'yellow'

    machine.status = status
    db.commit()
    db.refresh(db_reading)

    return {
        'reading': db_reading,
        'predicted_status': status,
        'machine_id': reading.machine_id
    }


@router.get('/status/{machine_id}')
def get_machine_prediction(machine_id: int, db: Session = Depends(get_db)):
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
        'latest_reading': latest_reading
    }


@router.post('/predict')
def get_ml_prediction(reading: SensorReadingCreate, db: Session = Depends(get_db)):
    """
    Accept sensor reading and return ML-based prediction.
    Saves the reading to the database and returns predicted days until service.
    """
    machine = db.query(Machine).filter(Machine.id == reading.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    
    # Save reading to database
    db_reading = SensorReading(**reading.dict())
    db.add(db_reading)
    db.commit()
    
    # Get prediction from ML model
    result = predict_days_until_service(
        reading.temperature,
        reading.vibration,
        reading.pressure,
        reading.runtime_hours
    )
    
    # Update machine status based on prediction
    if result['status'] == 'model_not_trained':
        machine.status = 'unknown'
    else:
        machine.status = result['status']
    db.commit()
    
    return {
        'machine_id': reading.machine_id,
        **result
    }


@router.post('/train')
def trigger_training(db: Session = Depends(get_db)):
    """
    Trigger model training using collected sensor readings.
    Requires at least 20 readings in the database.
    """
    readings = db.query(SensorReading).all()
    
    if len(readings) < 20:
        return {'error': 'Need at least 20 readings to train', 'current': len(readings)}
    
    # Prepare training data.
    # Labels are derived from sensor health — always a positive value in [3, 90].
    # High sensor stress → fewer days until service is needed.
    def _label(r) -> float:
        t, v, p = r.temperature, r.vibration, r.pressure
        if t > 90 or v > 8 or p > 120:
            # Critical zone: 3–14 days
            penalty = max(t - 90, 0) * 0.5 + max(v - 8, 0) * 2 + max(p - 120, 0) * 0.1
            return float(max(3, 14 - int(penalty)))
        elif t > 75 or v > 5 or p > 100:
            # Warning zone: 15–30 days
            penalty = max(t - 75, 0) * 0.8 + max(v - 5, 0) * 2 + max(p - 100, 0) * 0.1
            return float(max(15, 30 - int(penalty)))
        else:
            # Healthy zone: 31–90 days
            stress = (t - 60) * 0.4 + v * 1.5 + (p - 70) * 0.2
            return float(min(90, max(31, int(90 - stress))))

    data = [
        {
            'temperature': r.temperature,
            'vibration': r.vibration,
            'pressure': r.pressure,
            'runtime_hours': r.runtime_hours,
            'days_until_service': _label(r),
        }
        for r in readings
    ]
    
    return train_model(data)
