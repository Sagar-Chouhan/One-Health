import pytest
from app.modules.volunteers.schemas import (
    VolunteerRegistrationForm,
    VolunteerRegistrationRequest,
)


def test_volunteer_registration_request_accepts_department_name():
    req = VolunteerRegistrationRequest(
        volunteer_name="Ramesh Kumar",
        gender="Male",
        date_of_birth="1995-05-15",
        mobile_no="9876543210",
        email="ramesh@example.com",
        department_name="Public Health Department",
        state_lgd_code=36,
        district_lgd_code=694,
        block_lgd_code=5208,
        gram_panchayat_lgd_code=9000002,
        village_lgd_code=90000004,
        date_of_joining="2026-01-01",
        education_id=1,
        profession_id=1,
        pin="1234",
    )
    assert req.department_name == "Public Health Department"
    assert req.cohv_type == "Public Health Department"
    assert req.department_id == 1


def test_volunteer_registration_request_accepts_legacy_cohv_type():
    req = VolunteerRegistrationRequest(
        volunteer_name="Ramesh Kumar",
        gender="Male",
        date_of_birth="1995-05-15",
        mobile_no="9876543210",
        email="ramesh@example.com",
        cohv_type="Public Health",
        state_lgd_code=36,
        district_lgd_code=694,
        block_lgd_code=5208,
        gram_panchayat_lgd_code=9000002,
        village_lgd_code=90000004,
        date_of_joining="2026-01-01",
        education_id=1,
        profession_id=1,
        pin="1234",
    )
    assert req.department_name == "Public Health Department"
    assert req.cohv_type == "Public Health Department"
    assert req.department_id == 1


def test_volunteer_registration_request_parses_dd_mm_yyyy_dates():
    req = VolunteerRegistrationRequest(
        volunteer_name="Ramesh Kumar",
        gender="Male",
        date_of_birth="15/05/1995",
        mobile_no="9876543210",
        email="ramesh@example.com",
        department_name="Public Health Department",
        state_lgd_code=36,
        district_lgd_code=694,
        block_lgd_code=5208,
        gram_panchayat_lgd_code=9000002,
        village_lgd_code=90000004,
        date_of_joining="01-01-2026",
        education_id=1,
        profession_id=1,
        pin="1234",
    )
    assert str(req.date_of_birth) == "1995-05-15"
    assert str(req.date_of_joining) == "2026-01-01"


def test_volunteer_registration_handles_empty_and_zero_optional_fields():
    data = {
        "volunteer_name": "Ramesh Kumar",
        "gender": "male",
        "date_of_birth": "1995-05-15",
        "mobile_no": "9876543210",
        "email": "ramesh@example.com",
        "department_name": "Public Health Department",
        "state_lgd_code": 36,
        "district_lgd_code": 694,
        "block_lgd_code": 5208,
        "gram_panchayat_lgd_code": 9000002,
        "village_lgd_code": 90000004,
        "date_of_joining": "2026-01-01",
        "education_id": 1,
        "profession_id": 1,
        "pin": "1234",
        "confirm_pin": "1234",
        "supervisor_id": "0",
        "institution_type_id": "",
        "other_institution_name": "null",
        "latitude": "",
        "longitude": "",
    }
    req = VolunteerRegistrationRequest(**data)
    assert req.supervisor_id is None
    assert req.institution_type_id is None
    assert req.other_institution_name is None
    assert req.latitude is None
    assert req.longitude is None


def test_preview_id_endpoint_with_cohv_type(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database.session import get_db
    from app.modules.volunteers import router as v_router

    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(v_router, "preview_volunteer_code", lambda db, data: "COHV-26-9999")

    client = TestClient(app)
    form_data = {
        "volunteer_name": "Ramesh Kumar",
        "gender": "male",
        "date_of_birth": "1995-05-15",
        "mobile_no": "9876543210",
        "email": "ramesh@example.com",
        "cohv_type": "Public Health",
        "state_lgd_code": 36,
        "district_lgd_code": 694,
        "block_lgd_code": 5208,
        "gram_panchayat_lgd_code": 9000002,
        "village_lgd_code": 90000004,
        "date_of_joining": "2026-01-01",
        "education_id": 1,
        "profession_id": 1,
        "pin": "1234",
    }
    response = client.post("/api/volunteers/preview-id", data=form_data)
    assert response.status_code == 200
    assert response.json()["volunteer_code_preview"] == "COHV-26-9999"


def test_preview_id_endpoint_with_department_name(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database.session import get_db
    from app.modules.volunteers import router as v_router

    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(v_router, "preview_volunteer_code", lambda db, data: "COHV-26-9999")

    client = TestClient(app)
    form_data = {
        "volunteer_name": "Ramesh Kumar",
        "gender": "male",
        "date_of_birth": "1995-05-15",
        "mobile_no": "9876543210",
        "email": "ramesh@example.com",
        "department_name": "Public Health Department",
        "state_lgd_code": 36,
        "district_lgd_code": 694,
        "block_lgd_code": 5208,
        "gram_panchayat_lgd_code": 9000002,
        "village_lgd_code": 90000004,
        "date_of_joining": "2026-01-01",
        "education_id": 1,
        "profession_id": 1,
        "pin": "1234",
    }
    response = client.post("/api/volunteers/preview-id", data=form_data)
    assert response.status_code == 200
    assert response.json()["volunteer_code_preview"] == "COHV-26-9999"

