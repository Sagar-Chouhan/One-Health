import logging
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.events.schemas import SECTOR_OF_COHV_TYPE
from app.modules.sample_support import repository
from app.modules.sample_support.schemas import SampleSupportCreate
from app.modules.events import attachments

logger = logging.getLogger(__name__)


def create_sample(db: Session, owner_volunteer_id: int, data: SampleSupportCreate) -> dict:
    if data.volunteer_id != owner_volunteer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only submit your own sample records.")
    if not repository.volunteer_exists(db, data.volunteer_id):
        raise HTTPException(404, "Volunteer not found.")
    if not repository.village_is_active(db, data.village_lgd_code):
        raise HTTPException(422, "Village is invalid or inactive.")

    sample_type = repository.sample_type(db, data.sample_type_id)
    if sample_type is None:
        raise HTTPException(422, "Sample type is invalid or inactive.")

    cohv_type = db.execute(
        text(
            "SELECT department_name AS cohv_type FROM public.volunteer_registration WHERE volunteer_id = :id"
        ),
        {"id": owner_volunteer_id},
    ).scalar_one()
    sector = SECTOR_OF_COHV_TYPE.get(cohv_type)
    if sector and sector not in sample_type["applicable_sectors"]:
        raise HTTPException(422, "Sample type is not valid for your COHV sector.")

    if data.client_ref:
        existing = repository.existing_by_client_ref(
            db, owner_volunteer_id, data.client_ref
        )
        if existing:
            record = repository.get_one(
                db,
                owner_volunteer_id,
                existing["sample_id"],
            )
            return {"message": "Sample support already submitted.", "data": record}

    ready_files = attachments.read_all(
        {"photos": data.photos, "videos": data.videos, "documents": data.documents}
    )
    values = data.model_dump()
    values.pop("photos", None)
    values.pop("videos", None)
    values.pop("documents", None)
    if values["captured_at"] is None:
        values["captured_at"] = None
    saved_code = None
    try:
        row = repository.insert(db, values)
        saved_code = row["sample_code"]
        if ready_files:
            rows = attachments.save_files("samples", saved_code, ready_files)
            attachments.insert_attachments(
                db, owner_volunteer_id, "SAMPLE_SUPPORT", row["sample_id"], rows
            )
        db.commit()
        record = repository.get_one(db, owner_volunteer_id, row["sample_id"])
        return {"message": "Sample support submitted successfully.", "data": record}
    except IntegrityError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("samples", saved_code)
        logger.warning("Sample support constraint failure: %s", exc)
        raise HTTPException(409, "Sample support conflicts with an existing record.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("samples", saved_code)
        logger.exception("Sample support save failed")
        raise HTTPException(500, "Sample support could not be saved.") from exc


def list_samples(db: Session, volunteer_id: int, query) -> dict:
    items, total = repository.list_page(db, volunteer_id, query.model_dump())
    return {
        "success": True,
        "message": "Records fetched successfully",
        "data": {
            "items": items,
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total_records": total,
                "total_pages": ceil(total / query.page_size) if total else 0,
            },
        },
    }


def list_all_samples(db: Session, volunteer_id: int | None = None) -> list[dict]:
    return repository.list_all(db, volunteer_id)


def get_sample(
    db: Session,
    sample_id: int,
    volunteer_id: int | None = None,
    supervisor_id: int | None = None,
) -> dict:
    if sample_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="sample_id must be a positive integer greater than zero.",
        )

    raw = db.execute(
        text("SELECT volunteer_id FROM public.sample_support WHERE sample_id = :id"),
        {"id": sample_id},
    ).mappings().one_or_none()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SAMPLE_NOT_FOUND",
                "message": f"Sample support record with ID {sample_id} was not found.",
            },
        )

    if volunteer_id is not None and raw["volunteer_id"] != volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "You are not authorized to view this sample support record.",
            },
        )

    row = repository.get_one(db, raw["volunteer_id"], sample_id)
    return row
