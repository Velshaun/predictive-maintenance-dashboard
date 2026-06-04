from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, MaintenanceLog, SensorReading
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class MachineCreate(BaseModel):
    name: str
    machine_type: str
    location: str


class LogCreate(BaseModel):
    machine_id: int
    description: str
    technician: str
    cost: float


# ── Helper: active-only filter ────────────────────────────────────────────────
def _active(q):
    """Filter a Machine query to exclude soft-deleted rows."""
    return q.filter((Machine.is_deleted == False) | (Machine.is_deleted == None))  # noqa: E712


# ── List active machines ──────────────────────────────────────────────────────
@router.get('/')
def get_all_machines(db: Session = Depends(get_db)):
    return _active(db.query(Machine)).all()


# ── List soft-deleted machines ────────────────────────────────────────────────
@router.get('/deleted')
def get_deleted_machines(db: Session = Depends(get_db)):
    return db.query(Machine).filter(Machine.is_deleted == True).all()  # noqa: E712


# ── Get one active machine ────────────────────────────────────────────────────
@router.get('/{machine_id}')
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = _active(db.query(Machine)).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    return machine


# ── Create machine ────────────────────────────────────────────────────────────
@router.post('/')
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    db_machine = Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


# ── Soft delete ───────────────────────────────────────────────────────────────
@router.delete('/{machine_id}')
def soft_delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """
    Soft-delete a machine: sets is_deleted=True and records the timestamp.
    The machine can be restored later. Use /permanent to hard-delete.
    """
    machine = _active(db.query(Machine)).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    machine.is_deleted = True
    machine.deleted_at = datetime.utcnow()
    db.commit()
    return {'message': f'Machine {machine_id} soft-deleted', 'deleted_at': machine.deleted_at}


# ── Restore ───────────────────────────────────────────────────────────────────
@router.post('/{machine_id}/restore')
def restore_machine(machine_id: int, db: Session = Depends(get_db)):
    """Restore a soft-deleted machine back to active status."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    machine.is_deleted = False
    machine.deleted_at = None
    db.commit()
    db.refresh(machine)
    return machine


# ── Permanent delete ──────────────────────────────────────────────────────────
@router.delete('/{machine_id}/permanent')
def permanent_delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete a machine and all its sensor readings and maintenance logs.
    This action cannot be undone.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    db.query(SensorReading).filter(SensorReading.machine_id == machine_id).delete()
    db.query(MaintenanceLog).filter(MaintenanceLog.machine_id == machine_id).delete()
    db.delete(machine)
    db.commit()
    return {'message': f'Machine {machine_id} permanently deleted'}


# ── Machine logs ──────────────────────────────────────────────────────────────
@router.get('/{machine_id}/logs')
def get_machine_logs(machine_id: int, db: Session = Depends(get_db)):
    return db.query(MaintenanceLog).filter(MaintenanceLog.machine_id == machine_id).all()


@router.post('/logs')
def add_log(log: LogCreate, db: Session = Depends(get_db)):
    db_log = MaintenanceLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
