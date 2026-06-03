"""
Unit tests for /api/machines/ endpoints.

Covers:
  GET  /health
  GET  /api/machines/
  POST /api/machines/
  GET  /api/machines/{id}
  GET  /api/machines/{id}/logs
  POST /api/machines/logs   (add log via machines router)
"""

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

MACHINE_PAYLOAD = {
    "name": "Test Compressor",
    "machine_type": "Compressor",
    "location": "Plant A",
}


def _create_machine(client, **overrides):
    payload = {**MACHINE_PAYLOAD, **overrides}
    res = client.post("/api/machines/", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /api/machines/
# ---------------------------------------------------------------------------

def test_get_machines_returns_list_when_empty(client):
    res = client.get("/api/machines/")
    assert res.status_code == 200
    assert res.json() == []


def test_get_machines_returns_created_machines(client):
    _create_machine(client, name="Pump A")
    _create_machine(client, name="Pump B")
    res = client.get("/api/machines/")
    assert res.status_code == 200
    names = [m["name"] for m in res.json()]
    assert "Pump A" in names
    assert "Pump B" in names


# ---------------------------------------------------------------------------
# POST /api/machines/
# ---------------------------------------------------------------------------

def test_create_machine_returns_correct_fields(client):
    data = _create_machine(client)
    assert data["name"] == MACHINE_PAYLOAD["name"]
    assert data["machine_type"] == MACHINE_PAYLOAD["machine_type"]
    assert data["location"] == MACHINE_PAYLOAD["location"]
    assert data["status"] == "green"          # default status
    assert "id" in data


def test_create_machine_assigns_unique_ids(client):
    m1 = _create_machine(client, name="Machine X")
    m2 = _create_machine(client, name="Machine Y")
    assert m1["id"] != m2["id"]


# ---------------------------------------------------------------------------
# GET /api/machines/{id}
# ---------------------------------------------------------------------------

def test_get_machine_by_id(client):
    created = _create_machine(client)
    res = client.get(f"/api/machines/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]
    assert res.json()["name"] == created["name"]


def test_get_machine_not_found_returns_404(client):
    res = client.get("/api/machines/99999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# GET /api/machines/{id}/logs
# ---------------------------------------------------------------------------

def test_get_machine_logs_empty_by_default(client):
    machine = _create_machine(client)
    res = client.get(f"/api/machines/{machine['id']}/logs")
    assert res.status_code == 200
    assert res.json() == []


def test_get_machine_logs_after_adding_log(client):
    machine = _create_machine(client)
    client.post("/api/machines/logs", json={
        "machine_id": machine["id"],
        "description": "Replaced belt",
        "technician": "Alice",
        "cost": 250.0,
    })
    res = client.get(f"/api/machines/{machine['id']}/logs")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["description"] == "Replaced belt"


# ---------------------------------------------------------------------------
# POST /api/machines/logs
# ---------------------------------------------------------------------------

def test_add_log_via_machines_router(client):
    machine = _create_machine(client)
    res = client.post("/api/machines/logs", json={
        "machine_id": machine["id"],
        "description": "Oil change",
        "technician": "Bob",
        "cost": 120.0,
    })
    assert res.status_code == 200
    log = res.json()
    assert log["description"] == "Oil change"
    assert log["technician"] == "Bob"
    assert log["cost"] == 120.0
    assert log["machine_id"] == machine["id"]
