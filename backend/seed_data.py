"""
Seed script — populates the database with realistic demo data.

Usage:
    python seed_data.py           # seed (skips if data already exists)
    python seed_data.py --reset   # drop existing seed data and re-seed
"""

import os
import sys
import random
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Bootstrap path so `app` module is importable ──────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    sys.exit('ERROR: DATABASE_URL environment variable is not set.')

from app.database import Base
from app.models.machine import Machine, MaintenanceLog, SensorReading

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

# ── Seed definitions ───────────────────────────────────────────────────────────

MACHINES = [
    {
        'name': 'Compressor A1',
        'machine_type': 'Air Compressor',
        'location': 'Building 1 — Level 2',
        'status': 'green',
        'last_serviced_days_ago': 14,
        # Sensor profile: (base_temp, temp_noise, base_vib, vib_noise, base_pres, pres_noise)
        'profile': (68, 4, 0.22, 0.05, 29.5, 1.2),
        'runtime_start': 1420,
        'logs': [
            ('Routine quarterly inspection completed — all systems normal.', 'J. Ramirez', 320.00, 91),
            ('Replaced inlet air filter. Pressure drop restored.', 'T. Nguyen', 85.00, 182),
            ('Annual lubrication service and belt tension check.', 'J. Ramirez', 210.00, 14),
        ],
    },
    {
        'name': 'Hydraulic Pump B2',
        'machine_type': 'Hydraulic Pump',
        'location': 'Building 2 — Ground Floor',
        'status': 'yellow',
        'last_serviced_days_ago': 68,
        'profile': (74, 6, 0.41, 0.09, 32.0, 2.0),
        'runtime_start': 3850,
        'logs': [
            ('Seal kit replacement — minor hydraulic leak on inlet port.', 'M. Patel', 460.00, 210),
            ('Vibration spike observed. Scheduled for bearing inspection.', 'S. Kim', 0.00, 68),
        ],
    },
    {
        'name': 'Steam Turbine C1',
        'machine_type': 'Steam Turbine',
        'location': 'Plant Floor A — East Wing',
        'status': 'green',
        'last_serviced_days_ago': 22,
        'profile': (85, 5, 0.18, 0.04, 38.5, 1.5),
        'runtime_start': 12400,
        'logs': [
            ('Major overhaul: blade inspection, seal replacement, alignment.', 'J. Ramirez', 4800.00, 365),
            ('Steam trap maintenance and condensate line flush.', 'D. Okonkwo', 620.00, 180),
            ('Blade erosion inspection — within tolerance limits.', 'T. Nguyen', 0.00, 90),
            ('Bearing temperature probe calibration.', 'M. Patel', 140.00, 22),
        ],
    },
    {
        'name': 'Conveyor Belt D1',
        'machine_type': 'Conveyor Belt',
        'location': 'Warehouse 1 — Line 3',
        'status': 'red',
        'last_serviced_days_ago': 145,
        'profile': (79, 8, 0.72, 0.15, 27.0, 3.0),
        'runtime_start': 6700,
        'logs': [
            ('Belt tensioner adjusted. Tracking alignment off by 12 mm.', 'S. Kim', 95.00, 210),
            ('Drive motor brushes replaced. Overheating warning cleared.', 'T. Nguyen', 380.00, 145),
        ],
    },
    {
        'name': 'Gas Compressor E2',
        'machine_type': 'Gas Compressor',
        'location': 'Building 3 — Compressor Room',
        'status': 'yellow',
        'last_serviced_days_ago': 55,
        'profile': (77, 5, 0.38, 0.08, 35.2, 1.8),
        'runtime_start': 5200,
        'logs': [
            ('Valve inspection — two discharge valves showing wear.', 'D. Okonkwo', 240.00, 180),
            ('Piston ring replacement on cylinder 2.', 'J. Ramirez', 910.00, 270),
            ('Gas leak detector calibration and seal integrity check.', 'M. Patel', 175.00, 55),
        ],
    },
    {
        'name': 'Centrifugal Pump F1',
        'machine_type': 'Centrifugal Pump',
        'location': 'Building 1 — Basement',
        'status': 'green',
        'last_serviced_days_ago': 30,
        'profile': (62, 4, 0.19, 0.04, 26.8, 1.0),
        'runtime_start': 2900,
        'logs': [
            ('Impeller clearance adjustment and wear ring replacement.', 'S. Kim', 520.00, 180),
            ('Shaft seal replaced — minor weeping noted on previous inspection.', 'T. Nguyen', 290.00, 90),
            ('Routine flow rate verification — performance nominal.', 'M. Patel', 0.00, 30),
        ],
    },
    {
        'name': 'Wind Turbine G3',
        'machine_type': 'Wind Turbine',
        'location': 'Rooftop — Section C',
        'status': 'green',
        'last_serviced_days_ago': 7,
        'profile': (55, 6, 0.28, 0.07, 24.5, 1.5),
        'runtime_start': 8800,
        'logs': [
            ('Gearbox oil change and pitch control actuator test.', 'D. Okonkwo', 680.00, 365),
            ('Blade inspection — no surface cracks or leading-edge erosion.', 'J. Ramirez', 0.00, 182),
            ('Yaw system bearing greased and brake pad thickness measured.', 'T. Nguyen', 115.00, 90),
            ('Annual safety inspection and electrical system check.', 'M. Patel', 420.00, 7),
        ],
    },
    {
        'name': 'Heavy Conveyor H2',
        'machine_type': 'Conveyor Belt',
        'location': 'Warehouse 2 — Line 1',
        'status': 'red',
        'last_serviced_days_ago': 190,
        'profile': (83, 10, 0.85, 0.20, 28.5, 4.0),
        'runtime_start': 9100,
        'logs': [
            ('Roller replacement — 6 idler rollers seized on return section.', 'S. Kim', 750.00, 300),
            ('Belt splice repair following mid-shift failure.', 'D. Okonkwo', 1100.00, 190),
        ],
    },
    {
        'name': 'Refrigeration Compressor I1',
        'machine_type': 'Refrigeration Compressor',
        'location': 'Cold Storage — Unit 4',
        'status': 'yellow',
        'last_serviced_days_ago': 48,
        'profile': (42, 5, 0.33, 0.07, 22.0, 1.5),
        'runtime_start': 4300,
        'logs': [
            ('Refrigerant recharge (R-410A) and leak test.', 'T. Nguyen', 340.00, 150),
            ('Condenser coil cleaning — 40% fouling removed.', 'J. Ramirez', 180.00, 90),
            ('Suction pressure low — expansion valve adjusted.', 'M. Patel', 95.00, 48),
        ],
    },
    {
        'name': 'Boiler Feed Pump J2',
        'machine_type': 'Boiler Feed Pump',
        'location': 'Boiler Room — Station 2',
        'status': 'green',
        'last_serviced_days_ago': 19,
        'profile': (71, 4, 0.21, 0.05, 31.5, 1.2),
        'runtime_start': 3600,
        'logs': [
            ('Mechanical seal replacement — zero leakage after repair.', 'D. Okonkwo', 430.00, 180),
            ('Coupling alignment check and vibration baseline recorded.', 'S. Kim', 120.00, 90),
            ('Feedwater flow meter recalibrated to ±0.5% accuracy.', 'T. Nguyen', 85.00, 45),
            ('Bearing housing flushed and grease renewed.', 'M. Patel', 60.00, 19),
        ],
    },
]

TECHNICIANS = ['J. Ramirez', 'T. Nguyen', 'M. Patel', 'S. Kim', 'D. Okonkwo']

# ── Sensor generation ──────────────────────────────────────────────────────────

def generate_readings(machine_id: int, profile: tuple, runtime_start: float,
                      status: str, n: int = 60) -> list[SensorReading]:
    """
    Generate n hourly-spaced sensor readings with realistic drift.
    - 'red' machines show accelerating degradation trend.
    - 'yellow' machines show mild upward drift.
    - 'green' machines stay near baseline with minor variation.
    """
    base_temp, temp_noise, base_vib, vib_noise, base_pres, pres_noise = profile

    # Degradation multipliers for the final reading (linearly interpolated)
    degradation = {'green': 1.0, 'yellow': 1.25, 'red': 1.65}[status]
    readings = []
    now = datetime.utcnow()

    for i in range(n):
        t = i / (n - 1)  # 0.0 → 1.0 progress through time window
        mult = 1.0 + (degradation - 1.0) * (t ** 1.5)  # accelerating curve

        # Diurnal cycle (±2°C swing over 24h)
        hour_of_day = (i % 24)
        diurnal = 1.5 * math.sin(2 * math.pi * hour_of_day / 24)

        temp = round(base_temp * mult + diurnal + random.gauss(0, temp_noise), 1)
        vib  = round(max(0.05, base_vib * mult + random.gauss(0, vib_noise)), 3)
        pres = round(base_pres + random.gauss(0, pres_noise), 2)
        runtime = round(runtime_start + i * 1.0, 1)

        readings.append(SensorReading(
            machine_id=machine_id,
            temperature=temp,
            vibration=vib,
            pressure=pres,
            runtime_hours=runtime,
            recorded_at=now - timedelta(hours=(n - 1 - i)),
        ))
    return readings


def generate_logs(machine_id: int, log_defs: list) -> list[MaintenanceLog]:
    logs = []
    for desc, tech, cost, days_ago in log_defs:
        logs.append(MaintenanceLog(
            machine_id=machine_id,
            description=desc,
            technician=tech,
            cost=cost,
            logged_at=datetime.utcnow() - timedelta(days=days_ago),
        ))
    return logs


# ── Main ───────────────────────────────────────────────────────────────────────

def seed(reset: bool = False):
    Base.metadata.create_all(bind=engine)
    session = Session()

    try:
        existing = session.query(Machine).count()

        if existing > 0 and not reset:
            print(f'  ✓ Database already contains {existing} machine(s). '
                  'Use --reset to clear and re-seed.')
            return

        if reset and existing > 0:
            print(f'  ⚠  --reset: deleting {existing} existing machines and all related data…')
            session.query(SensorReading).delete()
            session.query(MaintenanceLog).delete()
            session.query(Machine).delete()
            session.commit()
            print('  ✓ Existing data cleared.')

        print(f'\n  Seeding {len(MACHINES)} machines…\n')
        total_readings = 0
        total_logs = 0

        for idx, m_def in enumerate(MACHINES, 1):
            days_ago = m_def['last_serviced_days_ago']
            machine = Machine(
                name=m_def['name'],
                machine_type=m_def['machine_type'],
                location=m_def['location'],
                status=m_def['status'],
                last_serviced=datetime.utcnow() - timedelta(days=days_ago),
                created_at=datetime.utcnow() - timedelta(days=days_ago + 30),
            )
            session.add(machine)
            session.flush()  # get machine.id

            readings = generate_readings(
                machine.id, m_def['profile'], m_def['runtime_start'],
                m_def['status'], n=60
            )
            logs = generate_logs(machine.id, m_def['logs'])

            session.bulk_save_objects(readings)
            session.bulk_save_objects(logs)
            total_readings += len(readings)
            total_logs += len(logs)

            status_icon = {'green': '🟢', 'yellow': '🟡', 'red': '🔴'}[m_def['status']]
            print(f'  [{idx:02d}/10] {status_icon} {m_def["name"]:<30} '
                  f'{len(readings)} readings  {len(logs)} logs')

        session.commit()
        print(f'\n  ✅  Seed complete — '
              f'{len(MACHINES)} machines, '
              f'{total_readings} sensor readings, '
              f'{total_logs} maintenance logs.\n')

    except Exception as e:
        session.rollback()
        print(f'\n  ❌  Seed failed: {e}')
        raise
    finally:
        session.close()


if __name__ == '__main__':
    reset = '--reset' in sys.argv
    seed(reset=reset)
