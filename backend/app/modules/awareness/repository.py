from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def active_activity(db: Session, activity_id: int) -> dict[str, Any] | None:
    row = db.execute(text("""
        SELECT awareness_activity_id, awareness_activity_name, applicable_sectors, is_other
        FROM public.awareness_activity_master
        WHERE awareness_activity_id = :id AND is_active
    """), {"id": activity_id}).mappings().one_or_none()
    return dict(row) if row else None


def active_topic(db: Session, topic_id: int) -> dict[str, Any] | None:
    row = db.execute(text("""
        SELECT awareness_topic_id, awareness_topic_name, is_other
        FROM public.awareness_topic_master
        WHERE awareness_topic_id = :id AND is_active
    """), {"id": topic_id}).mappings().one_or_none()
    return dict(row) if row else None


def active_department(db: Session, department_id: int) -> dict[str, Any] | None:
    row = db.execute(text("""
        SELECT department_id, department_name, is_other
        FROM public.department_master
        WHERE department_id = :id AND is_active
    """), {"id": department_id}).mappings().one_or_none()
    return dict(row) if row else None


def active_village(db: Session, village_id: int) -> bool:
    return db.execute(text("""
        SELECT 1 FROM public.village_master
        WHERE village_lgd_code = :id AND is_active
    """), {"id": village_id}).scalar_one_or_none() is not None


def existing_by_client_ref(db: Session, volunteer_id: int, client_ref: str) -> dict[str, Any] | None:
    row = db.execute(text("""
        SELECT awareness_id, awareness_code, verification_status
        FROM public.awareness_activity
        WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
    """), {"volunteer_id": volunteer_id, "client_ref": client_ref}).mappings().one_or_none()
    return dict(row) if row else None


def insert(db: Session, volunteer_id: int, values: dict[str, Any]) -> dict[str, Any]:
    return dict(db.execute(text("""
        INSERT INTO public.awareness_activity (
            volunteer_id, client_ref, device_id, awareness_activity_id,
            activity_date, village_lgd_code, people_reached, awareness_topic_id,
            topic_other, department_id, department_other, latitude, longitude,
            gps_accuracy_m, gps_unavailable_reason
        ) VALUES (
            :volunteer_id, :client_ref, :device_id, :awareness_activity_id,
            :activity_date, :village_lgd_code, :people_reached, :awareness_topic_id,
            :topic_other, :department_id, :department_other, :latitude, :longitude,
            :gps_accuracy_m, :gps_unavailable_reason
        )
        RETURNING awareness_id, awareness_code, verification_status
    """), {"volunteer_id": volunteer_id, **values}).mappings().one())


def insert_attachments(
    db: Session,
    volunteer_id: int,
    awareness_id: int,
    rows: list[dict[str, Any]],
) -> None:
    for row in rows:
        db.execute(
            text(
                """
                INSERT INTO public.attachment (
                    volunteer_id, entity_type, entity_id, file_kind,
                    file_name, storage_path, mime_type, size_bytes
                ) VALUES (
                    :volunteer_id, 'AWARENESS_ACTIVITY', :entity_id, :file_kind,
                    :file_name, :storage_path, :mime_type, :size_bytes
                )
                """
            ),
            {
                "volunteer_id": volunteer_id,
                "entity_id": awareness_id,
                **row,
            },
        )


def list_page(db: Session, volunteer_id: int, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    conditions = ["a.volunteer_id = :volunteer_id"]
    params: dict[str, Any] = {
        "volunteer_id": volunteer_id,
        "limit": filters["page_size"],
        "offset": (filters["page"] - 1) * filters["page_size"],
    }
    for clause, key in (
        ("a.awareness_activity_id = :awareness_activity_id", "awareness_activity_id"),
        ("a.village_lgd_code = :village_lgd_code", "village_lgd_code"),
        ("a.department_id = :department_id", "department_id"),
        ("a.verification_status = :verification_status", "verification_status"),
        ("a.activity_date >= :from_date", "from_date"),
        ("a.activity_date <= :to_date", "to_date"),
    ):
        if filters.get(key) is not None:
            conditions.append(clause)
            params[key] = filters[key]
    if filters.get("search"):
        conditions.append("""
            (a.awareness_code ILIKE :search OR vr.volunteer_name ILIKE :search
             OR aam.awareness_activity_name ILIKE :search
             OR vh.village_name ILIKE :search)
        """)
        params["search"] = f"%{filters['search']}%"
    where = " AND ".join(conditions)
    sort_column = {"activity_date": "a.activity_date", "created_at": "a.created_at"}[filters["sort_by"]]
    direction = "ASC" if filters["sort_order"] == "asc" else "DESC"
    joins = """
        FROM public.awareness_activity a
        JOIN public.volunteer_registration vr ON vr.volunteer_id = a.volunteer_id
        JOIN public.awareness_activity_master aam ON aam.awareness_activity_id = a.awareness_activity_id
        JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = a.village_lgd_code
        LEFT JOIN public.awareness_topic_master atm ON atm.awareness_topic_id = a.awareness_topic_id
        LEFT JOIN public.department_master dm ON dm.department_id = a.department_id
    """
    total = db.execute(text(f"SELECT COUNT(*) {joins} WHERE {where}"), params).scalar_one()
    rows = db.execute(text(f"""
        SELECT a.awareness_id, a.awareness_code, a.volunteer_id, vr.volunteer_name,
               a.awareness_activity_id, aam.awareness_activity_name, a.activity_date,
               a.village_lgd_code, vh.village_name, a.people_reached,
               a.awareness_topic_id, atm.awareness_topic_name, a.topic_other,
               a.department_id, dm.department_name, a.department_other,
               a.verification_status, a.captured_at, a.created_at
        {joins}
        WHERE {where}
        ORDER BY {sort_column} {direction}, a.awareness_id DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    items = [dict(row) for row in rows]
    if items:
        attachment_rows = db.execute(
            text(
                """
                SELECT attachment_id, entity_id, file_kind, file_name,
                       storage_path, mime_type, size_bytes, caption
                FROM public.attachment
                WHERE volunteer_id = :volunteer_id
                  AND entity_type = 'AWARENESS_ACTIVITY'
                  AND entity_id = ANY(:awareness_ids)
                ORDER BY attachment_id
                """
            ),
            {
                "volunteer_id": volunteer_id,
                "awareness_ids": [item["awareness_id"] for item in items],
            },
        ).mappings().all()
        attachments_by_activity: dict[int, list[dict]] = {}
        for attachment in attachment_rows:
            item = dict(attachment)
            awareness_id = item.pop("entity_id")
            attachments_by_activity.setdefault(awareness_id, []).append(item)
        for item in items:
            item["attachments"] = attachments_by_activity.get(
                item["awareness_id"],
                [],
            )
    return items, int(total)


def list_all(db: Session, volunteer_id: int) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT a.awareness_id, a.awareness_code, a.volunteer_id,
                   vr.volunteer_name, a.awareness_activity_id,
                   aam.awareness_activity_name, a.activity_date,
                   a.village_lgd_code, vh.village_name, a.people_reached,
                   a.awareness_topic_id, atm.awareness_topic_name, a.topic_other,
                   a.department_id, dm.department_name, a.department_other,
                   a.verification_status, a.captured_at, a.created_at
            FROM public.awareness_activity a
            JOIN public.volunteer_registration vr
              ON vr.volunteer_id = a.volunteer_id
            JOIN public.awareness_activity_master aam
              ON aam.awareness_activity_id = a.awareness_activity_id
            JOIN public.v_village_hierarchy vh
              ON vh.village_lgd_code = a.village_lgd_code
            LEFT JOIN public.awareness_topic_master atm
              ON atm.awareness_topic_id = a.awareness_topic_id
            LEFT JOIN public.department_master dm
              ON dm.department_id = a.department_id
            WHERE a.volunteer_id = :volunteer_id
            ORDER BY a.activity_date DESC, a.awareness_id DESC
            """
        ),
        {"volunteer_id": volunteer_id},
    ).mappings().all()
    items = [dict(row) for row in rows]
    add_attachments(db, volunteer_id, items)
    return items


def add_attachments(db: Session, volunteer_id: int, items: list[dict]) -> None:
    if not items:
        return
    rows = db.execute(
        text(
            """
            SELECT attachment_id, entity_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            WHERE volunteer_id = :volunteer_id
              AND entity_type = 'AWARENESS_ACTIVITY'
              AND entity_id = ANY(:entity_ids)
            ORDER BY attachment_id
            """
        ),
        {
            "volunteer_id": volunteer_id,
            "entity_ids": [item["awareness_id"] for item in items],
        },
    ).mappings().all()
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        attachment = dict(row)
        entity_id = attachment.pop("entity_id")
        grouped.setdefault(entity_id, []).append(attachment)
    for item in items:
        item["attachments"] = grouped.get(item["awareness_id"], [])


def list_activity_types(db: Session) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(text("""
        SELECT awareness_activity_id, awareness_activity_name, applicable_sectors, is_other
        FROM public.awareness_activity_master WHERE is_active
        ORDER BY sort_order, awareness_activity_name
    """)).mappings().all()]


def list_topics(db: Session) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(text("""
        SELECT awareness_topic_id, awareness_topic_name, is_other
        FROM public.awareness_topic_master WHERE is_active
        ORDER BY sort_order, awareness_topic_name
    """)).mappings().all()]
