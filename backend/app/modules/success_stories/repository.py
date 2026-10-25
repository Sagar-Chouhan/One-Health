from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.events import attachments


def active_department(db: Session, department_id: int) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT department_id, department_name, is_other
            FROM public.department_master
            WHERE department_id = :department_id AND is_active
            """
        ),
        {"department_id": department_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def list_departments(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT department_id, department_name
            FROM public.department_master
            WHERE is_active
            ORDER BY sort_order, department_name
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]


def volunteer_exists(db: Session, volunteer_id: int) -> bool:
    return db.execute(
        text(
            """
            SELECT 1
            FROM public.volunteer_registration
            WHERE volunteer_id = :volunteer_id AND status = 'ACTIVE'
            """
        ),
        {"volunteer_id": volunteer_id},
    ).scalar_one_or_none() is not None


def existing_by_client_ref(
    db: Session, volunteer_id: int, client_ref: str
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT story_id, story_code, verification_status
            FROM public.success_story
            WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
            """
        ),
        {"volunteer_id": volunteer_id, "client_ref": client_ref},
    ).mappings().one_or_none()
    return dict(row) if row else None


def insert(db: Session, values: dict[str, Any]) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO public.success_story (
                volunteer_id, client_ref, device_id, title, story_date,
                location_text, one_health_issue, situation, action_taken,
                department_id, department_other, outcome, community_benefit,
                lessons_learned, is_innovation, latitude, longitude,
                gps_accuracy_m, gps_unavailable_reason
            ) VALUES (
                :volunteer_id, :client_ref, :device_id, :title, :story_date,
                :location_text, :one_health_issue, :situation, :action_taken,
                :department_id, :department_other, :outcome, :community_benefit,
                :lessons_learned, :is_innovation, :latitude, :longitude,
                :gps_accuracy_m, :gps_unavailable_reason
            )
            RETURNING story_id, story_code, verification_status
            """
        ),
        values,
    ).mappings().one()
    return dict(row)


_SELECT_COLUMNS = """
    s.story_id, s.story_code, s.volunteer_id, vr.volunteer_name,
    s.title, s.story_date, s.location_text, s.one_health_issue,
    s.situation, s.action_taken, s.department_id, dm.department_name,
    s.department_other, s.outcome, s.community_benefit, s.lessons_learned,
    s.is_innovation, s.latitude, s.longitude, s.gps_accuracy_m,
    s.gps_unavailable_reason, s.verification_status, s.captured_at,
    s.created_at, s.updated_at
"""

_JOINS = """
    FROM public.success_story s
    JOIN public.volunteer_registration vr ON vr.volunteer_id = s.volunteer_id
    LEFT JOIN public.department_master dm ON dm.department_id = s.department_id
"""


def get_one(
    db: Session, volunteer_id: int, story_id: int
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            f"""
            SELECT {_SELECT_COLUMNS}
            {_JOINS}
            WHERE s.volunteer_id = :volunteer_id AND s.story_id = :story_id
            """
        ),
        {"volunteer_id": volunteer_id, "story_id": story_id},
    ).mappings().one_or_none()
    if not row:
        return None
    item = dict(row)
    item["attachments"] = attachments.get_attachments_for_entity(
        db, "SUCCESS_STORY", story_id
    )
    return item


def list_page(
    db: Session, volunteer_id: int, filters: dict[str, Any]
) -> tuple[list[dict[str, Any]], int]:
    conditions = ["s.volunteer_id = :volunteer_id"]
    params: dict[str, Any] = {
        "volunteer_id": volunteer_id,
        "limit": filters["page_size"],
        "offset": (filters["page"] - 1) * filters["page_size"],
    }
    if filters.get("department_id") is not None:
        conditions.append("s.department_id = :department_id")
        params["department_id"] = filters["department_id"]
    if filters.get("verification_status") is not None:
        conditions.append("s.verification_status = :verification_status")
        params["verification_status"] = filters["verification_status"]
    if filters.get("from_date") is not None:
        conditions.append("s.story_date >= :from_date")
        params["from_date"] = filters["from_date"]
    if filters.get("to_date") is not None:
        conditions.append("s.story_date <= :to_date")
        params["to_date"] = filters["to_date"]
    if filters.get("search"):
        conditions.append(
            """
            (s.story_code ILIKE :search
             OR s.title ILIKE :search
             OR s.one_health_issue ILIKE :search
             OR s.location_text ILIKE :search
             OR vr.volunteer_name ILIKE :search
             OR dm.department_name ILIKE :search)
            """
        )
        params["search"] = f"%{filters['search']}%"

    where = " AND ".join(conditions)
    sort_column = {
        "story_date": "s.story_date",
        "created_at": "s.created_at",
        "updated_at": "s.updated_at",
    }[filters["sort_by"]]
    direction = "ASC" if filters["sort_order"] == "asc" else "DESC"
    total = db.execute(
        text(f"SELECT COUNT(*) {_JOINS} WHERE {where}"), params
    ).scalar_one()
    rows = db.execute(
        text(
            f"""
            SELECT {_SELECT_COLUMNS}
            {_JOINS}
            WHERE {where}
            ORDER BY {sort_column} {direction}, s.story_id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    attachments.attach_to_items(db, "SUCCESS_STORY", items, "story_id")
    return items, int(total)


def list_all(db: Session, volunteer_id: int | None = None) -> list[dict[str, Any]]:
    where_sql = "WHERE s.volunteer_id = :volunteer_id" if volunteer_id is not None else "WHERE 1=1"
    params: dict[str, Any] = {}
    if volunteer_id is not None:
        params["volunteer_id"] = volunteer_id

    rows = db.execute(
        text(
            f"""
            SELECT {_SELECT_COLUMNS}
            {_JOINS}
            {where_sql}
            ORDER BY s.story_date DESC, s.story_id DESC
            """
        ),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    attachments.attach_to_items(db, "SUCCESS_STORY", items, "story_id")
    return items
