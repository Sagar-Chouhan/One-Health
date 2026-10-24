from fastapi.testclient import TestClient

from app.database.session import get_db
from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.events import service


def test_get_event_reports_is_scoped_to_current_volunteer(monkeypatch):
    calls = []

    def fake_list(db, volunteer_id, *, limit, offset):
        calls.append((volunteer_id, limit, offset))
        return []

    monkeypatch.setattr(service, "list_event_reports", fake_list)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[get_current_volunteer_id] = lambda: 45
    try:
        response = TestClient(app).get("/api/events?limit=10&offset=20")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []
    assert calls == [(45, 10, 20)]


def test_get_event_reports_rejects_invalid_pagination():
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[get_current_volunteer_id] = lambda: 45
    try:
        response = TestClient(app).get("/api/events?limit=101")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
