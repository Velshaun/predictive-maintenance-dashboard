from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.machine import MaintenanceLog
from pydantic import BaseModel

router = APIRouter()


class LogCreate(BaseModel):
    machine_id: int
    description: str
    technician: str
    cost: float


@router.get('/')
def get_all_logs(db: Session = Depends(get_db)):
    return db.query(MaintenanceLog).all()


@router.get('/{log_id}')
def get_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Log not found')
    return log


@router.post('/')
def create_log(log: LogCreate, db: Session = Depends(get_db)):
    db_log = MaintenanceLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@router.delete('/{log_id}')
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Log not found')
    db.delete(log)
    db.commit()
    return {'message': 'Log deleted successfully'}
