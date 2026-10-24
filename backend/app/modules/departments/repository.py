from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_active_department(
    db: Session,
    department_id: int,
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT department_id, department_name
            FROM public.department_master
            WHERE department_id = :department_id AND is_active
            """
        ),
        {"department_id": department_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def get_active_department_by_name(
    db: Session,
    department_name: str,
) -> dict[str, Any] | None:
    """Return an active department by the exact label exposed to clients."""
    row = db.execute(
        text(
            """
            SELECT department_id, department_name
            FROM public.department_master
            WHERE TRIM(department_name) = :department_name AND is_active
            """
        ),
        {"department_name": department_name.strip()},
    ).mappings().one_or_none()
    return dict(row) if row else None


def list_active_departments(db: Session) -> list[dict[str, Any]]:
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


def list_institution_options(
    db: Session,
    department_id: int,
) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT institution_type_id, department_id, field_label,
                   option_name, is_other, sort_order
            FROM public.cohv_institution_type_master
            WHERE department_id = :department_id AND is_active
            ORDER BY sort_order, institution_type_id
            """
        ),
        {"department_id": department_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def get_active_institution(
    db: Session,
    department_id: int,
    institution_type_id: int,
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT institution_type_id, department_id, is_other
            FROM public.cohv_institution_type_master
            WHERE institution_type_id = :institution_type_id
              AND department_id = :department_id
              AND is_active
            """
        ),
        {
            "department_id": department_id,
            "institution_type_id": institution_type_id,
        },
    ).mappings().one_or_none()
    return dict(row) if row else None
