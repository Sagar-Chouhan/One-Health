import logging
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.events.schemas import SECTOR_OF_COHV_TYPE
from app.modules.awareness import repository
from app.modules.awareness.schemas import AwarenessActivityCreate
from app.modules.events import attachments

logger = logging.getLogger(__name__)


def create_activity(db: Session, volunteer_id: int, data: AwarenessActivityCreate) -> dict:
    activity = repository.active_activity(db, data.awareness_activity_id)
    if activity is None:
        raise HTTPException(422, "Awareness activity is invalid or inactive.")

    scope = db.execute(
        text("""
            SELECT department_name AS cohv_type FROM public.volunteer_registration
            WHERE volunteer_id = :id
        """), {"id": volunteer_id}
    ).scalar_one_or_none()
    if scope is None:
        raise HTTPException(404, "Volunteer not found.")
    sector = SECTOR_OF_COHV_TYPE.get(scope)
    if sector and sector not in activity["applicable_sectors"]:
        raise HTTPException(422, "Activity is not valid for your COHV sector.")
    if not repository.active_village(db, data.village_lgd_code):
        raise HTTPException(422, "Village is invalid or inactive.")
    if data.awareness_topic_id is not None:
        topic = repository.active_topic(db, data.awareness_topic_id)
        if topic is None:
            raise HTTPException(422, "Awareness topic is invalid or inactive.")
        if topic["is_other"] and not data.topic_other:
            raise HTTPException(422, "topic_other is required for the selected topic.")
    if data.department_id is not None:
        department = repository.active_department(db, data.department_id)
        if department is None:
            raise HTTPException(422, "Department is invalid or inactive.")
        if department["is_other"] and not data.department_other:
            raise HTTPException(422, "department_other is required for the selected department.")
    if data.client_ref:
        existing = repository.existing_by_client_ref(db, volunteer_id, data.client_ref)
        if existing:
            return {"message": "Awareness activity already submitted.", **existing, "duplicate": True}

    ready_files = attachments.read_all(
        {"photos": data.photos, "documents": data.documents}
    )
    values = data.model_dump()
    values.pop("photos", None)
    values.pop("documents", None)
    saved_code = None
    try:
        row = repository.insert(db, volunteer_id, values)
        saved_code = row["awareness_code"]
        if ready_files:
            rows = attachments.save_files("awareness", saved_code, ready_files)
            repository.insert_attachments(db, volunteer_id, row["awareness_id"], rows)
        db.commit()
        return {"message": "Awareness activity submitted successfully.", **row, "duplicate": False}
    except IntegrityError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("awareness", saved_code)
        logger.warning("Awareness activity constraint failure: %s", exc)
        raise HTTPException(409, "Awareness activity conflicts with an existing record.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("awareness", saved_code)
        logger.exception("Awareness activity save failed")
        raise HTTPException(500, "Awareness activity could not be saved.") from exc


def list_activities(db: Session, volunteer_id: int, query) -> dict:
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


def list_all_activities(db: Session, volunteer_id: int) -> list[dict]:
    return repository.list_all(db, volunteer_id)


def get_activity_by_id(
    db: Session,
    awareness_id: int,
    volunteer_id: int | None = None,
    supervisor_id: int | None = None,
) -> dict:
    if awareness_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="awareness_id must be a positive integer greater than zero.",
        )

    record = repository.get_by_id(db, awareness_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "AWARENESS_NOT_FOUND",
                "message": f"Awareness activity with ID {awareness_id} was not found.",
            },
        )

    if volunteer_id is not None and record["volunteer_id"] != volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "You are not authorized to view this awareness activity.",
            },
        )

    return record
