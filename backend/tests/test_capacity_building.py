"""Automated tests for Capacity Building module APIs.

Covers:
1. Training Master lookup (active types, sort_order)
2. Training Imparted (create, idempotency, date/word count validations, listing with pagination & filters, get by ID, 404 & ownership verification)
3. Training Attended (create, idempotency, validations, listing with pagination & filters, get by ID, 404 & ownership verification)
4. Authentication & authorization enforcement
"""

import uuid
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies import get_current_volunteer_id


@pytest.fixture
def client():
    return TestClient(app)


# ============================================================================
# 1. Training Master Tests
# ============================================================================

def test_get_training_master(client):
    """GET /api/capacity-building/training-master returns active master records sorted by sort_order."""
    resp = client.get("/api/capacity-building/training-master")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert "training_id" in first
    assert "training_name" in first
    assert "is_other" in first
    assert "sort_order" in first

    # Check sort order
    sort_orders = [item["sort_order"] for item in data]
    assert sort_orders == sorted(sort_orders)


# ============================================================================
# 2. Authentication Enforcement Tests
# ============================================================================

def test_unauthenticated_requests(client):
    """Endpoints require valid volunteer authentication token."""
    # Training Imparted
    resp = client.get("/api/capacity-building/training-imparted")
    assert resp.status_code == 401

    resp = client.post("/api/capacity-building/training-imparted", json={})
    assert resp.status_code == 401

    resp = client.get("/api/capacity-building/training-imparted/1")
    assert resp.status_code == 401

    # Training Attended
    resp = client.get("/api/capacity-building/training-attended")
    assert resp.status_code == 401

    resp = client.post("/api/capacity-building/training-attended", json={})
    assert resp.status_code == 401

    resp = client.get("/api/capacity-building/training-attended/1")
    assert resp.status_code == 401


# ============================================================================
# 3. Training Imparted Tests
# ============================================================================

def test_create_and_get_training_imparted(client):
    """POST and GET /api/capacity-building/training-imparted."""
    test_vol_id = 23
    app.dependency_overrides[get_current_volunteer_id] = lambda: test_vol_id
    try:
        ref = f"imparted-test-{uuid.uuid4().hex[:12]}"
        payload = {
            "training_id": 1,
            "training_date": str(date.today()),
            "organised_by": "State Health Society",
            "duration": "3 Hours",
            "remarks": "Covered primary hygiene and community zoonosis awareness.",
            "client_ref": ref,
            "device_id": "test-device-01",
        }

        # 1. Create
        create_resp = client.post("/api/capacity-building/training-imparted", json=payload)
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["success"] is True
        item = created["data"]
        assert item["training_imparted_id"] > 0
        assert item["training_imparted_code"].startswith("TRI-")
        assert item["volunteer_id"] == test_vol_id
        assert item["volunteer_name"] is not None
        assert item["training_name"] is not None
        assert item["client_ref"] == ref
        assert item["verification_status"] == "SUBMITTED"

        rec_id = item["training_imparted_id"]

        # 2. Idempotent submission with same client_ref
        dup_resp = client.post("/api/capacity-building/training-imparted", json=payload)
        assert dup_resp.status_code in (200, 201)
        assert dup_resp.json()["data"]["training_imparted_id"] == rec_id

        # 3. Get by ID
        get_resp = client.get(f"/api/capacity-building/training-imparted/{rec_id}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["success"] is True
        assert fetched["data"]["training_imparted_id"] == rec_id
        assert fetched["data"]["training_name"] == item["training_name"]

        # 4. List records
        list_resp = client.get("/api/capacity-building/training-imparted?limit=10&offset=0")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert list_data["success"] is True
        assert list_data["data"]["total"] >= 1
        assert any(i["training_imparted_id"] == rec_id for i in list_data["data"]["items"])

        # 5. List with filters
        filter_resp = client.get(f"/api/capacity-building/training-imparted?training_id=1&date_from={date.today()}&date_to={date.today()}")
        assert filter_resp.status_code == 200
        assert filter_resp.json()["data"]["total"] >= 1

    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_training_imparted_validations(client):
    """Validation rules for Training Imparted."""
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        # Future date rejected
        future_date = str(date.today() + timedelta(days=2))
        resp = client.post(
            "/api/capacity-building/training-imparted",
            json={
                "training_id": 1,
                "training_date": future_date,
            },
        )
        assert resp.status_code == 422

        # Remarks > 250 words rejected
        long_remarks = "word " * 255
        resp = client.post(
            "/api/capacity-building/training-imparted",
            json={
                "training_id": 1,
                "training_date": str(date.today()),
                "remarks": long_remarks,
            },
        )
        assert resp.status_code == 422

        # Non-existent training_id rejected
        resp = client.post(
            "/api/capacity-building/training-imparted",
            json={
                "training_id": 9999,
                "training_date": str(date.today()),
            },
        )
        assert resp.status_code == 422

        # Inverted date filter range rejected
        resp = client.get(
            f"/api/capacity-building/training-imparted?date_from={date.today()}&date_to={date.today() - timedelta(days=1)}"
        )
        assert resp.status_code == 422

    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_training_imparted_ownership_and_404(client):
    """Verify 404 returned for missing records or records belonging to another volunteer."""
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        # Non-existent ID
        resp = client.get("/api/capacity-building/training-imparted/9999999")
        assert resp.status_code == 404

        # Create record as volunteer 23
        create_resp = client.post(
            "/api/capacity-building/training-imparted",
            json={
                "training_id": 1,
                "training_date": str(date.today()),
                "client_ref": f"iso-{uuid.uuid4().hex[:10]}",
            },
        )
        rec_id = create_resp.json()["data"]["training_imparted_id"]
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)

    # Now attempt access as volunteer 9999 (ownership isolation)
    app.dependency_overrides[get_current_volunteer_id] = lambda: 9999
    try:
        resp = client.get(f"/api/capacity-building/training-imparted/{rec_id}")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


# ============================================================================
# 4. Training Attended Tests
# ============================================================================

def test_create_and_get_training_attended(client):
    """POST and GET /api/capacity-building/training-attended."""
    test_vol_id = 23
    app.dependency_overrides[get_current_volunteer_id] = lambda: test_vol_id
    try:
        ref = f"attended-test-{uuid.uuid4().hex[:12]}"
        payload = {
            "training_id": 2,
            "training_date": str(date.today()),
            "venue": "Community Health Centre Conference Room",
            "chaired_by": "District Epidemiologist",
            "key_points": "Vector-borne disease early detection protocols.",
            "certificate_issued": True,
            "client_ref": ref,
            "device_id": "test-device-02",
        }

        # 1. Create
        create_resp = client.post("/api/capacity-building/training-attended", json=payload)
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["success"] is True
        item = created["data"]
        assert item["training_attended_id"] > 0
        assert item["training_attended_code"].startswith("TRN-")
        assert item["volunteer_id"] == test_vol_id
        assert item["venue"] == "Community Health Centre Conference Room"
        assert item["chaired_by"] == "District Epidemiologist"
        assert item["certificate_issued"] is True
        assert item["training_name"] is not None
        assert item["client_ref"] == ref
        assert item["verification_status"] == "SUBMITTED"

        rec_id = item["training_attended_id"]

        # 2. Idempotent submission with same client_ref
        dup_resp = client.post("/api/capacity-building/training-attended", json=payload)
        assert dup_resp.status_code in (200, 201)
        assert dup_resp.json()["data"]["training_attended_id"] == rec_id

        # 3. Get by ID
        get_resp = client.get(f"/api/capacity-building/training-attended/{rec_id}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["success"] is True
        assert fetched["data"]["training_attended_id"] == rec_id
        assert fetched["data"]["training_name"] == item["training_name"]

        # 4. List records
        list_resp = client.get("/api/capacity-building/training-attended?limit=10&offset=0")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert list_data["success"] is True
        assert list_data["data"]["total"] >= 1
        assert any(i["training_attended_id"] == rec_id for i in list_data["data"]["items"])

        # 5. List with filters (certificate_issued=True)
        filter_resp = client.get(f"/api/capacity-building/training-attended?certificate_issued=true&training_id=2")
        assert filter_resp.status_code == 200
        assert filter_resp.json()["data"]["total"] >= 1

    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_training_attended_validations(client):
    """Validation rules for Training Attended."""
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        # Future date rejected
        future_date = str(date.today() + timedelta(days=3))
        resp = client.post(
            "/api/capacity-building/training-attended",
            json={
                "training_id": 2,
                "training_date": future_date,
            },
        )
        assert resp.status_code == 422

        # Key points > 250 words rejected
        long_kp = "content " * 255
        resp = client.post(
            "/api/capacity-building/training-attended",
            json={
                "training_id": 2,
                "training_date": str(date.today()),
                "key_points": long_kp,
            },
        )
        assert resp.status_code == 422

        # Non-existent training_id rejected
        resp = client.post(
            "/api/capacity-building/training-attended",
            json={
                "training_id": 9999,
                "training_date": str(date.today()),
            },
        )
        assert resp.status_code == 422

        # Inverted date filter range rejected
        resp = client.get(
            f"/api/capacity-building/training-attended?date_from={date.today()}&date_to={date.today() - timedelta(days=2)}"
        )
        assert resp.status_code == 422

    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)


def test_training_attended_ownership_and_404(client):
    """Verify 404 returned for missing records or records belonging to another volunteer."""
    app.dependency_overrides[get_current_volunteer_id] = lambda: 23
    try:
        # Non-existent ID
        resp = client.get("/api/capacity-building/training-attended/9999999")
        assert resp.status_code == 404

        # Create record as volunteer 23
        create_resp = client.post(
            "/api/capacity-building/training-attended",
            json={
                "training_id": 2,
                "training_date": str(date.today()),
                "client_ref": f"iso-att-{uuid.uuid4().hex[:10]}",
            },
        )
        rec_id = create_resp.json()["data"]["training_attended_id"]
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)

    # Now attempt access as volunteer 9999 (ownership isolation)
    app.dependency_overrides[get_current_volunteer_id] = lambda: 9999
    try:
        resp = client.get(f"/api/capacity-building/training-attended/{rec_id}")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_volunteer_id, None)
