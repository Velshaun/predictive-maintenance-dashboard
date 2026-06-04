import os
import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.api import machines, logs, predictions, ai_insights
from app.api.predictions import auto_train_from_db

logger = logging.getLogger(__name__)

app = FastAPI(title='Predictive Maintenance API', version='1.0.0')

ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(machines.router, prefix='/api/machines', tags=['machines'])
app.include_router(logs.router, prefix='/api/logs', tags=['logs'])
app.include_router(predictions.router, prefix='/api/predictions', tags=['predictions'])
app.include_router(ai_insights.router, prefix='/api/ai', tags=['ai'])


@app.on_event('startup')
def startup():
    for attempt in range(12):
        try:
            Base.metadata.create_all(bind=engine)
            # Add soft-delete columns to existing databases that pre-date the migration
            with engine.connect() as conn:
                for stmt in [
                    "ALTER TABLE machines ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE machines ADD COLUMN deleted_at TIMESTAMP",
                ]:
                    try:
                        conn.execute(text(stmt))
                        conn.commit()
                    except Exception:
                        pass  # Column already exists — safe to ignore
            # Auto-train ML model so every replica/pod boots with a trained model.
            # With multiple replicas, only the pod that handles /train saves the pkl;
            # the others never get it. Training here ensures every pod is self-sufficient.
            try:
                db = SessionLocal()
                result = auto_train_from_db(db)
                db.close()
                if result:
                    logger.info(f'ML model auto-trained on startup: {result}')
                else:
                    logger.info('ML auto-train skipped: not enough sensor readings yet')
            except Exception as train_err:
                logger.warning(f'ML auto-train on startup failed (non-fatal): {train_err}')

            logger.info('Database tables created/verified successfully')
            return
        except Exception as e:
            logger.warning(f'DB connection attempt {attempt + 1}/12 failed: {e}')
            if attempt < 11:
                time.sleep(5)
            else:
                raise RuntimeError(f'Could not connect to database after 12 attempts: {e}')


@app.get('/health')
def health_check():
    return {'status': 'ok'}
