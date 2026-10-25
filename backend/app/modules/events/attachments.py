"""Event attachments and unified attachment service for OneHealth.

Supports optional photos (images), videos, and documents across all modules:
1. Event Report (EVENT_REPORT)
2. Referral (REFERRAL)
3. Awareness Activity (AWARENESS_ACTIVITY)
4. Sample Support (SAMPLE_SUPPORT)
5. Capacity Building (TRAINING_IMPARTED, TRAINING_ATTENDED)
6. Success Stories (SUCCESS_STORY)

Enforces magic bytes verification, file extension whitelisting, size limits,
atomic storage paths, and N+1 prevention for batch queries.
"""

import base64
from dataclasses import dataclass
import logging
from pathlib import Path
import re
from typing import Any, TypeVar

from fastapi import HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.settings import settings

logger = logging.getLogger(__name__)

MB = 1024 * 1024
T = TypeVar("T", bound=BaseModel)
SUBDIR = "events"


# ============================================================================
# Schemas & Specifications
# ============================================================================

@dataclass(frozen=True)
class KindSpec:
    file_kind: str  # Value stored in public.attachment.file_kind
    max_count: int
    max_bytes: int
    label: str
    extensions: tuple[str, ...]


SPECS: dict[str, KindSpec] = {
    "photos": KindSpec(
        file_kind="IMAGE",
        max_count=5,
        max_bytes=5 * MB,
        label="Photographs",
        extensions=(".jpg", ".jpeg", ".png", ".webp"),
    ),
    "videos": KindSpec(
        file_kind="VIDEO",
        max_count=2,
        max_bytes=25 * MB,
        label="Videos",
        extensions=(".mp4", ".webm", ".mov", ".m4v", ".3gp", ".mkv", ".avi"),
    ),
    "documents": KindSpec(
        file_kind="DOCUMENT",
        max_count=4,
        max_bytes=10 * MB,
        label="Documents",
        extensions=(".pdf", ".doc", ".docx", ".xls", ".xlsx"),
    ),
}


class AttachmentResponse(BaseModel):
    """Standard attachment schema returned in GET and POST responses."""
    attachment_id: int
    file_kind: str
    file_name: str
    storage_path: str | None = None
    mime_type: str | None = None
    size_bytes: int
    caption: str | None = None
    url: str | None = None
    file_url: str | None = None


@dataclass
class ReadyFile:
    file_kind: str
    file_name: str
    ext: str
    data: bytes
    mime_type: str


# ============================================================================
# Validation Utilities
# ============================================================================

def upload_limits() -> dict[str, dict[str, Any]]:
    """Return upload limits for form metadata."""
    return {
        field: {
            "max": s.max_count,
            "mb": s.max_bytes // MB,
            "label": s.label,
            "extensions": list(s.extensions),
        }
        for field, s in SPECS.items()
    }


def _invalid(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def _is_image(head: bytes) -> bool:
    """Validate image magic bytes (JPEG, PNG, WebP)."""
    return (
        head.startswith(b"\xff\xd8\xff")  # JPEG
        or head.startswith(b"\x89PNG\r\n\x1a\n")  # PNG
        or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")  # WebP
    )


def _is_pdf(head: bytes) -> bool:
    """Validate PDF magic bytes."""
    return head.startswith(b"%PDF")


def sanitize_filename(filename: str) -> str:
    """Sanitize user-provided filename to prevent path traversal."""
    name = Path(filename).name.strip()
    name = re.sub(r"[^\w\.\-\s]", "_", name)
    return name[:255] or "attachment"


def _extract_file_data(item: Any, spec: KindSpec) -> tuple[str, bytes, str]:
    """Extract (file_name, data, mime_type) from UploadFile, dict, or base64 str."""
    if hasattr(item, "filename") and hasattr(item, "file"):
        clean_name = sanitize_filename(item.filename)
        data = item.file.read(spec.max_bytes + 1)
        mime = (getattr(item, "content_type", "") or "")[:100]
        return clean_name, data, mime

    if isinstance(item, dict):
        file_name = sanitize_filename(
            item.get("file_name") or item.get("filename") or f"{spec.file_kind.lower()}{spec.extensions[0]}"
        )
        raw_b64 = item.get("base64") or item.get("data") or item.get("content") or ""
        mime = (item.get("mime_type") or "")[:100]
        if isinstance(raw_b64, str) and "," in raw_b64 and "base64" in raw_b64:
            header, raw_b64 = raw_b64.split(",", 1)
            if not mime and ":" in header and ";" in header:
                mime = header.split(":", 1)[1].split(";", 1)[0]
        try:
            data = base64.b64decode(raw_b64)
        except Exception:
            raise _invalid(f'"{file_name}" contains invalid base64 data.')
        return file_name, data, mime

    if isinstance(item, str) and item.strip():
        raw_b64 = item.strip()
        mime = ""
        if "," in raw_b64 and "base64" in raw_b64:
            header, raw_b64 = raw_b64.split(",", 1)
            if ":" in header and ";" in header:
                mime = header.split(":", 1)[1].split(";", 1)[0]
        ext = spec.extensions[0]
        if mime:
            if "jpeg" in mime or "jpg" in mime:
                ext = ".jpg"
            elif "png" in mime:
                ext = ".png"
            elif "webp" in mime:
                ext = ".webp"
            elif "pdf" in mime:
                ext = ".pdf"
            elif "mp4" in mime:
                ext = ".mp4"
        file_name = f"{spec.file_kind.lower()}{ext}"
        try:
            data = base64.b64decode(raw_b64)
        except Exception:
            raise _invalid(f"Invalid base64 string for {spec.label.lower()}.")
        return file_name, data, mime

    return "", b"", ""


def read_all(files_by_field: dict[str, list[Any]]) -> list[ReadyFile]:
    """Validate every uploaded file against its kind's limits and magic bytes.

    Accepts UploadFile instances, dictionaries with base64 data, or raw base64 strings.
    Raises 422 immediately on any invalid file before writing to disk.
    """
    ready: list[ReadyFile] = []

    for field, spec in SPECS.items():
        raw_items = files_by_field.get(field, [])
        if not isinstance(raw_items, list):
            raw_items = [raw_items] if raw_items else []

        valid_items = [f for f in raw_items if f]
        if len(valid_items) > spec.max_count:
            raise _invalid(f"{spec.label}: at most {spec.max_count} may be attached.")

        for item in valid_items:
            clean_name, data, mime_type = _extract_file_data(item, spec)
            if not clean_name and not data:
                continue

            ext = Path(clean_name).suffix.lower()
            if ext not in spec.extensions:
                raise _invalid(
                    f'"{clean_name}" is not an accepted {spec.label.lower()[:-1]} '
                    f"format ({', '.join(spec.extensions)})."
                )

            # Read bounded bytes
            if not data:
                raise _invalid(f'"{clean_name}" is empty.')
            if len(data) > spec.max_bytes:
                raise _invalid(
                    f'"{clean_name}" exceeds the {spec.max_bytes // MB} MB limit '
                    f"for {spec.label.lower()}."
                )

            # Strict magic bytes content check
            if spec.file_kind == "IMAGE" and not _is_image(data[:12]):
                raise _invalid(f'"{clean_name}" is not a valid image file.')
            if ext == ".pdf" and not _is_pdf(data[:8]):
                raise _invalid(f'"{clean_name}" is not a valid PDF document.')

            # Inferred / provided MIME type
            if not mime_type or mime_type == "application/octet-stream":
                if ext in (".jpg", ".jpeg"):
                    mime_type = "image/jpeg"
                elif ext == ".png":
                    mime_type = "image/png"
                elif ext == ".webp":
                    mime_type = "image/webp"
                elif ext == ".mp4":
                    mime_type = "video/mp4"
                elif ext == ".webm":
                    mime_type = "video/webm"
                elif ext == ".pdf":
                    mime_type = "application/pdf"

            ready.append(
                ReadyFile(
                    file_kind=spec.file_kind,
                    file_name=clean_name,
                    ext=ext,
                    data=data,
                    mime_type=mime_type,
                )
            )

    return ready


# ============================================================================
# Storage Operations
# ============================================================================

def save_files(
    entity_subdir: str,
    entity_code: str,
    files: list[ReadyFile],
) -> list[dict[str, Any]]:
    """Write validated files under settings.UPLOAD_DIR/<subdir>/<code-slug>/."""
    safe_subdir = sanitize_filename(entity_subdir).replace(".", "_")
    safe_code = sanitize_filename(entity_code).replace(".", "_")
    folder = Path(safe_subdir) / safe_code

    rows: list[dict[str, Any]] = []
    for index, f in enumerate(files, start=1):
        filename = f"{f.file_kind.lower()}_{index}{f.ext}"
        relative = folder / filename
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


def delete_files(entity_subdir: str, entity_code: str) -> None:
    """Remove an entity's attachment folder — used to rollback orphaned files."""
    safe_subdir = sanitize_filename(entity_subdir).replace(".", "_")
    safe_code = sanitize_filename(entity_code).replace(".", "_")
    folder = settings.UPLOAD_DIR / safe_subdir / safe_code
    if folder.exists() and folder.is_dir():
        try:
            for child in folder.iterdir():
                if child.is_file():
                    child.unlink(missing_ok=True)
            folder.rmdir()
        except Exception as exc:
            logger.warning("Could not clean up attachment folder %s: %s", folder, exc)


def save_all(event_code: str, files: list[ReadyFile]) -> list[dict[str, Any]]:
    """Events compatibility wrapper for save_files."""
    return save_files(SUBDIR, event_code, files)


def delete_saved(event_code: str) -> None:
    """Events compatibility wrapper for delete_files."""
    delete_files(SUBDIR, event_code)


# ============================================================================
# Database Operations
# ============================================================================

def insert_attachments(
    db: Session,
    volunteer_id: int,
    entity_type: str,
    entity_id: int,
    file_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Persist attachment metadata in public.attachment and return created items."""
    if not file_rows:
        return []

    query = text(
        """
        INSERT INTO public.attachment (
            volunteer_id,
            entity_type,
            entity_id,
            file_kind,
            file_name,
            storage_path,
            mime_type,
            size_bytes
        ) VALUES (
            :volunteer_id,
            :entity_type,
            :entity_id,
            :file_kind,
            :file_name,
            :storage_path,
            :mime_type,
            :size_bytes
        )
        RETURNING attachment_id, file_kind, file_name, storage_path, mime_type, size_bytes, caption
        """
    )

    created: list[dict[str, Any]] = []
    for row in file_rows:
        res = db.execute(
            query,
            {
                "volunteer_id": volunteer_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "file_kind": row["file_kind"],
                "file_name": row["file_name"],
                "storage_path": row["storage_path"],
                "mime_type": row.get("mime_type"),
                "size_bytes": row["size_bytes"],
            },
        ).mappings().one()

        item = dict(res)
        sp = item.get("storage_path") or ""
        item["file_url"] = f"/api/attachments/{item['attachment_id']}"
        item["url"] = f"/uploads/{sp}" if sp else item["file_url"]
        created.append(item)

    return created


def get_attachments_for_entity(
    db: Session,
    entity_type: str,
    entity_id: int,
) -> list[dict[str, Any]]:
    """Retrieve all attachments for a single record."""
    query = text(
        """
        SELECT attachment_id, file_kind, file_name, storage_path,
               mime_type, size_bytes, caption
        FROM public.attachment
        WHERE entity_type = :entity_type
          AND entity_id = :entity_id
        ORDER BY attachment_id ASC
        """
    )
    rows = db.execute(
        query, {"entity_type": entity_type, "entity_id": entity_id}
    ).mappings().all()

    items = []
    for r in rows:
        d = dict(r)
        sp = d.get("storage_path") or ""
        d["file_url"] = f"/api/attachments/{d['attachment_id']}"
        d["url"] = f"/uploads/{sp}" if sp else d["file_url"]
        items.append(d)
    return items


def split_attachments(att_list: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Split a list of attachments into photos, videos, documents, and total attachments."""
    return {
        "attachments": att_list,
        "photos": [a for a in att_list if a.get("file_kind") == "IMAGE"],
        "videos": [a for a in att_list if a.get("file_kind") == "VIDEO"],
        "documents": [a for a in att_list if a.get("file_kind") == "DOCUMENT"],
    }


def attach_to_items(
    db: Session,
    entity_type: str,
    items: list[dict[str, Any]],
    id_key: str,
) -> None:
    """Batch-fetch and attach attachments to a list of records in a single query.
    Directly populates 'attachments', 'photos', 'videos', and 'documents' on each item.
    """
    if not items:
        return

    entity_ids = [item[id_key] for item in items if item.get(id_key) is not None]
    if not entity_ids:
        for item in items:
            item["attachments"] = []
            item["photos"] = []
            item["videos"] = []
            item["documents"] = []
        return

    query = text(
        """
        SELECT attachment_id, entity_id, file_kind, file_name, storage_path,
               mime_type, size_bytes, caption
        FROM public.attachment
        WHERE entity_type = :entity_type
          AND entity_id = ANY(:entity_ids)
        ORDER BY attachment_id ASC
        """
    )
    rows = db.execute(
        query, {"entity_type": entity_type, "entity_ids": entity_ids}
    ).mappings().all()

    grouped: dict[int, list[dict[str, Any]]] = {}
    for r in rows:
        d = dict(r)
        ent_id = d.pop("entity_id")
        sp = d.get("storage_path") or ""
        d["file_url"] = f"/api/attachments/{d['attachment_id']}"
        d["url"] = f"/uploads/{sp}" if sp else d["file_url"]
        grouped.setdefault(ent_id, []).append(d)

    for item in items:
        record_id = item.get(id_key)
        att_list = grouped.get(record_id, [])
        item["attachments"] = att_list
        item["photos"] = [a for a in att_list if a.get("file_kind") == "IMAGE"]
        item["videos"] = [a for a in att_list if a.get("file_kind") == "VIDEO"]
        item["documents"] = [a for a in att_list if a.get("file_kind") == "DOCUMENT"]


# ============================================================================
# Dual Parser for JSON and Multipart/Form-data
# ============================================================================

async def parse_multipart_or_json(request: Request, schema_cls: type[T]) -> T:
    """Parse request as either multipart/form-data (with optional file uploads)
    or application/json (for backward compatibility).
    Supports flexible field names: photos/photo/images, videos/video, documents/document/docs, files.
    """
    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        fields: dict[str, Any] = {}
        photos: list[Any] = []
        videos: list[Any] = []
        documents: list[Any] = []

        for key, value in form.multi_items():
            k = key.lower().strip()
            if k in ("photos", "photo", "images", "image"):
                if hasattr(value, "filename") and value.filename:
                    photos.append(value)
                elif isinstance(value, (str, dict)) and value:
                    photos.append(value)
            elif k in ("videos", "video"):
                if hasattr(value, "filename") and value.filename:
                    videos.append(value)
                elif isinstance(value, (str, dict)) and value:
                    videos.append(value)
            elif k in ("documents", "document", "docs", "doc"):
                if hasattr(value, "filename") and value.filename:
                    documents.append(value)
                elif isinstance(value, (str, dict)) and value:
                    documents.append(value)
            elif k in ("files", "file"):
                if hasattr(value, "filename") and value.filename:
                    ext = Path(value.filename).suffix.lower()
                    if ext in SPECS["photos"].extensions:
                        photos.append(value)
                    elif ext in SPECS["videos"].extensions:
                        videos.append(value)
                    else:
                        documents.append(value)
            else:
                # Convert empty strings to None so optional typed fields (int, date, Decimal) don't fail
                if isinstance(value, str) and value == "":
                    fields[key] = None
                else:
                    fields[key] = value

        fields["photos"] = photos
        fields["videos"] = videos
        fields["documents"] = documents

        try:
            return schema_cls.model_validate(fields)
        except ValidationError as exc:
            raise RequestValidationError(errors=exc.errors()) from exc
    else:
        try:
            body = await request.json()
            if not isinstance(body, dict):
                body = {}

            # Map alias keys to photos, videos, documents
            for single_k, list_k in [
                ("photo", "photos"),
                ("image", "photos"),
                ("images", "photos"),
                ("video", "videos"),
                ("document", "documents"),
                ("doc", "documents"),
                ("docs", "documents"),
            ]:
                if single_k in body and not body.get(list_k):
                    val = body.pop(single_k)
                    body[list_k] = val if isinstance(val, list) else [val]

            # Support generic "files" list in JSON
            if "files" in body and isinstance(body["files"], list):
                for f_item in body.pop("files"):
                    name = ""
                    if hasattr(f_item, "filename"):
                        name = f_item.filename
                    elif isinstance(f_item, dict):
                        name = f_item.get("file_name") or f_item.get("filename") or ""
                    ext = Path(name).suffix.lower()
                    if ext in SPECS["photos"].extensions:
                        body.setdefault("photos", []).append(f_item)
                    elif ext in SPECS["videos"].extensions:
                        body.setdefault("videos", []).append(f_item)
                    else:
                        body.setdefault("documents", []).append(f_item)

            # Ensure file fields default to empty list if missing in JSON
            body.setdefault("photos", [])
            body.setdefault("videos", [])
            body.setdefault("documents", [])
            return schema_cls.model_validate(body)
        except ValidationError as exc:
            raise RequestValidationError(errors=exc.errors()) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid JSON payload.",
            ) from exc
