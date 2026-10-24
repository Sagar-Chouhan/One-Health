from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def list_types(db: Session) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in db.execute(
            text(
                """
                SELECT sample_type_id, sample_type_name,
                       applicable_sectors, is_other
                FROM public.sample_type_master
                WHERE is_active
                ORDER BY sort_order, sample_type_name
                """
            )
        ).mappings().all()
    ]


def sample_type(db: Session, sample_type_id: int) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT sample_type_id, sample_type_name, applicable_sectors
            FROM public.sample_type_master
            WHERE sample_type_id = :id AND is_active
            """
        ),
        {"id": sample_type_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def village_is_active(db: Session, village_lgd_code: int) -> bool:
    return db.execute(
        text(
            """
            SELECT 1 FROM public.village_master
            WHERE village_lgd_code = :id AND is_active
            """
        ),
        {"id": village_lgd_code},
    ).scalar_one_or_none() is not None


def volunteer_exists(db: Session, volunteer_id: int) -> bool:
    return db.execute(
        text(
            """
            SELECT 1 FROM public.volunteer_registration
            WHERE volunteer_id = :id
            """
        ),
        {"id": volunteer_id},
    ).scalar_one_or_none() is not None


def existing_by_client_ref(
    db: Session,
    volunteer_id: int,
    client_ref: str,
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT sample_id, sample_code, verification_status
            FROM public.sample_support
            WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
            """
        ),
        {"volunteer_id": volunteer_id, "client_ref": client_ref},
    ).mappings().one_or_none()
    return dict(row) if row else None


def insert(db: Session, values: dict[str, Any]) -> dict[str, Any]:
    return dict(
        db.execute(
            text(
                """
                INSERT INTO public.sample_support (
                    volunteer_id, client_ref, device_id, sample_type_id,
                    sample_date, sample_count, village_lgd_code,
                    latitude, longitude, gps_accuracy_m,
                    gps_unavailable_reason, captured_at
                ) VALUES (
                    :volunteer_id, :client_ref, :device_id, :sample_type_id,
                    :sample_date, :sample_count, :village_lgd_code,
                    :latitude, :longitude, :gps_accuracy_m,
                    :gps_unavailable_reason, COALESCE(:captured_at, CURRENT_TIMESTAMP)
                )
                RETURNING sample_id, sample_code, verification_status
                """
            ),
            values,
        ).mappings().one()
    )


def get_one(db: Session, volunteer_id: int, sample_id: int) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT s.sample_id, s.sample_code, s.volunteer_id,
                   vr.volunteer_name, vr.department_name AS cohv_type, s.sample_type_id,
                   stm.sample_type_name, s.sample_date, s.sample_count,
                   s.village_lgd_code, vh.village_name,
                   s.verification_status, s.captured_at, s.created_at
            FROM public.sample_support s
            JOIN public.volunteer_registration vr
              ON vr.volunteer_id = s.volunteer_id
            JOIN public.sample_type_master stm
              ON stm.sample_type_id = s.sample_type_id
            JOIN public.v_village_hierarchy vh
              ON vh.village_lgd_code = s.village_lgd_code
            WHERE s.volunteer_id = :volunteer_id
              AND s.sample_id = :sample_id
            """
        ),
        {"volunteer_id": volunteer_id, "sample_id": sample_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def list_page(
    db: Session,
    volunteer_id: int,
    filters: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    conditions = ["s.volunteer_id = :owner_volunteer_id"]
    params: dict[str, Any] = {
        "owner_volunteer_id": volunteer_id,
        "limit": filters["page_size"],
        "offset": (filters["page"] - 1) * filters["page_size"],
    }
    for clause, key in (
        ("s.sample_type_id = :sample_type_id", "sample_type_id"),
        ("s.village_lgd_code = :village_lgd_code", "village_lgd_code"),
        ("s.verification_status = :verification_status", "verification_status"),
        ("s.sample_date >= :from_date", "from_date"),
        ("s.sample_date <= :to_date", "to_date"),
    ):
        if filters.get(key) is not None:
            conditions.append(clause)
            params[key] = filters[key]
    if filters.get("volunteer_id") is not None:
        if filters["volunteer_id"] != volunteer_id:
            return [], 0
        conditions.append("s.volunteer_id = :filter_volunteer_id")
        params["filter_volunteer_id"] = filters["volunteer_id"]
    if filters.get("search"):
        conditions.append(
            "(s.sample_code ILIKE :search "
            "OR vr.volunteer_name ILIKE :search "
            "OR s.client_ref ILIKE :search)"
        )
        params["search"] = f"%{filters['search']}%"

    where = " AND ".join(conditions)
    sort_column = {"sample_date": "s.sample_date", "created_at": "s.created_at"}[
        filters["sort_by"]
    ]
    direction = "ASC" if filters["sort_order"] == "asc" else "DESC"
    joins = """
        FROM public.sample_support s
        JOIN public.volunteer_registration vr ON vr.volunteer_id = s.volunteer_id
        JOIN public.sample_type_master stm ON stm.sample_type_id = s.sample_type_id
        JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = s.village_lgd_code
    """
    total = db.execute(text(f"SELECT COUNT(*) {joins} WHERE {where}"), params).scalar_one()
    rows = db.execute(
        text(
            f"""
            SELECT s.sample_id, s.sample_code, s.volunteer_id,
                   vr.volunteer_name, vr.department_name, s.sample_type_id,
                   stm.sample_type_name, s.sample_date, s.sample_count,
                   s.village_lgd_code, vh.village_name,
                   s.verification_status, s.captured_at, s.created_at
            {joins}
            WHERE {where}
            ORDER BY {sort_column} {direction}, s.sample_id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [dict(row) for row in rows], int(total)

