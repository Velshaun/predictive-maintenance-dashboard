from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import machines, logs, predictions, ai_insights

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Predictive Maintenance API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(machines.router, prefix='/api/machines', tags=['machines'])
app.include_router(logs.router, prefix='/api/logs', tags=['logs'])
app.include_router(predictions.router, prefix='/api/predictions', tags=['predictions'])
app.include_router(ai_insights.router, prefix='/api/ai', tags=['ai'])


@app.get('/health')
def health_check():
    return {'status': 'ok'}
