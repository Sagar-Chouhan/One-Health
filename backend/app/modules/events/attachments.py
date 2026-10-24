"""Photo / video / document attachments for an event report.

Limits mirror the form's note and MASTER.uploadLimits in the prototype:
    up to 5 photographs (5 MB each), 2 videos (25 MB each) and
    4 documents - PDF, Word or Excel (10 MB each).
The attachment table enforces the size cap again, so a bad file can never slip
past this layer into the database.
"""

from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config.settings import settings

MB = 1024 * 1024


@dataclass(frozen=True)
class KindSpec:
    file_kind: str        # value stored in attachment.file_kind
    max_count: int
    max_bytes: int
    label: str            # for the form note and messages
    extensions: tuple[str, ...]


# Keyed by the multipart field name the app sends.
SPECS: dict[str, KindSpec] = {
    "photos":    KindSpec("IMAGE",    5,  5 * MB, "Photographs", (".jpg", ".jpeg", ".png", ".webp")),
    "videos":    KindSpec("VIDEO",    2, 25 * MB, "Videos", (".mp4", ".webm", ".mov", ".m4v", ".3gp", ".mkv", ".avi")),
    "documents": KindSpec("DOCUMENT", 4, 10 * MB, "Documents", (".pdf", ".doc", ".docx", ".xls", ".xlsx")),
}

SUBDIR = "events"


@dataclass
class ReadyFile:
    file_kind: str
    file_name: str
    ext: str
    data: bytes
    mime_type: str


def upload_limits() -> dict:
    """What the form needs to draw the note. Shape matches the prototype."""
    return {
        field: {"max": s.max_count, "mb": s.max_bytes // MB, "label": s.label}
        for field, s in SPECS.items()
    }


def _invalid(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def _is_image(head: bytes) -> bool:
    return (
        head.startswith(b"\xff\xd8\xff")                 # jpeg
        or head.startswith(b"\x89PNG\r\n\x1a\n")         # png
        or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")
    )


def read_all(files_by_field: dict[str, list[UploadFile]]) -> list[ReadyFile]:
    """Validate every uploaded file against its kind's limits and return them
    ready to save. Raises 422 on the first problem, before anything is written."""
    ready: list[ReadyFile] = []

    for field, spec in SPECS.items():
        uploads = [f for f in files_by_field.get(field, []) if f and f.filename]
        if len(uploads) > spec.max_count:
            raise _invalid(f"{spec.label}: at most {spec.max_count} may be attached.")

        for upload in uploads:
            ext = Path(upload.filename).suffix.lower()
            if ext not in spec.extensions:
                raise _invalid(
                    f'"{upload.filename}" is not an accepted {spec.label.lower()[:-1]} '
                    f"format ({', '.join(spec.extensions)})."
                )

            data = upload.file.read(spec.max_bytes + 1)
            if not data:
                raise _invalid(f'"{upload.filename}" is empty.')
            if len(data) > spec.max_bytes:
                raise _invalid(
                    f'"{upload.filename}" exceeds the {spec.max_bytes // MB} MB limit '
                    f"for {spec.label.lower()}."
                )
            # Photographs are the one kind checked by content, not just the
            # extension - they are the most common and the easiest to disguise.
            if spec.file_kind == "IMAGE" and not _is_image(data[:12]):
                raise _invalid(f'"{upload.filename}" is not a valid image.')

            ready.append(
                ReadyFile(
                    file_kind=spec.file_kind,
                    file_name=upload.filename[:255],
                    ext=ext,
                    data=data,
                    mime_type=(upload.content_type or "")[:100],
                )
            )
    return ready


def save_files(entity_subdir: str, entity_code: str, files: list[ReadyFile]) -> list[dict]:
    """Write validated files under a record-specific upload directory."""
    folder = Path(entity_subdir) / entity_code
    rows: list[dict] = []
    for index, f in enumerate(files, start=1):
        relative = folder / f"{f.file_kind.lower()}_{index}{f.ext}"
        target = settings.UPLOAD_DIR / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(f.data)
        rows.append(
            {
                "file_kind": f.file_kind,
                "file_name": f.file_name,
                "storage_path": relative.as_posix(),
                "mime_type": f.mime_type or None,
                "size_bytes": len(f.data),
            }
        )
    return rows


def save_all(event_code: str, files: list[ReadyFile]) -> list[dict]:
    return save_files(SUBDIR, event_code, files)


def delete_saved(event_code: str) -> None:
    """Remove an event's whole attachment folder - used to undo a failed save."""
    folder = settings.UPLOAD_DIR / SUBDIR / event_code
    if folder.exists():
        for child in folder.iterdir():
            child.unlink(missing_ok=True)
        folder.rmdir()


def delete_files(entity_subdir: str, entity_code: str) -> None:
    folder = settings.UPLOAD_DIR / entity_subdir / entity_code
    if folder.exists():
        for child in folder.iterdir():
            child.unlink(missing_ok=True)
        folder.rmdir()
