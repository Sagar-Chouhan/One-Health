from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import get_db
from app.modules.departments import repository, service
from app.modules.volunteers import service as volunteer_service


class FakeDb:
    pass


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: FakeDb()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_get_departments(client, monkeypatch):
    monkeypatch.setattr(
        service,
        "list_departments",
        lambda db: [
            {"department_id": 1, "department_name": "Public Health Department"}
        ],
    )

    response = client.get("/api/departments")

    assert response.status_code == 200
    assert response.json() == [
        {"department_id": 1, "department_name": "Public Health Department"}
    ]


def test_unmapped_department_returns_department_name_as_cohv_type(client, monkeypatch):
    monkeypatch.setattr(
        repository,
        "get_active_department",
        lambda db, department_id: {
            "department_id": department_id,
            "department_name": "Rural Department",
        },
    )

    response = client.get("/api/departments/5/cohv-type")

    assert response.status_code == 200
    assert response.json() == {
        "department_id": 5,
        "cohv_type": "Rural Department",
    }


def test_institutions_return_empty_for_valid_department(client, monkeypatch):
    monkeypatch.setattr(
        repository,
        "get_active_department",
        lambda db, department_id: {
            "department_id": department_id,
            "department_name": "Rural Department",
        },
    )
    monkeypatch.setattr(repository, "list_institution_options", lambda db, _: [])

    response = client.get("/api/departments/5/institutions")

    assert response.status_code == 200
    assert response.json() == []


def test_institutions_reject_invalid_department(client, monkeypatch):
    monkeypatch.setattr(repository, "get_active_department", lambda db, _: None)

    response = client.get("/api/departments/999/institutions")

    assert response.status_code == 404
    assert response.json()["detail"] == "Department is invalid or inactive."


def test_registration_rejects_institution_from_another_department(monkeypatch):
    monkeypatch.setattr(
        volunteer_service.departments,
        "get_active_department",
        lambda db, _: {
            "department_id": 1,
            "department_name": "Public Health Department",
        },
    )
    monkeypatch.setattr(
        volunteer_service.departments,
        "get_active_institution",
        lambda db, department_id, institution_type_id: None,
    )
    data = SimpleNamespace(
        department_id=1,
        institution_type_id=15,
        department_name="Public Health Department",
        other_institution_name=None,
    )

    with pytest.raises(HTTPException) as error:
        volunteer_service.validate_department_selection(FakeDb(), data)

    assert error.value.status_code == 422
    assert "does not belong" in error.value.detail


def test_registration_saves_other_institution_name(monkeypatch):
    monkeypatch.setattr(
        volunteer_service,
        "validate_reference_ids",
        lambda db, data: None,
    )
    monkeypatch.setattr(
        volunteer_service,
        "validate_mobile_and_email",
        lambda db, data: None,
    )
    monkeypatch.setattr(volunteer_service, "read_photo", lambda photo: None)
    monkeypatch.setattr(volunteer_service, "hash_pin", lambda pin: "hashed")

    class RegistrationDb:
        def __init__(self):
            self.value = None

        def add(self, value):
            self.value = value

        def flush(self):
            self.value.volunteer_id = 27
            self.value.volunteer_code = "COHV-26-0027"

        def refresh(self, value):
            value.status = "PENDING"

        def commit(self):
            pass

    db = RegistrationDb()
    data = SimpleNamespace(
        volunteer_name="Asha Volunteer",
        gender="FEMALE",
        date_of_birth="1990-01-01",
        mobile_no="9876543210",
        email="asha@example.com",
        department_name="Public Health Department",
        department_id=1,
        institution_type_id=1,
        other_institution_name="Community clinic",
        state_lgd_code=1,
        district_lgd_code=1,
        block_lgd_code=1,
        gram_panchayat_lgd_code=1,
        village_lgd_code=1,
        date_of_joining="2026-01-01",
        education_id=1,
        profession_id=1,
        supervisor_id=None,
        pin="1234",
        latitude=None,
        longitude=None,
        gps_accuracy_m=None,
        gps_unavailable_reason=None,
        device_id=None,
    )
    monkeypatch.setattr(
        volunteer_service,
        "validate_department_selection",
        lambda db, data: True,
    )

    volunteer_service.register_volunteer(db, data)

    assert db.value.department_id == 1
    assert db.value.institution_type_id == 1
    assert db.value.other_institution_name == "Community clinic"
