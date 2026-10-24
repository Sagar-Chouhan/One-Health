from fastapi.testclient import TestClient
from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id


def test_get_event_reports_all():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        response = client.get("/api/events/all")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
    finally:
        app.dependency_overrides.clear()


def test_get_event_report_by_id_invalid_id():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        # ID <= 0 returns 422
        response = client.get("/api/events/0")
        assert response.status_code == 422

        # Non-integer returns 422
        response = client.get("/api/events/abc")
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_get_event_report_by_id_not_found():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        response = client.get("/api/events/9999999")
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "EVENT_REPORT_NOT_FOUND"
    finally:
        app.dependency_overrides.clear()
