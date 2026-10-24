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


def read_photo(upload: UploadFile | None) -> tuple[bytes, str] | None:
    """Validate the uploaded photo and return (bytes, extension), or None
    when no photo was sent. Raises 422 for a bad file."""
    if upload is None or not upload.filename:
        return None

    # Read one byte past the cap so an oversized file is caught without
    # loading all of it into memory.
    data = upload.file.read(MAX_PHOTO_BYTES + 1)
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
