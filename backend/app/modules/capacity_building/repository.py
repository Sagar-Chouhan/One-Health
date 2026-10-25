"""Capacity Building repository.

Handles data access for training_master, training_imparted, and training_attended tables.
Uses SQLAlchemy parameterized queries to prevent SQL injection and ensure maximum performance.
"""

from typing import Any
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.events import attachments


# ============================================================================
# Training Master Repository
# ============================================================================

def list_active_training_masters(db: Session) -> list[dict[str, Any]]:
    """Return all active training master records ordered by sort_order."""
    query = text(
        """
        SELECT training_id, training_name, is_other, sort_order
        FROM public.training_master
        WHERE is_active = true
        ORDER BY sort_order ASC, training_id ASC
        """
    )
    rows = db.execute(query).mappings().all()
    return [dict(r) for r in rows]


def get_active_training_master(db: Session, training_id: int) -> dict[str, Any] | None:
    """Check if a training master item exists and is active."""
    query = text(
        """
        SELECT training_id, training_name, is_other, sort_order
        FROM public.training_master
        WHERE training_id = :training_id AND is_active = true
        """
    )
    row = db.execute(query, {"training_id": training_id}).mappings().one_or_none()
    return dict(row) if row else None


def volunteer_exists(db: Session, volunteer_id: int) -> bool:
    """Check if volunteer exists in volunteer_registration."""
    query = text(
        """
        SELECT 1 FROM public.volunteer_registration
        WHERE volunteer_id = :id
        """
    )
    return db.execute(query, {"id": volunteer_id}).scalar_one_or_none() is not None


# ============================================================================
# Training Imparted Repository
# ============================================================================

def imparted_existing_by_client_ref(
    db: Session, volunteer_id: int, client_ref: str
) -> dict[str, Any] | None:
    """Find an existing training imparted record by volunteer and client_ref."""
    query = text(
        """
        SELECT training_imparted_id, training_imparted_code
        FROM public.training_imparted
        WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
        LIMIT 1
        """
    )
    row = db.execute(
        query, {"volunteer_id": volunteer_id, "client_ref": client_ref}
    ).mappings().one_or_none()
    return dict(row) if row else None


def insert_training_imparted(
    db: Session, volunteer_id: int, data: dict[str, Any]
) -> int:
    """Insert a new training imparted record and return its primary key."""
    query = text(
        """
        INSERT INTO public.training_imparted (
            volunteer_id,
            client_ref,
            device_id,
            training_id,
            training_date,
            organised_by,
            duration,
            remarks,
            captured_at,
            verification_status
        ) VALUES (
            :volunteer_id,
            :client_ref,
            :device_id,
            :training_id,
            :training_date,
            :organised_by,
            :duration,
            :remarks,
            COALESCE(:captured_at, clock_timestamp()),
            'SUBMITTED'
        )
        RETURNING training_imparted_id, training_imparted_code
        """
    )
    row = db.execute(
        query,
        {
            "volunteer_id": volunteer_id,
            "client_ref": data.get("client_ref"),
            "device_id": data.get("device_id"),
            "training_id": data["training_id"],
            "training_date": data["training_date"],
            "organised_by": data.get("organised_by"),
            "duration": data.get("duration"),
            "remarks": data.get("remarks"),
            "captured_at": data.get("captured_at"),
        },
    ).mappings().one()
    return dict(row)


def get_training_imparted_by_id(
    db: Session, training_imparted_id: int, volunteer_id: int | None = None
) -> dict[str, Any] | None:
    """Fetch a single training imparted record by ID with volunteer ownership check."""
    conditions = ["ti.training_imparted_id = :training_imparted_id"]
    params: dict[str, Any] = {"training_imparted_id": training_imparted_id}

    if volunteer_id is not None:
        conditions.append("ti.volunteer_id = :volunteer_id")
        params["volunteer_id"] = volunteer_id

    where_clause = " AND ".join(conditions)
    query = text(
        f"""
        SELECT ti.training_imparted_id,
               ti.training_imparted_code,
               ti.volunteer_id,
               vr.volunteer_name,
               ti.client_ref,
               ti.device_id,
               ti.training_id,
               tm.training_name,
               ti.training_date,
               ti.organised_by,
               ti.duration,
               ti.remarks,
               ti.captured_at,
               ti.verification_status,
               ti.created_at,
               ti.updated_at
        FROM public.training_imparted ti
        JOIN public.volunteer_registration vr ON vr.volunteer_id = ti.volunteer_id
        JOIN public.training_master tm ON tm.training_id = ti.training_id
        WHERE {where_clause}
        """
    )
    row = db.execute(query, params).mappings().one_or_none()
    if not row:
        return None
    item = dict(row)
    item["attachments"] = attachments.get_attachments_for_entity(
        db, "TRAINING_IMPARTED", training_imparted_id
    )
    return item


def list_training_imparted(
    db: Session,
    volunteer_id: int,
    filters: dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """List paginated training imparted records belonging to the authenticated volunteer."""
    conditions = ["ti.volunteer_id = :volunteer_id"]
    params: dict[str, Any] = {
        "volunteer_id": volunteer_id,
        "limit": limit,
        "offset": offset,
    }

    if filters.get("training_id") is not None:
        conditions.append("ti.training_id = :training_id")
        params["training_id"] = filters["training_id"]

    if filters.get("date_from") is not None:
        conditions.append("ti.training_date >= :date_from")
        params["date_from"] = filters["date_from"]

    if filters.get("date_to") is not None:
        conditions.append("ti.training_date <= :date_to")
        params["date_to"] = filters["date_to"]

    if filters.get("verification_status") is not None:
        conditions.append("ti.verification_status = :verification_status")
        params["verification_status"] = filters["verification_status"]

    where_clause = " AND ".join(conditions)

    count_query = text(
        f"""
        SELECT COUNT(*)
        FROM public.training_imparted ti
        WHERE {where_clause}
        """
    )
    total = db.execute(count_query, params).scalar_one()

    data_query = text(
        f"""
        SELECT ti.training_imparted_id,
               ti.training_imparted_code,
               ti.volunteer_id,
               vr.volunteer_name,
               ti.client_ref,
               ti.device_id,
               ti.training_id,
               tm.training_name,
               ti.training_date,
               ti.organised_by,
               ti.duration,
               ti.remarks,
               ti.captured_at,
               ti.verification_status,
               ti.created_at,
               ti.updated_at
        FROM public.training_imparted ti
        JOIN public.volunteer_registration vr ON vr.volunteer_id = ti.volunteer_id
        JOIN public.training_master tm ON tm.training_id = ti.training_id
        WHERE {where_clause}
        ORDER BY ti.training_date DESC, ti.training_imparted_id DESC
        LIMIT :limit OFFSET :offset
        """
    )
    rows = db.execute(data_query, params).mappings().all()
    items = [dict(r) for r in rows]
    attachments.attach_to_items(db, "TRAINING_IMPARTED", items, "training_imparted_id")
    return items, total


# ============================================================================
# Training Attended Repository
# ============================================================================

def attended_existing_by_client_ref(
    db: Session, volunteer_id: int, client_ref: str
) -> dict[str, Any] | None:
    """Find an existing training attended record by volunteer and client_ref."""
    query = text(
        """
        SELECT training_attended_id, training_attended_code
        FROM public.training_attended
        WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
        LIMIT 1
        """
    )
    row = db.execute(
        query, {"volunteer_id": volunteer_id, "client_ref": client_ref}
    ).mappings().one_or_none()
    return dict(row) if row else None


def insert_training_attended(
    db: Session, volunteer_id: int, data: dict[str, Any]
) -> int:
    """Insert a new training attended record and return its primary key."""
    query = text(
        """
        INSERT INTO public.training_attended (
            volunteer_id,
            client_ref,
            device_id,
            training_id,
            training_date,
            venue,
            chaired_by,
            key_points,
            certificate_issued,
            captured_at,
            verification_status
        ) VALUES (
            :volunteer_id,
            :client_ref,
            :device_id,
            :training_id,
            :training_date,
            :venue,
            :chaired_by,
            :key_points,
            :certificate_issued,
            COALESCE(:captured_at, clock_timestamp()),
            'SUBMITTED'
        )
        RETURNING training_attended_id, training_attended_code
        """
    )
    row = db.execute(
        query,
        {
            "volunteer_id": volunteer_id,
            "client_ref": data.get("client_ref"),
            "device_id": data.get("device_id"),
            "training_id": data["training_id"],
            "training_date": data["training_date"],
            "venue": data.get("venue"),
            "chaired_by": data.get("chaired_by"),
            "key_points": data.get("key_points"),
            "certificate_issued": data.get("certificate_issued", False),
            "captured_at": data.get("captured_at"),
        },
    ).mappings().one()
    return dict(row)


def get_training_attended_by_id(
    db: Session, training_attended_id: int, volunteer_id: int | None = None
) -> dict[str, Any] | None:
    """Fetch a single training attended record by ID with volunteer ownership check."""
    conditions = ["ta.training_attended_id = :training_attended_id"]
    params: dict[str, Any] = {"training_attended_id": training_attended_id}

    if volunteer_id is not None:
        conditions.append("ta.volunteer_id = :volunteer_id")
        params["volunteer_id"] = volunteer_id

    where_clause = " AND ".join(conditions)
    query = text(
        f"""
        SELECT ta.training_attended_id,
               ta.training_attended_code,
               ta.volunteer_id,
               vr.volunteer_name,
               ta.client_ref,
               ta.device_id,
               ta.training_id,
               tm.training_name,
               ta.training_date,
               ta.venue,
               ta.chaired_by,
               ta.key_points,
               ta.certificate_issued,
               ta.captured_at,
               ta.verification_status,
               ta.created_at,
               ta.updated_at
        FROM public.training_attended ta
        JOIN public.volunteer_registration vr ON vr.volunteer_id = ta.volunteer_id
        JOIN public.training_master tm ON tm.training_id = ta.training_id
        WHERE {where_clause}
        """
    )
    row = db.execute(query, params).mappings().one_or_none()
    if not row:
        return None
    item = dict(row)
    item["attachments"] = attachments.get_attachments_for_entity(
        db, "TRAINING_ATTENDED", training_attended_id
    )
    return item


def list_training_attended(
    db: Session,
    volunteer_id: int,
    filters: dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """List paginated training attended records belonging to the authenticated volunteer."""
    conditions = ["ta.volunteer_id = :volunteer_id"]
    params: dict[str, Any] = {
        "volunteer_id": volunteer_id,
        "limit": limit,
        "offset": offset,
    }

    if filters.get("training_id") is not None:
        conditions.append("ta.training_id = :training_id")
        params["training_id"] = filters["training_id"]

    if filters.get("date_from") is not None:
        conditions.append("ta.training_date >= :date_from")
        params["date_from"] = filters["date_from"]

    if filters.get("date_to") is not None:
        conditions.append("ta.training_date <= :date_to")
        params["date_to"] = filters["date_to"]

    if filters.get("verification_status") is not None:
        conditions.append("ta.verification_status = :verification_status")
        params["verification_status"] = filters["verification_status"]

    if filters.get("certificate_issued") is not None:
        conditions.append("ta.certificate_issued = :certificate_issued")
        params["certificate_issued"] = filters["certificate_issued"]

    where_clause = " AND ".join(conditions)

    count_query = text(
        f"""
        SELECT COUNT(*)
        FROM public.training_attended ta
        WHERE {where_clause}
        """
    )
    total = db.execute(count_query, params).scalar_one()

    data_query = text(
        f"""
        SELECT ta.training_attended_id,
               ta.training_attended_code,
               ta.volunteer_id,
               vr.volunteer_name,
               ta.client_ref,
               ta.device_id,
               ta.training_id,
               tm.training_name,
               ta.training_date,
               ta.venue,
               ta.chaired_by,
               ta.key_points,
               ta.certificate_issued,
               ta.captured_at,
               ta.verification_status,
               ta.created_at,
               ta.updated_at
        FROM public.training_attended ta
        JOIN public.volunteer_registration vr ON vr.volunteer_id = ta.volunteer_id
        JOIN public.training_master tm ON tm.training_id = ta.training_id
        WHERE {where_clause}
        ORDER BY ta.training_date DESC, ta.training_attended_id DESC
        LIMIT :limit OFFSET :offset
        """
    )
    rows = db.execute(data_query, params).mappings().all()
    items = [dict(r) for r in rows]
    attachments.attach_to_items(db, "TRAINING_ATTENDED", items, "training_attended_id")
    return items, total
