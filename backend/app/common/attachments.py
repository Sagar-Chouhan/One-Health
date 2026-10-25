"""Common attachment service for OneHealth.

Re-exports unified functionality from app.modules.events.attachments.
"""
from app.modules.events.attachments import (
    SPECS,
    MB,
    KindSpec,
    ReadyFile,
    AttachmentResponse,
    upload_limits,
    read_all,
    save_files,
    delete_files,
    insert_attachments,
    get_attachments_for_entity,
    attach_to_items,
    split_attachments,
    save_all,
    delete_saved,
    parse_multipart_or_json,
    sanitize_filename,
)

__all__ = [
    "SPECS",
    "MB",
    "KindSpec",
    "ReadyFile",
    "AttachmentResponse",
    "upload_limits",
    "read_all",
    "save_files",
    "delete_files",
    "insert_attachments",
    "get_attachments_for_entity",
    "attach_to_items",
    "split_attachments",
    "save_all",
    "delete_saved",
    "parse_multipart_or_json",
    "sanitize_filename",
]
