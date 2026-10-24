import logging
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from app.modules.events import attachments

from app.modules.referrals.model import (
    Referral,
    ReferralFacilityMaster,
)
from app.modules.referrals.schema import ReferralCreate

logger = logging.getLogger(__name__)


def list_referrals(
    db: Session,
    *,
    owner_volunteer_id: int,
    query,
) -> dict:
    filters = query.model_dump()
    if filters["volunteer_id"] not in (None, owner_volunteer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only list your own referrals.",
        )

    conditions = ["r.volunteer_id = :owner_volunteer_id"]
    params = {
        "owner_volunteer_id": owner_volunteer_id,
        "limit": query.page_size,
        "offset": (query.page - 1) * query.page_size,
    }
    for clause, key in (
        ("r.referral_id = :referral_id", "referral_id"),
        ("vh.state_lgd_code = :state_lgd_code", "state_lgd_code"),
        ("vh.district_lgd_code = :district_lgd_code", "district_lgd_code"),
        ("r.village_lgd_code = :village_lgd_code", "village_lgd_code"),
        ("r.referral_stream = :referral_stream", "referral_stream"),
        ("r.referral_facility_id = :referral_facility_id", "referral_facility_id"),
        ("r.is_followed_up = :is_followed_up", "is_followed_up"),
        ("r.verification_status = :verification_status", "verification_status"),
        ("r.referral_date >= :from_date", "from_date"),
        ("r.referral_date <= :to_date", "to_date"),
    ):
        if filters.get(key) is not None:
            conditions.append(clause)
            params[key] = filters[key]

    if filters.get("search"):
        conditions.append(
            "(r.referral_code ILIKE :search "
            "OR vr.volunteer_name ILIKE :search "
            "OR r.client_ref ILIKE :search "
            "OR vh.village_name ILIKE :search)"
        )
        params["search"] = f"%{filters['search']}%"

    where = " AND ".join(conditions)
    sort_column = {
        "referral_date": "r.referral_date",
        "created_at": "r.created_at",
    }[query.sort_by]
    direction = "ASC" if query.sort_order == "asc" else "DESC"
    from_sql = """
        FROM public.referral r
        JOIN public.volunteer_registration vr ON vr.volunteer_id = r.volunteer_id
        JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = r.village_lgd_code
        JOIN public.referral_facility_master rfm
          ON rfm.referral_facility_id = r.referral_facility_id
         AND rfm.referral_stream = r.referral_stream
    """
    total = db.execute(
        text(f"SELECT COUNT(*) {from_sql} WHERE {where}"),
        params,
    ).scalar_one()
    rows = db.execute(
        text(
            f"""
            SELECT r.referral_id, r.referral_code, r.volunteer_id,
                   vr.volunteer_name, r.referral_stream,
                   r.referral_facility_id, rfm.referral_facility_name,
                   r.village_lgd_code, vh.village_name,
                   vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
                   r.event_date, r.referral_date, r.is_followed_up,
                   r.verification_status, r.created_at
            {from_sql}
            WHERE {where}
            ORDER BY {sort_column} {direction}, r.referral_id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    if items:
        attachment_rows = db.execute(
            text(
                """
                SELECT attachment_id, entity_id, file_kind, file_name,
                       storage_path, mime_type, size_bytes, caption
                FROM public.attachment
                WHERE volunteer_id = :volunteer_id
                  AND entity_type = 'REFERRAL'
                  AND entity_id = ANY(:referral_ids)
                ORDER BY attachment_id
                """
            ),
            {
                "volunteer_id": owner_volunteer_id,
                "referral_ids": [item["referral_id"] for item in items],
            },
        ).mappings().all()
        attachments_by_referral: dict[int, list[dict]] = {}
        for attachment in attachment_rows:
            item = dict(attachment)
            referral_id = item.pop("entity_id")
            attachments_by_referral.setdefault(referral_id, []).append(item)
        for item in items:
            item["attachments"] = attachments_by_referral.get(
                item["referral_id"],
                [],
            )
    return {
        "success": True,
        "message": "Records fetched successfully",
        "data": {
            "items": items,
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total_records": int(total),
                "total_pages": ceil(total / query.page_size) if total else 0,
            },
        },
    }


def list_all_referrals(db: Session, owner_volunteer_id: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT r.referral_id, r.referral_code, r.volunteer_id,
                   vr.volunteer_name, r.referral_stream,
                   r.referral_facility_id, rfm.referral_facility_name,
                   r.village_lgd_code, vh.village_name,
                   vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
                   r.event_date, r.referral_date, r.is_followed_up,
                   r.verification_status, r.created_at
            FROM public.referral r
            JOIN public.volunteer_registration vr
              ON vr.volunteer_id = r.volunteer_id
            JOIN public.v_village_hierarchy vh
              ON vh.village_lgd_code = r.village_lgd_code
            JOIN public.referral_facility_master rfm
              ON rfm.referral_facility_id = r.referral_facility_id
             AND rfm.referral_stream = r.referral_stream
            WHERE r.volunteer_id = :volunteer_id
            ORDER BY r.referral_date DESC, r.referral_id DESC
            """
        ),
        {"volunteer_id": owner_volunteer_id},
    ).mappings().all()
    items = [dict(row) for row in rows]
    _add_referral_attachments(db, owner_volunteer_id, items)
    return items


def get_referral_by_id(
    db: Session,
    referral_id: int,
    *,
    volunteer_id: int | None = None,
    supervisor_id: int | None = None,
) -> dict:
    """Retrieve a single referral by referral_id with comprehensive server-side validations."""
    # 1. Server-side validation: referral_id must be a positive integer
    if referral_id is None or referral_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_REFERRAL_ID",
                "message": "Referral ID must be a positive integer greater than zero.",
            },
        )

    # 2. Query database for referral details
    query = text(
        """
        SELECT r.referral_id, r.referral_code, r.volunteer_id,
               vr.volunteer_name, vr.volunteer_code, vr.supervisor_id,
               r.client_ref, r.device_id,
               r.referral_stream, r.referral_facility_id, rfm.referral_facility_name,
               rfm.is_other AS facility_is_other,
               r.event_report_id, r.village_lgd_code, vh.village_name,
               vh.gram_panchayat_name, vh.block_name, vh.district_name, vh.state_name,
               vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
               r.event_date, r.referral_date, r.reason,
               r.is_followed_up, r.followed_up_at,
               r.latitude, r.longitude, r.gps_accuracy_m, r.gps_unavailable_reason,
               r.captured_at, r.verification_status, r.created_at, r.updated_at
        FROM public.referral r
        JOIN public.volunteer_registration vr ON vr.volunteer_id = r.volunteer_id
        JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = r.village_lgd_code
        JOIN public.referral_facility_master rfm
          ON rfm.referral_facility_id = r.referral_facility_id
         AND rfm.referral_stream = r.referral_stream
        WHERE r.referral_id = :referral_id
        """
    )
    row = db.execute(query, {"referral_id": referral_id}).mappings().one_or_none()

    # 3. Server-side existence check: 404 if not found
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "REFERRAL_NOT_FOUND",
                "message": f"Referral record with ID {referral_id} was not found.",
            },
        )

    data = dict(row)

    # 4. Server-side authorization validation
    if volunteer_id is not None and data["volunteer_id"] != volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "You are not authorized to view this referral.",
            },
        )

    if supervisor_id is not None:
        sup = db.execute(
            text("SELECT supervisor_id, block_lgd_code FROM public.cohv_supervisor WHERE supervisor_id = :s_id"),
            {"s_id": supervisor_id},
        ).mappings().one_or_none()
        if sup:
            in_scope = (
                data["supervisor_id"] == supervisor_id
                or (sup["block_lgd_code"] is not None and data["block_lgd_code"] == sup["block_lgd_code"])
            )
            if not in_scope:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "FORBIDDEN",
                        "message": "You are not authorized to view referrals outside your assigned jurisdiction.",
                    },
                )

    # 5. Fetch associated attachments
    attachment_rows = db.execute(
        text(
            """
            SELECT attachment_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            WHERE entity_type = 'REFERRAL'
              AND entity_id = :referral_id
            ORDER BY attachment_id
            """
        ),
        {"referral_id": referral_id},
    ).mappings().all()
    data["attachments"] = [dict(att) for att in attachment_rows]

    return data


def _add_referral_attachments(
    db: Session,
    volunteer_id: int,
    items: list[dict],
) -> None:
    if not items:
        return
    rows = db.execute(
        text(
            """
            SELECT attachment_id, entity_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            WHERE volunteer_id = :volunteer_id
              AND entity_type = 'REFERRAL'
              AND entity_id = ANY(:entity_ids)
            ORDER BY attachment_id
            """
        ),
        {
            "volunteer_id": volunteer_id,
            "entity_ids": [item["referral_id"] for item in items],
        },
    ).mappings().all()
    grouped: dict[int, list[dict]] = {}
    for row in rows:
        attachment = dict(row)
        entity_id = attachment.pop("entity_id")
        grouped.setdefault(entity_id, []).append(attachment)
    for item in items:
        item["attachments"] = grouped.get(item["referral_id"], [])


def validate_facility(
    db: Session,
    facility_id: int,
    stream: str,
) -> ReferralFacilityMaster:
    statement = select(ReferralFacilityMaster).where(
        ReferralFacilityMaster.referral_facility_id == facility_id,
        ReferralFacilityMaster.referral_stream == stream,
        ReferralFacilityMaster.is_active.is_(True),
    )

    facility = db.scalar(statement)

    if facility is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_REFERRAL_FACILITY",
                "message": (
                    "Selected facility is invalid, inactive, "
                    "or does not match referral stream."
                ),
            },
        )

    return facility


def get_facilities(
    db: Session,
    stream: str,
) -> list[ReferralFacilityMaster]:
    statement = (
        select(ReferralFacilityMaster)
        .where(
            ReferralFacilityMaster.referral_stream == stream,
            ReferralFacilityMaster.is_active.is_(True),
        )
        .order_by(
            ReferralFacilityMaster.sort_order,
            ReferralFacilityMaster.referral_facility_id,
        )
    )

    return db.scalars(statement).all()


def validate_volunteer(
    db: Session,
    volunteer_id: int,
) -> None:
    """
    Assumes the volunteer table is public.volunteer_registration
    and its primary key is volunteer_id.

    Verify these identifiers against your actual schema.
    """

    statement = text("""
        SELECT 1
        FROM public.volunteer_registration
        WHERE volunteer_id = :volunteer_id
        LIMIT 1
    """)

    exists = db.execute(
        statement,
        {"volunteer_id": volunteer_id},
    ).scalar_one_or_none()

    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_VOLUNTEER",
                "message": "Selected volunteer does not exist.",
            },
        )


def validate_village(
    db: Session,
    village_lgd_code: int,
) -> None:
    """
    Assumes the village table is public.village_master
    and it contains village_lgd_code and is_active.

    Verify these identifiers against your actual schema.
    """

    statement = text("""
        SELECT 1
        FROM public.village_master
        WHERE village_lgd_code = :village_lgd_code
          AND is_active = TRUE
        LIMIT 1
    """)

    exists = db.execute(
        statement,
        {"village_lgd_code": village_lgd_code},
    ).scalar_one_or_none()

    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_VILLAGE",
                "message": "Selected village is invalid or inactive.",
            },
        )


def create_referral(
    db: Session,
    data: ReferralCreate,
) -> Referral:

    # 1. Validate facility ID, stream and active status.
    validate_facility(
        db=db,
        facility_id=data.referral_facility_id,
        stream=data.referral_stream,
    )

    # 2. Validate volunteer exists.
    validate_volunteer(
        db=db,
        volunteer_id=data.volunteer_id,
    )

    # 3. Validate village exists and is active.
    validate_village(
        db=db,
        village_lgd_code=data.village_lgd_code,
    )

    ready_files = attachments.read_all(
        {
            "photos": data.photos,
            "videos": data.videos,
            "documents": data.documents,
        }
    )

    # 4. Prepare validated payload.
    payload = data.model_dump()
    payload.pop("photos", None)
    payload.pop("videos", None)
    payload.pop("documents", None)

    # 5. Use DB default for captured_at if not provided.
    if payload.get("captured_at") is None:
        payload.pop("captured_at", None)

    # 5b. Set followed_up_at if followed up and not specified
    if payload.get("is_followed_up"):
        if not payload.get("followed_up_at"):
            from datetime import datetime, timezone
            payload["followed_up_at"] = datetime.now(timezone.utc)
    else:
        payload.pop("followed_up_at", None)

    # 6. Create ORM object.
    referral = Referral(**payload)

    try:
        db.add(referral)

        db.flush()
        db.refresh(referral)

        if ready_files:
            rows = attachments.save_files(
                "referrals",
                referral.referral_code,
                ready_files,
            )
            db.execute(
                text(
                    """
                    INSERT INTO public.attachment (
                        volunteer_id, entity_type, entity_id, file_kind,
                        file_name, storage_path, mime_type, size_bytes
                    ) VALUES (
                        :volunteer_id, 'REFERRAL', :entity_id, :file_kind,
                        :file_name, :storage_path, :mime_type, :size_bytes
                    )
                    """
                ),
                [
                    {
                        "volunteer_id": referral.volunteer_id,
                        "entity_id": referral.referral_id,
                        **row,
                    }
                    for row in rows
                ],
            )

        # Commit transaction.
        db.commit()

        # Refresh after commit.
        db.refresh(referral)

        return referral

    except IntegrityError as exc:
        db.rollback()
        attachments.delete_files("referrals", referral.referral_code)

        original_error = getattr(exc, "orig", None)
        diagnostic = getattr(original_error, "diag", None)

        logger.error(
            ("Referral IntegrityError | error=%s | " "constraint=%s | detail=%s"),
            str(original_error),
            getattr(diagnostic, "constraint_name", None),
            getattr(diagnostic, "message_detail", None),
            exc_info=True,
        )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "REFERRAL_CONSTRAINT_ERROR",
                "message": (
                    "Referral could not be saved because "
                    "one or more values violate a database constraint."
                ),
            },
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        attachments.delete_files("referrals", referral.referral_code)

        logger.exception("Unexpected database error while creating referral")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "REFERRAL_SAVE_FAILED",
                "message": ("Referral could not be saved. Please try again."),
            },
        ) from exc
