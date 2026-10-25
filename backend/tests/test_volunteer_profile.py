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

    # Test canonical route with volunteer code
    resp1 = client.get("/api/volunteers/login-history?volunteer_id=COHV-26-0017")
    assert resp1.status_code == 200
    assert resp1.json()["success"] is True
    assert len(resp1.json()["data"]) == 1
    assert resp1.json()["data"][0]["volunteer_code"] == "COHV-26-0017"

    # Test canonical route with integer volunteer ID
    resp2 = client.get("/api/volunteers/login-history?volunteer_id=101")
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True
    assert len(resp2.json()["data"]) == 1

    # Verify singular route used by Flutter mobile app succeeds
    resp_sing = client.get("/api/volunteer/login-history?volunteer_id=COHV-26-0017")
    assert resp_sing.status_code == 200
    assert resp_sing.json()["success"] is True
    assert len(resp_sing.json()["data"]) == 1
    assert resp_sing.json()["data"][0]["volunteer_code"] == "COHV-26-0017"

    resp_sing_int = client.get("/api/volunteer/login-history?volunteer_id=101")
    assert resp_sing_int.status_code == 200
    assert resp_sing_int.json()["success"] is True


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

    # Edit by query param volunteer_id on canonical /api/volunteers/profile
    resp_prof = client.put("/api/volunteers/profile?volunteer_id=101", json={"volunteer_name": "Sita Sharma"})
    assert resp_prof.status_code == 200
    assert resp_prof.json()["volunteer_name"] == "Sita Sharma"

    # Verify singular route succeeds for mobile app compatibility
    resp_sing = client.put("/api/volunteer/profile?volunteer_id=101", json={"volunteer_name": "Sita Sharma"})
    assert resp_sing.status_code == 200
    assert resp_sing.json()["volunteer_name"] == "Sita Sharma"


def test_edit_volunteer_profile_multipart(monkeypatch):
    from app.modules.volunteers import service

    captured = {}
    def mock_edit(db, volunteer_id, data, photo=None):
        captured["volunteer_id"] = volunteer_id
        captured["data"] = data
        captured["photo"] = photo
        return {**SAMPLE_PROFILE, **data, "volunteer_id": volunteer_id}

    monkeypatch.setattr(service, "edit_volunteer_profile", mock_edit)

    client = TestClient(app)
    # Form data sent by Flutter Dart client:
    form_data = {
        "volunteer_name": "Sudha Yadav",
        "gender": "Female",
        "date_of_birth": "2001-10-15",
        "mobile_no": "9632147805",
        "email": "sudha123@gmail.com",
        "institution_type_id": "3",
        "institution_name": "PHC",
        "education_id": "1",
        "profession_id": "1",
        "state_lgd_code": "36",
        "district_lgd_code": "694",
        "block_lgd_code": "5208",
        "gram_panchayat_lgd_code": "9000002",
        "village_lgd_code": "90000004",
    }
    resp = client.put("/api/volunteers/51", data=form_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["message"] == "Volunteer profile updated successfully"
    assert data["volunteer_id"] == 51
    assert data["volunteer_name"] == "Sudha Yadav"
    assert "data" in data and isinstance(data["data"], dict)
    assert data["data"]["volunteer_id"] == 51
    assert data["data"]["volunteer_name"] == "Sudha Yadav"
    assert data["data"]["gender"] == "FEMALE"
    assert captured["volunteer_id"] == 51
    assert captured["data"]["volunteer_name"] == "Sudha Yadav"
    assert captured["data"]["gender"] == "FEMALE"
    assert captured["data"]["institution_type_id"] == 3
    assert captured["data"]["district_lgd_code"] == 694


def test_volunteer_summary_endpoints(monkeypatch):
    from app.modules.volunteers import service

    mock_summary = {
        "volunteer_id": 101,
        "volunteer_code": "COHV-26-0017",
        "volunteer_name": "Sita Devi",
        "total_visits": 24,
        "alerts_generated": 2,
        "open_alerts": 1,
        "referrals": 16,
        "referrals_followup": 7,
        "pending_follow_ups": 7,
        "pending_followups": 7,
        "awareness": 6,
        "awareness_activities": 6,
        "trainings_imparted": 0,
        "trainings_attended": 0,
        "meetings": 0,
        "samples": 0,
        "samples_supported": 0,
        "success_stories": 0,
    }
    monkeypatch.setattr(
        service,
        "get_volunteer_summary",
        lambda db, volunteer_id=None, volunteer_code=None: mock_summary,
    )

    client = TestClient(app)

    # 1. Query by volunteer code on /api/volunteers/summary
    res1 = client.get("/api/volunteers/summary?volunteer_id=COHV-26-0017")
    assert res1.status_code == 200
    assert res1.json()["data"]["total_visits"] == 24
    assert res1.json()["data"]["referrals"] == 16
    assert res1.json()["data"]["pending_follow_ups"] == 7
    assert "total_visits" not in res1.json()

    # 2. Query by volunteer code on singular /api/volunteer/summary (Mobile App)
    res2 = client.get("/api/volunteer/summary?volunteer_id=COHV-26-0017")
    assert res2.status_code == 200
    assert res2.json()["data"]["total_visits"] == 24
    assert res2.json()["data"]["awareness"] == 6
    assert "total_visits" not in res2.json()

    # 3. Path ID on /api/volunteers/101/summary
    res3 = client.get("/api/volunteers/101/summary")
    assert res3.status_code == 200
    assert res3.json()["data"]["volunteer_id"] == 101

    # 4. Path ID on singular /api/volunteer/101/summary
    res4 = client.get("/api/volunteer/101/summary")
    assert res4.status_code == 200
    assert res4.json()["data"]["volunteer_id"] == 101

    # 5. Subpath ID on /api/volunteers/summary/101 (used by mobile app)
    res5 = client.get("/api/volunteers/summary/101")
    assert res5.status_code == 200
    assert res5.json()["data"]["volunteer_id"] == 101

    # 6. Subpath ID on singular /api/volunteer/summary/101 (Mobile App)
    res6 = client.get("/api/volunteer/summary/101")
    assert res6.status_code == 200
    assert res6.json()["data"]["volunteer_id"] == 101

    # 7. Unauthenticated request without volunteer_id returns 401 Unauthorized
    res_unauth = client.get("/api/volunteers/summary")
    assert res_unauth.status_code == 401
    assert "Authentication required" in res_unauth.json()["detail"]


def test_auth_login_with_identifier(monkeypatch):
    from app.modules.auth import service

    mock_resp = {
        "access_token": "mock-token-xyz",
        "token": "mock-token-xyz",
        "token_type": "bearer",
        "expires_in": 3600,
        "volunteer": {
            "volunteer_id": 50,
            "volunteer_code": "COHV-26-0050",
            "volunteer_name": "Test Volunteer",
            "mobile_no": "9568452369",
            "email": "test@example.com",
            "status": "ACTIVE",
        },
    }
    monkeypatch.setattr(service, "login", lambda db, data, ip_address=None, user_agent=None: mock_resp)

    client = TestClient(app)
    # Flutter app sends identifier and pin
    resp = client.post("/api/auth/login", json={"identifier": "9568452369", "pin": "1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"] == "mock-token-xyz"
    assert data["token"] == "mock-token-xyz"
    assert data["volunteer"]["volunteer_id"] == 50




