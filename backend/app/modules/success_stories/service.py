import logging
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.events import attachments
from app.modules.success_stories import repository
from app.modules.success_stories.schemas import SuccessStoryCreate

logger = logging.getLogger(__name__)


def create_story(
    db: Session, owner_volunteer_id: int, data: SuccessStoryCreate
) -> dict:
    if data.volunteer_id != owner_volunteer_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You can only submit your own success stories.",
        )
    if not repository.volunteer_exists(db, data.volunteer_id):
        raise HTTPException(404, "Volunteer not found.")
    if data.department_id is not None:
        department = repository.active_department(db, data.department_id)
        if department is None:
            raise HTTPException(422, "Department is invalid or inactive.")
        if department["is_other"] and not data.department_other:
            raise HTTPException(
                422,
                "department_other is required for the selected department.",
            )
    if data.client_ref:
        existing = repository.existing_by_client_ref(
            db, owner_volunteer_id, data.client_ref
        )
        if existing:
            record = repository.get_one(
                db, owner_volunteer_id, existing["story_id"]
            )
            return {
                "message": "Success story already submitted.",
                "data": record,
            }

    ready_files = attachments.read_all(
        {"photos": data.photos, "videos": data.videos, "documents": data.documents}
    )
    values = data.model_dump()
    values.pop("photos", None)
    values.pop("videos", None)
    values.pop("documents", None)
    saved_code = None
    try:
        created = repository.insert(db, values)
        saved_code = created["story_code"]
        if ready_files:
            rows = attachments.save_files("success_stories", saved_code, ready_files)
            attachments.insert_attachments(
                db, owner_volunteer_id, "SUCCESS_STORY", created["story_id"], rows
            )
        db.commit()
        record = repository.get_one(db, owner_volunteer_id, created["story_id"])
        return {
            "message": "Success story submitted successfully.",
            "data": record,
        }
    except IntegrityError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("success_stories", saved_code)
        logger.warning("Success story constraint failure: %s", exc)
        raise HTTPException(
            409, "Success story conflicts with an existing record."
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("success_stories", saved_code)
        logger.exception("Success story save failed")
        raise HTTPException(
            500, "Success story could not be saved."
        ) from exc
    except Exception:
        db.rollback()
        if saved_code:
            attachments.delete_files("success_stories", saved_code)
        raise


def list_stories(db: Session, volunteer_id: int, query) -> dict:
    items, total = repository.list_page(
        db, volunteer_id, query.model_dump()
    )
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


def list_all_stories(db: Session, volunteer_id: int | None = None) -> list[dict]:
    return repository.list_all(db, volunteer_id)


def get_story(
    db: Session,
    story_id: int,
    volunteer_id: int | None = None,
    supervisor_id: int | None = None,
) -> dict:
    if story_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="story_id must be a positive integer greater than zero.",
        )

    raw = db.execute(
        text("SELECT volunteer_id FROM public.success_story WHERE story_id = :id"),
        {"id": story_id},
    ).mappings().one_or_none()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "STORY_NOT_FOUND",
                "message": f"Success story with ID {story_id} was not found.",
            },
        )

    if volunteer_id is not None and raw["volunteer_id"] != volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "You are not authorized to view this success story.",
            },
        )

    record = repository.get_one(db, raw["volunteer_id"], story_id)
    return record
