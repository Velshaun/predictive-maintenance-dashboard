from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import Machine, MaintenanceLog
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


@router.get('/')
def get_all_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()


@router.get('/{machine_id}')
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail='Machine not found')
    return machine


@router.post('/')
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    db_machine = Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


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
