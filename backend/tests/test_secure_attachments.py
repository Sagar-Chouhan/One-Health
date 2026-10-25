import io
import uuid
from datetime import date
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies import (
    get_current_volunteer_id,
    get_current_actor,
    get_optional_actor,
)
from app.modules.events import attachments


# Minimal valid magic-byte payloads
VALID_JPEG = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xDB\x00C\x00\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\xFF\xD9"
VALID_PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
VALID_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
VALID_MP4 = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42\x00\x00\x00\x08mdat"
VALID_WEBM = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04\x42\xf3\x81\x08\x42\x82\x84webm"


def make_referral_data(extra=None):
    d = {
        "referral_stream": "HUMAN",
        "referral_facility_id": "1",
        "village_lgd_code": "90000001",
        "event_date": str(date.today()),
        "referral_date": str(date.today()),
        "reason": "Test referral for secure attachments",
        "gps_unavailable_reason": "Facility indoor no GPS fix",
        "client_ref": f"ref-{uuid.uuid4().hex[:8]}",
    }
    if extra:
        d.update(extra)
    return d


# ============================================================================
# 1. POST without attachments (JSON backward-compatibility & multipart empty)
# ============================================================================

def test_post_referral_json_without_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        payload = make_referral_data()
        payload["referral_facility_id"] = 1
        payload["village_lgd_code"] = 90000001
        res = client.post("/api/referrals", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["volunteer_id"] == 23
        assert "attachments" in data
        assert data["attachments"] == []
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


def test_post_referral_multipart_without_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        res = client.post("/api/referrals", data=data)
        assert res.status_code == 201
        res_data = res.json()
        assert "attachments" in res_data
        assert res_data["attachments"] == []
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 2. POST with Image attachment
# ============================================================================

def test_post_referral_with_image():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [
            ("photos", ("patient_lesion.jpg", VALID_JPEG, "image/jpeg"))
        ]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 201
        item = res.json()
        assert len(item["attachments"]) >= 1
        att = item["attachments"][0]
        assert att["file_kind"] == "IMAGE"
        assert att["file_name"] == "patient_lesion.jpg"
        assert att["file_url"].startswith("/api/attachments/")
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 3. POST with Video attachment
# ============================================================================

def test_post_referral_with_video():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [
            ("videos", ("sample_video.mp4", VALID_MP4, "video/mp4"))
        ]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 201
        item = res.json()
        assert len(item["attachments"]) >= 1
        att = item["attachments"][0]
        assert att["file_kind"] == "VIDEO"
        assert att["file_name"] == "sample_video.mp4"
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 4. POST with Document attachment
# ============================================================================

def test_post_referral_with_document():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [
            ("documents", ("clinical_summary.pdf", VALID_PDF, "application/pdf"))
        ]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 201
        item = res.json()
        assert len(item["attachments"]) >= 1
        att = item["attachments"][0]
        assert att["file_kind"] == "DOCUMENT"
        assert att["file_name"] == "clinical_summary.pdf"
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 5. POST with Mixed Attachments (Photos + Videos + Documents)
# ============================================================================

def test_post_mixed_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [
            ("photos", ("photo1.png", VALID_PNG, "image/png")),
            ("videos", ("video1.webm", VALID_WEBM, "video/webm")),
            ("documents", ("doc1.pdf", VALID_PDF, "application/pdf")),
        ]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 201
        item = res.json()
        kinds = {a["file_kind"] for a in item["attachments"]}
        assert "IMAGE" in kinds
        assert "VIDEO" in kinds
        assert "DOCUMENT" in kinds
        assert len(item["attachments"]) == 3
        # Direct payload fields: photos, videos, documents
        assert len(item["photos"]) == 1
        assert len(item["videos"]) == 1
        assert len(item["documents"]) == 1
        assert item["photos"][0]["url"].startswith("/uploads/")
        assert item["videos"][0]["url"].startswith("/uploads/")
        assert item["documents"][0]["url"].startswith("/uploads/")
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 6. GET with attachments
# ============================================================================

def test_get_record_with_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    app.dependency_overrides[get_current_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [("photos", ("test_get.jpg", VALID_JPEG, "image/jpeg"))]
        create_res = client.post("/api/referrals", data=data, files=files)
        created_id = create_res.json()["referral_id"]

        get_res = client.get(f"/api/referrals/{created_id}")
        assert get_res.status_code == 200
        item = get_res.json()["data"]
        assert len(item["attachments"]) >= 1
        assert len(item["photos"]) >= 1
        att = item["attachments"][0]
        assert att["file_name"] == "test_get.jpg"
        assert att["file_url"].startswith("/api/attachments/")
        assert att["url"].startswith("/uploads/")
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)
        app.dependency_overrides.pop(get_current_actor, None)


def test_post_referral_json_with_base64_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        import base64
        client = TestClient(app)
        data = make_referral_data()
        payload = {
            **data,
            "photos": [
                {
                    "file_name": "b64_patient.jpg",
                    "base64": base64.b64encode(VALID_JPEG).decode("utf-8"),
                }
            ],
            "documents": [
                {
                    "file_name": "b64_report.pdf",
                    "base64": base64.b64encode(VALID_PDF).decode("utf-8"),
                }
            ],
        }
        res = client.post("/api/referrals", json=payload)
        assert res.status_code == 201
        item = res.json()
        assert len(item["photos"]) == 1
        assert item["photos"][0]["file_name"] == "b64_patient.jpg"
        assert len(item["documents"]) == 1
        assert item["documents"][0]["file_name"] == "b64_report.pdf"
        assert len(item["attachments"]) == 2
        assert item["photos"][0]["url"].startswith("/uploads/")
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 7. GET without attachments returns empty list
# ============================================================================

def test_get_record_without_attachments():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    app.dependency_overrides[get_current_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        create_res = client.post("/api/referrals", data=data)
        created_id = create_res.json()["referral_id"]

        get_res = client.get(f"/api/referrals/{created_id}")
        assert get_res.status_code == 200
        assert get_res.json()["data"]["attachments"] == []
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)
        app.dependency_overrides.pop(get_current_actor, None)


# ============================================================================
# 8. Missing JWT / Authentication returns 401
# ============================================================================

def test_missing_jwt():
    app.dependency_overrides.clear()
    client = TestClient(app)
    res = client.get("/api/referrals/4")
    assert res.status_code == 401


# ============================================================================
# 9. Invalid JWT returns 401
# ============================================================================

def test_invalid_jwt():
    app.dependency_overrides.clear()
    client = TestClient(app)
    res = client.get(
        "/api/referrals/4",
        headers={"Authorization": "Bearer totally.invalid.jwt.token"},
    )
    assert res.status_code == 401


# ============================================================================
# 10. Unauthorized record access returns 403
# ============================================================================

def test_unauthorized_record_access():
    # Volunteer 45 tries to access referral 4 belonging to volunteer 23
    app.dependency_overrides[get_current_actor] = lambda: {
        "role": "COHV",
        "volunteer_id": 45,
    }
    try:
        client = TestClient(app)
        res = client.get("/api/referrals/4")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_actor, None)


# ============================================================================
# 11. Unauthorized attachment download returns 403
# ============================================================================

def test_unauthorized_attachment_download():
    # First create an attachment as volunteer 23
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    att_id = None
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [("photos", ("secret.jpg", VALID_JPEG, "image/jpeg"))]
        res = client.post("/api/referrals", data=data, files=files)
        att_id = res.json()["attachments"][0]["attachment_id"]
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)

    assert att_id is not None

    # Now volunteer 45 tries to download the attachment directly
    app.dependency_overrides[get_current_actor] = lambda: {
        "role": "COHV",
        "volunteer_id": 45,
    }
    try:
        client = TestClient(app)
        res = client.get(f"/api/attachments/{att_id}")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_actor, None)


# ============================================================================
# 12. Invalid MIME type / Content type validation
# ============================================================================

def test_invalid_mime_type_rejected():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        fake_jpeg = b"<html><script>alert(1)</script></html>"
        files = [("photos", ("fake.jpg", fake_jpeg, "image/jpeg"))]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 13. Invalid extension rejected
# ============================================================================

def test_invalid_extension_rejected():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [("documents", ("malware.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream"))]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 14. Oversized file rejected
# ============================================================================

def test_oversized_file_rejected():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        large_image = VALID_JPEG + (b"\x00" * (5 * 1024 * 1024 + 100))
        files = [("photos", ("huge.jpg", large_image, "image/jpeg"))]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 15. Invalid entity type rejected
# ============================================================================

def test_invalid_entity_type_rejected():
    from app.database.session import SessionLocal
    from sqlalchemy.exc import IntegrityError
    db = SessionLocal()
    try:
        with pytest.raises(IntegrityError):
            attachments.insert_attachments(
                db=db,
                volunteer_id=23,
                entity_type="NON_EXISTENT_MODULE",
                entity_id=1,
                file_rows=[{
                    "file_kind": "IMAGE",
                    "file_name": "test.jpg",
                    "storage_path": "invalid/test.jpg",
                    "mime_type": "image/jpeg",
                    "size_bytes": 100,
                }],
            )
            db.commit()
    finally:
        db.rollback()
        db.close()


# ============================================================================
# 16. Database failure triggers disk file cleanup
# ============================================================================

def test_db_failure_cleans_up_files():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app, raise_server_exceptions=False)
        data = make_referral_data()
        files = [("photos", ("rollback.jpg", VALID_JPEG, "image/jpeg"))]

        with patch("app.modules.events.attachments.save_files") as mock_save:
            mock_save.return_value = [{
                "file_kind": "IMAGE",
                "file_name": "rollback.jpg",
                "storage_path": "referrals/dummy/IMAGE_1.jpg",
                "mime_type": "image/jpeg",
                "size_bytes": 100,
            }]
            with patch("app.modules.events.attachments.delete_files") as mock_delete:
                from sqlalchemy.exc import SQLAlchemyError
                with patch("sqlalchemy.orm.Session.commit", side_effect=SQLAlchemyError("DB Commit Crash")):
                    res = client.post("/api/referrals", data=data, files=files)
                    assert res.status_code >= 500
                    assert mock_delete.called
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 17. Storage failure raises clean HTTP 500
# ============================================================================

def test_storage_failure_handled():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app, raise_server_exceptions=False)
        data = make_referral_data()
        files = [("photos", ("disk_fail.jpg", VALID_JPEG, "image/jpeg"))]

        with patch("app.modules.events.attachments.save_files", side_effect=OSError("Disk Full")):
            res = client.post("/api/referrals", data=data, files=files)
            assert res.status_code >= 500
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)


# ============================================================================
# 18. Multiple attachments handling across all modules
# ============================================================================

def test_multiple_attachments_sequenced():
    app.dependency_overrides[get_optional_actor] = lambda: {"role": "COHV", "volunteer_id": 23}
    try:
        client = TestClient(app)
        data = make_referral_data()
        files = [
            ("photos", ("photo_1.jpg", VALID_JPEG, "image/jpeg")),
            ("photos", ("photo_2.png", VALID_PNG, "image/png")),
            ("documents", ("report_1.pdf", VALID_PDF, "application/pdf")),
            ("documents", ("report_2.pdf", VALID_PDF, "application/pdf")),
        ]
        res = client.post("/api/referrals", data=data, files=files)
        assert res.status_code == 201
        item = res.json()
        atts = item["attachments"]
        assert len(atts) == 4
        for a in atts:
            assert a["attachment_id"] > 0
            assert a["file_url"] == f"/api/attachments/{a['attachment_id']}"
    finally:
        app.dependency_overrides.pop(get_optional_actor, None)
