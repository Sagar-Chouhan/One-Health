from fastapi.testclient import TestClient
from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id


def test_get_all_success_stories():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/success-stories/all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_story_by_id_invalid_id():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        # ID <= 0 returns 422
        resp = client.get("/api/success-stories/0")
        assert resp.status_code == 422

        # Non-integer returns 422
        resp = client.get("/api/success-stories/invalid")
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_story_by_id_not_found():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/success-stories/9999999")
        assert resp.status_code == 404
        assert resp.json()["detail"]["code"] == "STORY_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)
