"""Capacity Building service layer.

Implements business logic, validations, idempotency handling, and transactions
for Training Master, Training Imparted, and Training Attended.
"""

import logging
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.capacity_building import repository
from app.modules.capacity_building.schemas import (
    TrainingAttendedCreate,
    TrainingImpartedCreate,
)
from app.modules.events import attachments

logger = logging.getLogger(__name__)


# ============================================================================
# Training Master Service
# ============================================================================

def list_training_masters(db: Session) -> list[dict[str, Any]]:
    """Return all active training master records ordered by sort_order."""
    return repository.list_active_training_masters(db)


# ============================================================================
# Training Imparted Service
# ============================================================================

def create_training_imparted(
    db: Session,
    owner_volunteer_id: int,
    data: TrainingImpartedCreate,
) -> dict[str, Any]:
    """Validate and insert a new training imparted record.

    Ensures the volunteer exists, the training type is valid and active,
    and handles idempotent submission via client_ref.
    """
    if not repository.volunteer_exists(db, owner_volunteer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found.",
        )

    training_master = repository.get_active_training_master(db, data.training_id)
    if not training_master:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Training type is invalid or inactive.",
        )

    # Check idempotency via client_ref
    if data.client_ref:
        existing = repository.imparted_existing_by_client_ref(
            db, owner_volunteer_id, data.client_ref
        )
        if existing:
            record = repository.get_training_imparted_by_id(
                db, existing["training_imparted_id"], owner_volunteer_id
            )
            return {
                "success": True,
                "message": "Training imparted record already submitted.",
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
        row = repository.insert_training_imparted(
            db, owner_volunteer_id, values
        )
        record_id = row["training_imparted_id"]
        saved_code = row["training_imparted_code"]
        if ready_files:
            rows = attachments.save_files("training_imparted", saved_code, ready_files)
            attachments.insert_attachments(
                db, owner_volunteer_id, "TRAINING_IMPARTED", record_id, rows
            )
        db.commit()
        record = repository.get_training_imparted_by_id(
            db, record_id, owner_volunteer_id
        )
        return {
            "success": True,
            "message": "Training imparted record created successfully",
            "data": record,
        }
    except IntegrityError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("training_imparted", saved_code)
        logger.warning("Training imparted constraint failure: %s", exc)
        if data.client_ref:
            existing = repository.imparted_existing_by_client_ref(
                db, owner_volunteer_id, data.client_ref
            )
            if existing:
                record = repository.get_training_imparted_by_id(
                    db, existing["training_imparted_id"], owner_volunteer_id
                )
                return {
                    "success": True,
                    "message": "Training imparted record already submitted.",
                    "data": record,
                }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Training imparted record conflicts with an existing record.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("training_imparted", saved_code)
        logger.exception("Training imparted save failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Training imparted record could not be saved.",
        ) from exc


def get_training_imparted(
    db: Session,
    training_imparted_id: int,
    owner_volunteer_id: int,
) -> dict[str, Any]:
    """Retrieve a single training imparted record by ID, verifying ownership."""
    record = repository.get_training_imparted_by_id(
        db, training_imparted_id, owner_volunteer_id
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training imparted record not found.",
        )
    return {
        "success": True,
        "message": "Training imparted record fetched successfully",
        "data": record,
    }


def list_training_imparted(
    db: Session,
    owner_volunteer_id: int,
    filters: dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    """List paginated training imparted records belonging to the authenticated volunteer."""
    if filters.get("date_from") and filters.get("date_to"):
        if filters["date_from"] > filters["date_to"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from cannot be greater than date_to.",
            )

    items, total = repository.list_training_imparted(
        db=db,
        volunteer_id=owner_volunteer_id,
        filters=filters,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "message": "Training imparted records fetched successfully",
        "data": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items,
        },
    }


# ============================================================================
# Training Attended Service
# ============================================================================

def create_training_attended(
    db: Session,
    owner_volunteer_id: int,
    data: TrainingAttendedCreate,
) -> dict[str, Any]:
    """Validate and insert a new training attended record.

    Ensures the volunteer exists, the training type is valid and active,
    and handles idempotent submission via client_ref.
    """
    if not repository.volunteer_exists(db, owner_volunteer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found.",
        )

    training_master = repository.get_active_training_master(db, data.training_id)
    if not training_master:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Training type is invalid or inactive.",
        )

    # Check idempotency via client_ref
    if data.client_ref:
        existing = repository.attended_existing_by_client_ref(
            db, owner_volunteer_id, data.client_ref
        )
        if existing:
            record = repository.get_training_attended_by_id(
                db, existing["training_attended_id"], owner_volunteer_id
            )
            return {
                "success": True,
                "message": "Training attended record already submitted.",
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
        row = repository.insert_training_attended(
            db, owner_volunteer_id, values
        )
        record_id = row["training_attended_id"]
        saved_code = row["training_attended_code"]
        if ready_files:
            rows = attachments.save_files("training_attended", saved_code, ready_files)
            attachments.insert_attachments(
                db, owner_volunteer_id, "TRAINING_ATTENDED", record_id, rows
            )
        db.commit()
        record = repository.get_training_attended_by_id(
            db, record_id, owner_volunteer_id
        )
        return {
            "success": True,
            "message": "Training attended record created successfully",
            "data": record,
        }
    except IntegrityError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("training_attended", saved_code)
        logger.warning("Training attended constraint failure: %s", exc)
        if data.client_ref:
            existing = repository.attended_existing_by_client_ref(
                db, owner_volunteer_id, data.client_ref
            )
            if existing:
                record = repository.get_training_attended_by_id(
                    db, existing["training_attended_id"], owner_volunteer_id
                )
                return {
                    "success": True,
                    "message": "Training attended record already submitted.",
                    "data": record,
                }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Training attended record conflicts with an existing record.",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        if saved_code:
            attachments.delete_files("training_attended", saved_code)
        logger.exception("Training attended save failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Training attended record could not be saved.",
        ) from exc


def get_training_attended(
    db: Session,
    training_attended_id: int,
    owner_volunteer_id: int,
) -> dict[str, Any]:
    """Retrieve a single training attended record by ID, verifying ownership."""
    record = repository.get_training_attended_by_id(
        db, training_attended_id, owner_volunteer_id
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training attended record not found.",
        )
    return {
        "success": True,
        "message": "Training attended record fetched successfully",
        "data": record,
    }


def list_training_attended(
    db: Session,
    owner_volunteer_id: int,
    filters: dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    """List paginated training attended records belonging to the authenticated volunteer."""
    if filters.get("date_from") and filters.get("date_to"):
        if filters["date_from"] > filters["date_to"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from cannot be greater than date_to.",
            )

    items, total = repository.list_training_attended(
        db=db,
        volunteer_id=owner_volunteer_id,
        filters=filters,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "message": "Training attended records fetched successfully",
        "data": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items,
        },
    }
