from fastapi.testclient import TestClient
from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id


def test_get_referral_by_id_invalid_id():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        # ID <= 0 returns 422
        resp = client.get("/api/referrals/0")
        assert resp.status_code == 422

        # Non-integer returns 422
        resp = client.get("/api/referrals/abc")
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_referral_by_id_not_found(monkeypatch):
    from app.modules.referrals import service

    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/referrals/9999999")
        assert resp.status_code == 404
        assert resp.json()["detail"]["code"] == "REFERRAL_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_referral_by_id_unauthorized_user():
    # Volunteer 45 trying to access referral 4 which belongs to volunteer 23
    app.dependency_overrides[get_current_volunteer_id] = lambda: 45
    try:
        client = TestClient(app)
        resp = client.get("/api/referrals/4")
        assert resp.status_code == 403
        assert resp.json()["detail"]["code"] == "FORBIDDEN"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_referral_by_id_success():
    # Volunteer 23 owns referral 4
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/referrals/4")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["referral_id"] == 4
        assert data["data"]["volunteer_id"] == 23
        assert data["data"]["referral_code"] == "REF-26-0001"
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_get_all_referrals_records():
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        client = TestClient(app)
        resp = client.get("/api/referrals/all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1
        assert data["data"][0]["volunteer_id"] == 23
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_referrals_duplicate_list_endpoint_removed():
    client = TestClient(app)
    # The duplicate GET /api/referrals was removed in favor of /all and /{id}
    resp = client.get("/api/referrals")
    assert resp.status_code in (404, 405)


def test_validation_error_with_file_upload_returns_422_json():
    # Verify that validation errors containing UploadFile do not crash with 500 TypeError
    client = TestClient(app)
    files = [
        ("photos", ("test.png", b"fake image bytes", "image/png")),
        ("videos", ("test.mp4", b"fake video bytes", "video/mp4")),
    ]
    # Omit required fields so validation error is triggered
    data = {
        "is_followed_up": "true",
    }
    resp = client.post("/api/referrals", data=data, files=files)
    assert resp.status_code == 422
    err_json = resp.json()
    assert "detail" in err_json
    assert isinstance(err_json["detail"], list)


def test_referral_create_schema_accepts_followup_and_videos():
    from app.modules.referrals.schema import ReferralCreate
    from datetime import date
    payload = {
        "volunteer_id": 23,
        "village_lgd_code": 100,
        "referral_stream": "HUMAN",
        "referral_facility_id": 1,
        "event_date": date.today(),
        "referral_date": date.today(),
        "reason": "Checkup",
        "gps_unavailable_reason": "No GPS",
        "is_followed_up": "true",
    }
    obj = ReferralCreate.model_validate(payload)
    assert obj.is_followed_up is True
    assert obj.videos == []

