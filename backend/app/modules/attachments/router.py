"""Attachment endpoints.

Provides secure, authenticated viewing and downloading of uploaded files:
photos, videos, and documents.
Enforces role-based authorization and prevents path traversal vulnerabilities.
"""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Path as FastApiPath, status
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_actor

router = APIRouter(
    prefix="/api/attachments",
    tags=["Attachments"],
)


@router.get(
    "/{attachment_id}",
    summary="View an attachment (inline streaming)",
)
def get_attachment(
    attachment_id: int = FastApiPath(..., gt=0, description="Primary key ID of attachment"),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Securely stream an attachment file with ownership and authorization checks."""
    row = db.execute(
        text(
            """
            SELECT attachment_id, volunteer_id, entity_type, entity_id,
                   file_kind, file_name, storage_path, mime_type, size_bytes
            FROM public.attachment
            WHERE attachment_id = :attachment_id
            """
        ),
        {"attachment_id": attachment_id},
    ).mappings().one_or_none()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found.",
        )

    # Authorization Check
    role = actor.get("role")
    actor_volunteer_id = actor.get("volunteer_id")

    if role == "COHV":
        # Success stories are publicly accessible within the application
        if row["entity_type"] != "SUCCESS_STORY" and row["volunteer_id"] != actor_volunteer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this attachment.",
            )

    # Path traversal protection
    upload_root = settings.UPLOAD_DIR.resolve()
    target_path = (upload_root / row["storage_path"]).resolve()

    if not str(target_path).startswith(str(upload_root)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to the requested storage path is forbidden.",
        )

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file could not be found on storage.",
        )

    return FileResponse(
        path=target_path,
        media_type=row["mime_type"] or "application/octet-stream",
        filename=row["file_name"],
        content_disposition_type="inline",
    )


@router.get(
    "/{attachment_id}/download",
    summary="Download an attachment as file attachment",
)
def download_attachment(
    attachment_id: int = FastApiPath(..., gt=0),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Force download of an attachment with Content-Disposition: attachment."""
    row = db.execute(
        text(
            """
            SELECT attachment_id, volunteer_id, entity_type, entity_id,
                   file_kind, file_name, storage_path, mime_type, size_bytes
            FROM public.attachment
            WHERE attachment_id = :attachment_id
            """
        ),
        {"attachment_id": attachment_id},
    ).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    role = actor.get("role")
    actor_volunteer_id = actor.get("volunteer_id")
    if role == "COHV" and row["entity_type"] != "SUCCESS_STORY" and row["volunteer_id"] != actor_volunteer_id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this attachment.")

    upload_root = settings.UPLOAD_DIR.resolve()
    target_path = (upload_root / row["storage_path"]).resolve()
    if not str(target_path).startswith(str(upload_root)) or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Attachment file not found.")

    return FileResponse(
        path=target_path,
        media_type=row["mime_type"] or "application/octet-stream",
        filename=row["file_name"],
        content_disposition_type="attachment",
    )


@router.get(
    "/{attachment_id}/meta",
    summary="Get attachment metadata",
)
def get_attachment_metadata(
    attachment_id: int = FastApiPath(..., gt=0),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Return attachment metadata record."""
    row = db.execute(
        text(
            """
            SELECT attachment_id, volunteer_id, entity_type, entity_id,
                   file_kind, file_name, storage_path, mime_type, size_bytes,
                   caption, created_at
            FROM public.attachment
            WHERE attachment_id = :attachment_id
            """
        ),
        {"attachment_id": attachment_id},
    ).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    role = actor.get("role")
    actor_volunteer_id = actor.get("volunteer_id")
    if role == "COHV" and row["entity_type"] != "SUCCESS_STORY" and row["volunteer_id"] != actor_volunteer_id:
        raise HTTPException(status_code=403, detail="You are not authorized to view this attachment metadata.")

    d = dict(row)
    d["file_url"] = f"/api/attachments/{d['attachment_id']}"
    return {"success": True, "data": d}
