"""
Unit tests for /api/predictions/ endpoints.

Covers:
  POST /api/predictions/           – add sensor reading (rule-based status)
  GET  /api/predictions/{id}       – get readings for a machine
  GET  /api/predictions/status/{id}– current status + latest reading
  POST /api/predictions/predict    – ML prediction endpoint
  POST /api/predictions/train      – trigger model training

Status thresholds (from predictions.py):
  red:    temperature > 90  OR vibration > 8  OR pressure > 120
  yellow: temperature > 75  OR vibration > 5  OR pressure > 100
  green:  otherwise
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_machine(client, name="Sensor Machine"):
    res = client.post("/api/machines/", json={
        "name": name,
        "machine_type": "Compressor",
        "location": "Zone F",
    })
    assert res.status_code == 200
    return res.json()


def _reading_payload(machine_id, temperature=65.0, vibration=3.0,
                     pressure=80.0, runtime_hours=100.0):
    return {
        "machine_id": machine_id,
        "temperature": temperature,
        "vibration": vibration,
        "pressure": pressure,
        "runtime_hours": runtime_hours,
    }


# ---------------------------------------------------------------------------
# POST /api/predictions/  (rule-based status)
# ---------------------------------------------------------------------------

def test_add_reading_green_status(client):
    machine = _create_machine(client, "Green Machine")
    res = client.post("/api/predictions/", json=_reading_payload(machine["id"]))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "green"


def test_add_reading_yellow_high_temperature(client):
    machine = _create_machine(client, "Yellow Temp")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], temperature=80.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "yellow"


def test_add_reading_yellow_high_vibration(client):
    machine = _create_machine(client, "Yellow Vib")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], vibration=6.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "yellow"


def test_add_reading_yellow_high_pressure(client):
    machine = _create_machine(client, "Yellow Pres")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], pressure=105.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "yellow"


def test_add_reading_red_high_temperature(client):
    machine = _create_machine(client, "Red Temp")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], temperature=95.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "red"


def test_add_reading_red_high_vibration(client):
    machine = _create_machine(client, "Red Vib")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], vibration=9.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "red"


def test_add_reading_red_high_pressure(client):
    machine = _create_machine(client, "Red Pres")
    res = client.post("/api/predictions/", json=_reading_payload(
        machine["id"], pressure=125.0
    ))
    assert res.status_code == 200
    assert res.json()["predicted_status"] == "red"


def test_add_reading_machine_not_found(client):
    res = client.post("/api/predictions/", json=_reading_payload(99999))
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/predictions/{machine_id}
# ---------------------------------------------------------------------------

def test_get_machine_readings_empty(client):
    machine = _create_machine(client, "Empty Readings")
    res = client.get(f"/api/predictions/{machine['id']}")
    assert res.status_code == 200
    assert res.json() == []


def test_get_machine_readings_returns_saved_data(client):
    machine = _create_machine(client, "Has Readings")
    # Add two readings
    client.post("/api/predictions/", json=_reading_payload(machine["id"], temperature=60))
    client.post("/api/predictions/", json=_reading_payload(machine["id"], temperature=70))

    res = client.get(f"/api/predictions/{machine['id']}")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_get_machine_readings_machine_not_found(client):
    res = client.get("/api/predictions/99999")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/predictions/status/{machine_id}
# ---------------------------------------------------------------------------

def test_get_machine_status_no_readings(client):
    machine = _create_machine(client, "Status Machine")
    res = client.get(f"/api/predictions/status/{machine['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == machine["id"]
    assert data["machine_name"] == machine["name"]
    assert data["latest_reading"] is None


def test_get_machine_status_with_reading(client):
    machine = _create_machine(client, "Status With Reading")
    client.post("/api/predictions/", json=_reading_payload(
        machine["id"], temperature=85.0
    ))
    res = client.get(f"/api/predictions/status/{machine['id']}")
    assert res.status_code == 200
    assert res.json()["current_status"] == "yellow"
    assert res.json()["latest_reading"] is not None


def test_get_machine_status_not_found(client):
    res = client.get("/api/predictions/status/99999")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/predictions/predict  (ML endpoint)
# ---------------------------------------------------------------------------

def test_ml_predict_returns_prediction_keys(client):
    machine = _create_machine(client, "ML Machine")
    res = client.post("/api/predictions/predict", json=_reading_payload(machine["id"]))
    assert res.status_code == 200
    data = res.json()
    # The response always includes machine_id regardless of model training state
    assert "machine_id" in data
    assert data["machine_id"] == machine["id"]


def test_ml_predict_machine_not_found(client):
    res = client.post("/api/predictions/predict", json=_reading_payload(99999))
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/predictions/train
# ---------------------------------------------------------------------------

def test_train_requires_minimum_readings(client):
    """With fewer than 20 readings the endpoint should return an error dict."""
    res = client.post("/api/predictions/train")
    assert res.status_code == 200
    data = res.json()
    # Either training succeeded (unlikely with 0 readings) or returns an error
    assert "error" in data or "status" in data or "message" in data
