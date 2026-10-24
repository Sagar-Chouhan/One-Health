from fastapi.testclient import TestClient
from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id


def test_awareness_duplicate_list_endpoint_removed():
    client = TestClient(app)
    # The duplicate GET /api/awareness-activities was removed in favor of /all and /{id}
    resp = client.get("/api/awareness-activities")
    # Should not match any GET "" route (returns 404 or 405)
    assert resp.status_code in (404, 405)


def test_get_awareness_by_id_invalid_id():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        # ID <= 0 returns 422
        resp = client.get("/api/awareness-activities/0")
        assert resp.status_code == 422

        # Non-integer returns 422
        resp = client.get("/api/awareness-activities/invalid")
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_awareness_by_id_not_found():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/awareness-activities/9999999")
        assert resp.status_code == 404
        assert resp.json()["detail"]["code"] == "AWARENESS_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_all_awareness_activities():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/awareness-activities/all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)
