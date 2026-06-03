from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, SensorReading, MaintenanceLog
from pydantic import BaseModel
from typing import Optional
import os
import anthropic

router = APIRouter()
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))


class InsightRequest(BaseModel):
    machine_id: int
    question: Optional[str] = None


@router.get('/summary/{machine_id}')
def get_machine_summary(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')

    readings = (
        db.query(SensorReading)
        .filter(SensorReading.machine_id == machine_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(10)
        .all()
    )

    logs = (
        db.query(MaintenanceLog)
        .filter(MaintenanceLog.machine_id == machine_id)
        .order_by(MaintenanceLog.logged_at.desc())
        .limit(5)
        .all()
    )

    avg_temp = sum(r.temperature for r in readings) / len(readings) if readings else None
    avg_vibration = sum(r.vibration for r in readings) / len(readings) if readings else None
    avg_pressure = sum(r.pressure for r in readings) / len(readings) if readings else None

    recommendations = []
    if avg_temp and avg_temp > 75:
        recommendations.append('High average temperature detected. Consider scheduling a cooling system inspection.')
    if avg_vibration and avg_vibration > 5:
        recommendations.append('Elevated vibration levels. Check for loose components or bearing wear.')
    if avg_pressure and avg_pressure > 100:
        recommendations.append('Pressure above normal range. Inspect pressure relief valves and seals.')
    if not recommendations:
        recommendations.append('Machine operating within normal parameters. Continue routine maintenance schedule.')

    return {
        'machine_id': machine_id,
        'machine_name': machine.name,
        'current_status': machine.status,
        'sensor_summary': {
            'avg_temperature': round(avg_temp, 2) if avg_temp else None,
            'avg_vibration': round(avg_vibration, 2) if avg_vibration else None,
            'avg_pressure': round(avg_pressure, 2) if avg_pressure else None,
            'readings_analyzed': len(readings)
        },
        'recent_maintenance_count': len(logs),
        'ai_recommendations': recommendations
    }


@router.get('/fleet-health')
def get_fleet_health(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()

    status_counts = {'green': 0, 'yellow': 0, 'red': 0}
    for machine in machines:
        status = machine.status or 'green'
        if status in status_counts:
            status_counts[status] += 1

    total = len(machines)
    health_score = 0
    if total > 0:
        health_score = round(
            (status_counts['green'] * 100 + status_counts['yellow'] * 50) / total
        )

    return {
        'total_machines': total,
        'status_breakdown': status_counts,
        'fleet_health_score': health_score,
        'insight': (
            'Fleet is in good health.' if health_score >= 80
            else 'Some machines require attention.' if health_score >= 50
            else 'Critical: Multiple machines need immediate maintenance.'
        )
    }


class ClaudeInsightRequest(BaseModel):
    machine_name: str
    machine_type: str
    temperature: float
    vibration: float
    pressure: float
    runtime_hours: float
    days_until_service: float
    status: str
    recent_logs: list[str]


@router.post('/insight')
def get_ai_insight(req: ClaudeInsightRequest):
    """
    Generate AI-powered maintenance insight using Claude.
    Analyzes sensor data and predictions to provide actionable recommendations.
    """
    if not client.api_key:
        raise HTTPException(
            status_code=500,
            detail='ANTHROPIC_API_KEY not configured'
        )
    
    prompt = f"""You are a predictive maintenance AI assistant.

Machine: {req.machine_name} ({req.machine_type})
Current Status: {req.status.upper()}

Sensor Readings:
- Temperature: {req.temperature}°C
- Vibration: {req.vibration} Hz
- Pressure: {req.pressure} PSI
- Runtime: {req.runtime_hours} hours

ML Prediction: {req.days_until_service} days until service needed

Recent Maintenance Logs:
{chr(10).join(req.recent_logs[-3:]) if req.recent_logs else 'No recent logs'}

Provide a concise 3-4 sentence maintenance insight. Mention what the readings indicate, whether the status is concerning, and one specific recommended action."""

    message = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=300,
        messages=[
            {'role': 'user', 'content': prompt}
        ]
    )
    
    return {'insight': message.content[0].text}
