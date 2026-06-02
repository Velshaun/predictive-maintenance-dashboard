from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Machine(Base):
    __tablename__ = 'machines'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    machine_type = Column(String)
    location = Column(String)
    status = Column(String, default='green')  # green, yellow, red
    last_serviced = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    logs = relationship('MaintenanceLog', back_populates='machine')
    readings = relationship('SensorReading', back_populates='machine')


class MaintenanceLog(Base):
    __tablename__ = 'maintenance_logs'

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey('machines.id'))
    description = Column(Text)
    technician = Column(String)
    cost = Column(Float)
    logged_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship('Machine', back_populates='logs')


class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey('machines.id'))
    temperature = Column(Float)
    vibration = Column(Float)
    pressure = Column(Float)
    runtime_hours = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship('Machine', back_populates='readings')
