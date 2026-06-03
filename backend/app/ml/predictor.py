import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os

MODEL_PATH = 'app/ml/model.pkl'
ANOMALY_PATH = 'app/ml/anomaly_model.pkl'


def train_model(data: list[dict]):
    """
    Train the prediction model.
    data: list of dicts with keys: temperature, vibration, pressure, runtime_hours,
    days_until_service
    """
    df = pd.DataFrame(data)
    features = ['temperature', 'vibration', 'pressure', 'runtime_hours']
    X = df[features]
    y = df['days_until_service']
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    
    # Also train anomaly detector
    iso = IsolationForest(contamination=0.1, random_state=42)
    iso.fit(X)
    joblib.dump(iso, ANOMALY_PATH)
    
    return {'status': 'trained', 'samples': len(df)}


def predict_days_until_service(temperature, vibration, pressure, runtime_hours):
    """
    Predict days until service is needed based on sensor readings.
    Returns prediction, anomaly score, and status indicator.
    """
    if not os.path.exists(MODEL_PATH):
        return {
            'days_until_service': None,
            'status': 'model_not_trained',
            'anomaly_score': None
        }
    
    model = joblib.load(MODEL_PATH)
    X = np.array([[temperature, vibration, pressure, runtime_hours]])
    prediction = model.predict(X)[0]
    
    # Get anomaly score
    anomaly_model = joblib.load(ANOMALY_PATH)
    anomaly_score = anomaly_model.decision_function(X)[0]
    
    # Determine status based on predicted days
    if prediction <= 7 or anomaly_score < -0.2:
        status = 'red'
    elif prediction <= 30:
        status = 'yellow'
    else:
        status = 'green'
    
    return {
        'days_until_service': round(prediction, 2),
        'status': status,
        'anomaly_score': round(anomaly_score, 4)
    }
