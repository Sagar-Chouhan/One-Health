from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id


SAMPLE_PROFILE = {
    "volunteer_id": 101,
    "volunteer_code": "COHV-26-0101",
    "volunteer_name": "Sita Devi",
    "gender": "FEMALE",
    "date_of_birth": "1992-04-10",
    "mobile_no": "9876543210",
    "email": "sita@example.com",
    "department_id": 1,
    "department_name": "Public Health Department",
    "cohv_type": "Public Health Department",
    "institution_type_id": 1,
    "institution_type_name": "PHC",
    "institution_name": "PHC Amrabad",
    "other_institution_name": None,
    "state_lgd_code": 36,
    "state_name": "Telangana",
    "district_lgd_code": 694,
    "district_name": "Nagarkurnool",
    "block_lgd_code": 5208,
    "block_name": "Amrabad",
    "gram_panchayat_lgd_code": 9000001,
    "gram_panchayat_name": "Mannanur",
    "village_lgd_code": 90000001,
    "village_name": "Mannanur",
    "date_of_joining": "2026-01-15",
    "education_id": 2,
    "education_name": "Higher Secondary",
    "profession_id": 1,
    "profession_name": "Farmer",
    "supervisor_id": 5,
    "supervisor_name": "Dr. Ramesh Rao",
    "supervisor_mobile": "9876500001",
    "supervisor_email": "ramesh.rao@example.com",
    "photo_path": "volunteers/COHV-26-0101.jpg",
    "status": "ACTIVE",
    "status_remarks": None,
    "approved_by": 5,
    "approved_by_name": "Dr. Ramesh Rao",
    "approved_at": "2026-01-16T10:00:00Z",
    "reg_latitude": 16.5,
    "reg_longitude": 78.8,
    "reg_gps_accuracy_m": 12,
    "reg_gps_unavailable_reason": None,
    "device_id": "DEVICE-101",
    "last_login_at": "2026-01-20T08:30:00Z",
    "created_at": "2026-01-15T12:00:00Z",
    "updated_at": "2026-01-16T10:00:00Z",
}


def test_get_volunteer_by_id_endpoint(monkeypatch):
    from app.modules.volunteers import router

    monkeypatch.setattr(
        router,
        "get_volunteer_profile",
        lambda db, volunteer_id=None, volunteer_code=None: SAMPLE_PROFILE,
    )

    client = TestClient(app)
    response = client.get("/api/volunteers/101")
    assert response.status_code == 200
    data = response.json()
    assert data["volunteer_id"] == 101
    assert data["volunteer_code"] == "COHV-26-0101"
    assert data["volunteer_name"] == "Sita Devi"
    assert data["status"] == "ACTIVE"
    assert data["village_name"] == "Mannanur"
    assert data["supervisor_name"] == "Dr. Ramesh Rao"


def test_get_volunteer_by_id_404(monkeypatch):
    client = TestClient(app)
    response = client.get("/api/volunteers/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Volunteer profile not found."


def test_get_volunteer_profile_by_query_code(monkeypatch):
    from app.modules.volunteers import router

    monkeypatch.setattr(
        router,
        "get_volunteer_profile",
        lambda db, volunteer_id=None, volunteer_code=None: SAMPLE_PROFILE,
    )

    client = TestClient(app)
    response = client.get("/api/volunteers/profile?volunteer_code=COHV-26-0101")
    assert response.status_code == 200
    assert response.json()["volunteer_code"] == "COHV-26-0101"


def test_get_volunteer_profile_missing_params():
    client = TestClient(app)
    response = client.get("/api/volunteers/profile")
    assert response.status_code == 400
    assert "Please provide a volunteer_id, volunteer_code, or sign in." in response.json()["detail"]


def test_get_volunteer_profile_me_endpoint(monkeypatch):
    from app.modules.volunteers import router

    app.dependency_overrides[get_current_volunteer_id] = lambda: 101
    try:
        monkeypatch.setattr(
            router,
            "get_volunteer_profile",
            lambda db, volunteer_id=None, volunteer_code=None: SAMPLE_PROFILE,
        )

        client = TestClient(app)
        response = client.get("/api/volunteers/me")
        assert response.status_code == 200
        assert response.json()["volunteer_id"] == 101
        assert response.json()["volunteer_name"] == "Sita Devi"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_login_history_endpoints(monkeypatch):
    from app.modules.volunteers import service

    mock_history = [
        {
            "login_id": 1,
            "volunteer_id": 101,
            "volunteer_code": "COHV-26-0017",
            "login_at": "2026-10-24T10:00:00",
            "login_method": "PASSWORD",
            "is_success": True,
            "device_id": "device-123",
            "ip_address": "192.168.10.76",
            "user_agent": "Mozilla/5.0",
        }
    ]
    monkeypatch.setattr(
        service,
        "get_login_history",
        lambda db, volunteer_id=None, volunteer_code=None, limit=50: mock_history,
    )

    client = TestClient(app)

    # Test singular route with volunteer code (client request in user prompt)
    resp1 = client.get("/api/volunteer/login-history?volunteer_id=COHV-26-0017")
    assert resp1.status_code == 200
    assert resp1.json()["success"] is True
    assert len(resp1.json()["data"]) == 1
    assert resp1.json()["data"][0]["volunteer_code"] == "COHV-26-0017"

    # Test plural route with integer volunteer ID
    resp2 = client.get("/api/volunteers/login-history?volunteer_id=101")
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True
    assert len(resp2.json()["data"]) == 1


def test_edit_volunteer_profile_endpoint(monkeypatch):
    from app.modules.volunteers import service

    updated = {**SAMPLE_PROFILE, "volunteer_name": "Sita Sharma"}
    monkeypatch.setattr(
        service,
        "edit_volunteer_profile",
        lambda db, volunteer_id, data, photo=None: updated,
    )

    client = TestClient(app)
    # Edit by ID
    resp = client.put("/api/volunteers/101", json={"volunteer_name": "Sita Sharma"})
    assert resp.status_code == 200
    assert resp.json()["volunteer_name"] == "Sita Sharma"

    # Singular route edit by query param volunteer_id
    resp_sing = client.put("/api/volunteer/profile?volunteer_id=101", json={"volunteer_name": "Sita Sharma"})
    assert resp_sing.status_code == 200
    assert resp_sing.json()["volunteer_name"] == "Sita Sharma"

