"""
Unit tests for /api/machines/ endpoints.

Covers:
  GET    /health
  GET    /api/machines/                  – list active machines
  POST   /api/machines/                  – create machine
  GET    /api/machines/{id}              – get single machine
  DELETE /api/machines/{id}              – soft delete
  GET    /api/machines/deleted           – list soft-deleted machines
  POST   /api/machines/{id}/restore      – restore soft-deleted machine
  DELETE /api/machines/{id}/permanent    – permanent delete
  GET    /api/machines/{id}/logs         – machine logs
  POST   /api/machines/logs              – add log via machines router
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


def test_soft_deleted_machines_excluded_from_active_list(client):
    """Soft-deleted machines must NOT appear in GET /api/machines/."""
    m = _create_machine(client, name="Ghost Machine")
    client.delete(f"/api/machines/{m['id']}")
    res = client.get("/api/machines/")
    names = [x["name"] for x in res.json()]
    assert "Ghost Machine" not in names


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
# DELETE /api/machines/{id}  (soft delete)
# ---------------------------------------------------------------------------

def test_soft_delete_returns_200_with_message(client):
    m = _create_machine(client, name="Soft Delete Target")
    res = client.delete(f"/api/machines/{m['id']}")
    assert res.status_code == 200
    data = res.json()
    assert "soft-deleted" in data["message"].lower() or "deleted" in data["message"].lower()
    assert "deleted_at" in data


def test_soft_delete_machine_no_longer_accessible(client):
    """GET /{id} must 404 after a soft delete."""
    m = _create_machine(client, name="Disappearing Machine")
    client.delete(f"/api/machines/{m['id']}")
    res = client.get(f"/api/machines/{m['id']}")
    assert res.status_code == 404


def test_soft_delete_nonexistent_machine_returns_404(client):
    res = client.delete("/api/machines/99999")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/machines/deleted
# ---------------------------------------------------------------------------

def test_get_deleted_machines_initially_empty(client):
    res = client.get("/api/machines/deleted")
    assert res.status_code == 200
    assert res.json() == []


def test_soft_deleted_machine_appears_in_deleted_list(client):
    m = _create_machine(client, name="In Deleted List")
    client.delete(f"/api/machines/{m['id']}")
    res = client.get("/api/machines/deleted")
    assert res.status_code == 200
    deleted_ids = [x["id"] for x in res.json()]
    assert m["id"] in deleted_ids


def test_active_machines_not_in_deleted_list(client):
    m = _create_machine(client, name="Active Machine")
    res = client.get("/api/machines/deleted")
    ids = [x["id"] for x in res.json()]
    assert m["id"] not in ids


# ---------------------------------------------------------------------------
# POST /api/machines/{id}/restore
# ---------------------------------------------------------------------------

def test_restore_machine_comes_back_to_active_list(client):
    m = _create_machine(client, name="Restore Me")
    client.delete(f"/api/machines/{m['id']}")

    # Verify it's gone from active list
    active = [x["id"] for x in client.get("/api/machines/").json()]
    assert m["id"] not in active

    # Restore it
    res = client.post(f"/api/machines/{m['id']}/restore")
    assert res.status_code == 200

    # Verify it's back in the active list
    active = [x["id"] for x in client.get("/api/machines/").json()]
    assert m["id"] in active


def test_restore_machine_leaves_deleted_list(client):
    m = _create_machine(client, name="Restore Remove From Deleted")
    client.delete(f"/api/machines/{m['id']}")
    client.post(f"/api/machines/{m['id']}/restore")

    deleted_ids = [x["id"] for x in client.get("/api/machines/deleted").json()]
    assert m["id"] not in deleted_ids


def test_restore_nonexistent_machine_returns_404(client):
    res = client.post("/api/machines/99999/restore")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/machines/{id}/permanent
# ---------------------------------------------------------------------------

def test_permanent_delete_removes_machine_entirely(client):
    m = _create_machine(client, name="Permanent Delete Target")
    client.delete(f"/api/machines/{m['id']}")          # soft-delete first
    res = client.delete(f"/api/machines/{m['id']}/permanent")
    assert res.status_code == 200
    assert "deleted" in res.json()["message"].lower()

    # Must not appear in deleted list
    deleted_ids = [x["id"] for x in client.get("/api/machines/deleted").json()]
    assert m["id"] not in deleted_ids


def test_permanent_delete_machine_cannot_be_restored(client):
    m = _create_machine(client, name="Forever Gone")
    client.delete(f"/api/machines/{m['id']}/permanent")
    res = client.post(f"/api/machines/{m['id']}/restore")
    assert res.status_code == 404


def test_permanent_delete_nonexistent_returns_404(client):
    res = client.delete("/api/machines/99999/permanent")
    assert res.status_code == 404


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
