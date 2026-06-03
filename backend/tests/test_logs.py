"""
Unit tests for /api/logs/ endpoints.

Covers:
  GET    /api/logs/
  GET    /api/logs/{id}
  POST   /api/logs/
  DELETE /api/logs/{id}
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_machine(client):
    res = client.post("/api/machines/", json={
        "name": "Log-Test Machine",
        "machine_type": "Pump",
        "location": "Zone D",
    })
    assert res.status_code == 200
    return res.json()


def _create_log(client, machine_id, **overrides):
    payload = {
        "machine_id": machine_id,
        "description": "Routine inspection",
        "technician": "Charlie",
        "cost": 75.0,
        **overrides,
    }
    res = client.post("/api/logs/", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


# ---------------------------------------------------------------------------
# GET /api/logs/
# ---------------------------------------------------------------------------

def test_get_all_logs_empty(client):
    res = client.get("/api/logs/")
    assert res.status_code == 200
    assert res.json() == []


def test_get_all_logs_returns_created_logs(client):
    machine = _create_machine(client)
    _create_log(client, machine["id"], description="Filter change")
    _create_log(client, machine["id"], description="Belt replacement")

    res = client.get("/api/logs/")
    assert res.status_code == 200
    descriptions = [l["description"] for l in res.json()]
    assert "Filter change" in descriptions
    assert "Belt replacement" in descriptions


# ---------------------------------------------------------------------------
# POST /api/logs/
# ---------------------------------------------------------------------------

def test_create_log_returns_correct_fields(client):
    machine = _create_machine(client)
    log = _create_log(client, machine["id"], description="Gasket replaced", cost=310.5)
    assert log["description"] == "Gasket replaced"
    assert log["cost"] == 310.5
    assert log["machine_id"] == machine["id"]
    assert "id" in log


def test_create_log_assigns_unique_ids(client):
    machine = _create_machine(client)
    l1 = _create_log(client, machine["id"])
    l2 = _create_log(client, machine["id"])
    assert l1["id"] != l2["id"]


# ---------------------------------------------------------------------------
# GET /api/logs/{id}
# ---------------------------------------------------------------------------

def test_get_log_by_id(client):
    machine = _create_machine(client)
    created = _create_log(client, machine["id"], description="Bearing replacement")
    res = client.get(f"/api/logs/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]
    assert res.json()["description"] == "Bearing replacement"


def test_get_log_not_found_returns_404(client):
    res = client.get("/api/logs/99999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# DELETE /api/logs/{id}
# ---------------------------------------------------------------------------

def test_delete_log_success(client):
    machine = _create_machine(client)
    log = _create_log(client, machine["id"])
    log_id = log["id"]

    res = client.delete(f"/api/logs/{log_id}")
    assert res.status_code == 200
    assert "deleted" in res.json()["message"].lower()


def test_delete_log_is_actually_removed(client):
    machine = _create_machine(client)
    log = _create_log(client, machine["id"])
    log_id = log["id"]

    client.delete(f"/api/logs/{log_id}")
    res = client.get(f"/api/logs/{log_id}")
    assert res.status_code == 404


def test_delete_log_not_found_returns_404(client):
    res = client.delete("/api/logs/99999")
    assert res.status_code == 404
