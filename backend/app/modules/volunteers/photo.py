"""Profile photograph handling for volunteer registration."""

from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config.settings import settings

MAX_PHOTO_BYTES = 5 * 1024 * 1024   # MASTER.uploadLimits.image in the prototype
PHOTO_SUBDIR = "volunteers"


def _detect_image_type(head: bytes) -> str | None:
    """File type from the content itself - the filename and the client's
    Content-Type header are both just claims."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


import base64
from typing import Any


def read_photo(upload: Any | None) -> tuple[bytes, str] | None:
    """Validate the uploaded photo and return (bytes, extension), or None
    when no photo was sent. Raises 422 for a bad file."""
    if upload is None:
        return None

    data: bytes | None = None
    if hasattr(upload, "filename") and hasattr(upload, "file"):
        if not upload.filename:
            return None
        # Read one byte past the cap so an oversized file is caught without
        # loading all of it into memory.
        data = upload.file.read(MAX_PHOTO_BYTES + 1)
    elif isinstance(upload, dict):
        raw_b64 = upload.get("base64") or upload.get("data") or upload.get("content") or ""
        if isinstance(raw_b64, str) and "," in raw_b64 and "base64" in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        if raw_b64:
            try:
                data = base64.b64decode(raw_b64)
            except Exception:
                raise HTTPException(status_code=422, detail="Invalid base64 image data.")
    elif isinstance(upload, str) and upload.strip():
        raw_b64 = upload.strip()
        if "," in raw_b64 and "base64" in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            data = base64.b64decode(raw_b64)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid base64 image data.")

    if not data:
        return None

    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=422,
            detail="Profile Photograph must be 5 MB or smaller.",
        )

    ext = _detect_image_type(data[:12])
    if ext is None:
        raise HTTPException(
            status_code=422,
            detail="Profile Photograph must be a JPEG, PNG or WebP image.",
        )
    return data, ext


def save_photo(volunteer_code: str, data: bytes, ext: str) -> str:
    """Write the photo and return its path relative to UPLOAD_DIR, which is
    what volunteer_registration.photo_path stores."""
    relative = Path(PHOTO_SUBDIR) / f"{volunteer_code}.{ext}"
    target = settings.UPLOAD_DIR / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return relative.as_posix()


def delete_photo(relative_path: str | None) -> None:
    if relative_path:
        (settings.UPLOAD_DIR / relative_path).unlink(missing_ok=True)
