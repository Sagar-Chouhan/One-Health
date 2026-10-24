from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def volunteer_scope(db: Session, volunteer_id: int) -> dict[str, Any] | None:
    """The volunteer's COHV type and district - the form's Primary sector and
    village list both come from here."""
    row = db.execute(
        text(
            """
            SELECT department_name AS cohv_type, state_lgd_code, district_lgd_code
            FROM public.volunteer_registration
            WHERE volunteer_id = :id
            """
        ),
        {"id": volunteer_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def sector(db: Session, sector_code: str) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT sector_code, sector_name, population_label
            FROM public.sector_master 
            WHERE sector_code = :code 
               OR (sector_code = 'public' AND :code = 'human')
               OR (sector_code = 'human' AND :code = 'public')
            LIMIT 1
            """
        ),
        {"code": sector_code},
    ).mappings().one_or_none()
    return dict(row) if row else None


def event_types_for(db: Session, sector_code: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT event_type_id AS id, event_type_name AS name, is_other
            FROM public.event_type_master
            WHERE (:sector = ANY (applicable_sectors) 
               OR (:sector = 'human' AND 'public' = ANY (applicable_sectors))
               OR (:sector = 'public' AND 'human' = ANY (applicable_sectors)))
              AND is_active
            ORDER BY sort_order, event_type_name
            """
        ),
        {"sector": sector_code},
    ).mappings().all()
    return [dict(r) for r in rows]


def population_types_for(db: Session, sector_code: str) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT population_type_id AS id, population_type_name AS name, is_other
            FROM public.population_type_master
            WHERE (sector_code = :sector 
               OR (sector_code = 'public' AND :sector = 'human')
               OR (sector_code = 'human' AND :sector = 'public'))
              AND is_active
            ORDER BY sort_order, population_type_name
            """
        ),
        {"sector": sector_code},
    ).mappings().all()
    return [dict(r) for r in rows]


def villages_in_district(db: Session, district_lgd_code: int) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT village_lgd_code, village_name, gram_panchayat_name, block_name
            FROM public.v_village_hierarchy
            WHERE district_lgd_code = :district
            ORDER BY block_name, gram_panchayat_name, village_name
            """
        ),
        {"district": district_lgd_code},
    ).mappings().all()
    return [dict(r) for r in rows]


def event_type_in_sector(db: Session, event_type_id: int, sector_code: str) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT is_other FROM public.event_type_master
            WHERE event_type_id = :id 
              AND (:sector = ANY (applicable_sectors) 
               OR (:sector = 'human' AND 'public' = ANY (applicable_sectors))
               OR (:sector = 'public' AND 'human' = ANY (applicable_sectors)))
              AND is_active
            """
        ),
        {"id": event_type_id, "sector": sector_code},
    ).mappings().one_or_none()
    return dict(row) if row else None


def population_in_sector(db: Session, population_type_id: int, sector_code: str) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT is_other FROM public.population_type_master
            WHERE population_type_id = :id 
              AND (sector_code = :sector 
               OR (sector_code = 'public' AND :sector = 'human')
               OR (sector_code = 'human' AND :sector = 'public'))
              AND is_active
            """
        ),
        {"id": population_type_id, "sector": sector_code},
    ).mappings().one_or_none()
    return dict(row) if row else None


def village_district(db: Session, village_lgd_code: int) -> int | None:
    """The district of an active village whose whole hierarchy is active, or
    None if the village is unknown / inactive."""
    return db.execute(
        text(
            """
            SELECT v.district_lgd_code
            FROM public.village_master v
            JOIN public.gram_panchayat_master g USING (gram_panchayat_lgd_code)
            JOIN public.block_master b ON b.block_lgd_code = v.block_lgd_code
            JOIN public.district_master d ON d.district_lgd_code = v.district_lgd_code
            JOIN public.state_master s ON s.state_lgd_code = v.state_lgd_code
            WHERE v.village_lgd_code = :village
              AND v.is_active AND g.is_active AND b.is_active AND d.is_active AND s.is_active
            """
        ),
        {"village": village_lgd_code},
    ).scalar_one_or_none()


def existing_by_client_ref(db: Session, volunteer_id: int, client_ref: str) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT event_report_id, event_report_code, verification_status
            FROM public.event_report
            WHERE volunteer_id = :volunteer_id AND client_ref = :client_ref
            """
        ),
        {"volunteer_id": volunteer_id, "client_ref": client_ref},
    ).mappings().one_or_none()
    return dict(row) if row else None


def list_event_reports(
    db: Session,
    volunteer_id: int,
    *,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT
                event_report_id, event_report_code, volunteer_id,
                client_ref, device_id, event_type_id, event_type_other,
                sector_code, event_date, event_time, village_lgd_code,
                is_out_of_area, purpose_of_visit, location_type, total_visits,
                population_type_id, population_other, description, observations,
                action_taken, referral_generated, alert_generated,
                follow_up_required, latitude, longitude, gps_accuracy_m,
                gps_unavailable_reason, captured_at, verification_status,
                created_at
            FROM public.event_report
            WHERE volunteer_id = :volunteer_id
            ORDER BY event_date DESC, event_time DESC, event_report_id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"volunteer_id": volunteer_id, "limit": limit, "offset": offset},
    ).mappings().all()

    reports = [dict(row) for row in rows]
    if not reports:
        return reports


    attachment_rows = db.execute(
        text(
            """
            SELECT attachment_id, entity_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            WHERE volunteer_id = :volunteer_id
              AND entity_type = 'EVENT_REPORT'
              AND entity_id = ANY(:event_ids)
            ORDER BY attachment_id
            """
        ),
        {
            "volunteer_id": volunteer_id,
            "event_ids": [row["event_report_id"] for row in reports],
        },
    ).mappings().all()

    attachments_by_report: dict[int, list[dict[str, Any]]] = {}
    for row in attachment_rows:
        attachment = dict(row)
        report_id = attachment.pop("entity_id")
        attachments_by_report.setdefault(report_id, []).append(attachment)

    for report in reports:
        report["attachments"] = attachments_by_report.get(
            report["event_report_id"], []
        )
    return reports


def list_event_reports_page(
    db: Session,
    *,
    owner_volunteer_id: int,
    filters: dict,
) -> tuple[list[dict[str, Any]], int]:
    conditions = ["e.volunteer_id = :owner_volunteer_id"]
    params = {
        "owner_volunteer_id": owner_volunteer_id,
        "limit": filters["page_size"],
        "offset": (filters["page"] - 1) * filters["page_size"],
    }
    for clause, key in (
        ("vh.state_lgd_code = :state_lgd_code", "state_lgd_code"),
        ("vh.district_lgd_code = :district_lgd_code", "district_lgd_code"),
        ("e.village_lgd_code = :village_lgd_code", "village_lgd_code"),
        ("e.verification_status = :verification_status", "verification_status"),
        ("e.event_date >= :from_date", "from_date"),
        ("e.event_date <= :to_date", "to_date"),
    ):
        if filters.get(key) is not None:
            conditions.append(clause)
            params[key] = filters[key]
    if filters.get("search"):
        conditions.append(
            "(e.event_report_code ILIKE :search "
            "OR vr.volunteer_name ILIKE :search "
            "OR vh.village_name ILIKE :search)"
        )
        params["search"] = f"%{filters['search']}%"
    if filters.get("volunteer_id") is not None:
        conditions.append("e.volunteer_id = :volunteer_id")
        params["volunteer_id"] = filters["volunteer_id"]

    where = " AND ".join(conditions)
    sort_column = {"event_date": "e.event_date", "created_at": "e.created_at"}[
        filters["sort_by"]
    ]
    direction = "ASC" if filters["sort_order"] == "asc" else "DESC"
    from_sql = """
        FROM public.event_report e
        JOIN public.volunteer_registration vr ON vr.volunteer_id = e.volunteer_id
        JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = e.village_lgd_code
    """
    total = db.execute(
        text(f"SELECT COUNT(*) {from_sql} WHERE {where}"),
        params,
    ).scalar_one()
    rows = db.execute(
        text(
            f"""
            SELECT e.event_report_id, e.event_report_code, e.volunteer_id,
                   vr.volunteer_name, e.village_lgd_code, vh.village_name,
                   vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
                   e.event_type_id, etm.event_type_name,
                   e.event_date, e.verification_status, e.created_at
            {from_sql}
            JOIN public.event_type_master etm ON etm.event_type_id = e.event_type_id
            WHERE {where}
            ORDER BY {sort_column} {direction}, e.event_report_id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).mappings().all()
    return [dict(row) for row in rows], int(total)


def insert_event(db: Session, params: dict) -> dict[str, Any]:
    return db.execute(
        text(
            """
            INSERT INTO public.event_report (
                volunteer_id, client_ref, device_id,
                event_type_id, event_type_other, sector_code,
                event_date, event_time, village_lgd_code, is_out_of_area,
                purpose_of_visit, location_type, total_visits,
                population_type_id, population_other,
                description, observations, action_taken,
                referral_generated, alert_generated, follow_up_required,
                latitude, longitude, gps_accuracy_m, gps_unavailable_reason
            ) VALUES (
                :volunteer_id, :client_ref, :device_id,
                :event_type_id, :event_type_other, :sector_code,
                :event_date, :event_time, :village_lgd_code, :is_out_of_area,
                :purpose_of_visit, :location_type, :total_visits,
                :population_type_id, :population_other,
                :description, :observations, :action_taken,
                :referral_generated, :alert_generated, :follow_up_required,
                :latitude, :longitude, :gps_accuracy_m, :gps_unavailable_reason
            )
            RETURNING event_report_id, event_report_code, verification_status
            """
        ),
        params,
    ).mappings().one()


def insert_attachments(db: Session, volunteer_id: int, event_report_id: int, rows: list[dict]) -> None:
    for r in rows:
        db.execute(
            text(
                """
                INSERT INTO public.attachment (
                    volunteer_id, entity_type, entity_id, file_kind,
                    file_name, storage_path, mime_type, size_bytes
                ) VALUES (
                    :volunteer_id, 'EVENT_REPORT', :entity_id, :file_kind,
                    :file_name, :storage_path, :mime_type, :size_bytes
                )
                """
            ),
            {"volunteer_id": volunteer_id, "entity_id": event_report_id, **r},
        )


def alert_category_id(db: Session, name: str) -> int | None:
    return db.execute(
        text("SELECT alert_category_id FROM public.alert_category_master WHERE alert_category_name = :name"),
        {"name": name},
    ).scalar_one_or_none()


def insert_alert(db: Session, params: dict) -> str:
    return db.execute(
        text(
            """
            INSERT INTO public.alert (
                volunteer_id, device_id, alert_category_id, event_report_id,
                event_category, alert_date, village_lgd_code,
                description, action_taken, is_auto_generated, current_stage,
                closure_status, latitude, longitude, gps_accuracy_m, gps_unavailable_reason
            ) VALUES (
                :volunteer_id, :device_id, :alert_category_id, :event_report_id,
                :event_category, :alert_date, :village_lgd_code,
                :description, :action_taken, FALSE, 'SUPERVISOR',
                'OPEN', :latitude, :longitude, :gps_accuracy_m, :gps_unavailable_reason
            )
            RETURNING alert_code
            """
        ),
        params,
    ).scalar_one()


def notify(db: Session, volunteer_id: int, title: str, detail: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO public.notification (volunteer_id, title, detail)
            VALUES (:volunteer_id, :title, :detail)
            """
        ),
        {"volunteer_id": volunteer_id, "title": title, "detail": detail},
    )


def list_all(db: Session, volunteer_id: int | None = None) -> list[dict[str, Any]]:
    where_sql = "WHERE e.volunteer_id = :volunteer_id" if volunteer_id is not None else "WHERE 1=1"
    params: dict[str, Any] = {}
    if volunteer_id is not None:
        params["volunteer_id"] = volunteer_id

    rows = db.execute(
        text(
            f"""
            SELECT
                e.event_report_id, e.event_report_code, e.volunteer_id,
                vr.volunteer_name, e.village_lgd_code, vh.village_name,
                vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
                e.event_type_id, etm.event_type_name,
                e.population_type_id, ptm.population_type_name,
                e.sector_code, e.event_date, e.event_time,
                e.is_out_of_area, e.purpose_of_visit, e.location_type, e.total_visits,
                e.description, e.observations, e.action_taken,
                e.referral_generated, e.alert_generated, e.follow_up_required,
                e.latitude, e.longitude, e.gps_accuracy_m, e.gps_unavailable_reason,
                e.captured_at, e.verification_status, e.created_at
            FROM public.event_report e
            JOIN public.volunteer_registration vr ON vr.volunteer_id = e.volunteer_id
            JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = e.village_lgd_code
            JOIN public.event_type_master etm ON etm.event_type_id = e.event_type_id
            LEFT JOIN public.population_type_master ptm ON ptm.population_type_id = e.population_type_id
            {where_sql}
            ORDER BY e.event_date DESC, e.event_time DESC, e.event_report_id DESC
            """
        ),
        params,
    ).mappings().all()
    reports = [dict(row) for row in rows]
    if not reports:
        return reports

    att_where = "WHERE entity_type = 'EVENT_REPORT' AND entity_id = ANY(:event_ids)"
    att_params: dict[str, Any] = {"event_ids": [row["event_report_id"] for row in reports]}
    if volunteer_id is not None:
        att_where += " AND volunteer_id = :volunteer_id"
        att_params["volunteer_id"] = volunteer_id

    attachment_rows = db.execute(
        text(
            f"""
            SELECT attachment_id, entity_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            {att_where}
            ORDER BY attachment_id
            """
        ),
        att_params,
    ).mappings().all()

    attachments_by_report: dict[int, list[dict[str, Any]]] = {}
    for row in attachment_rows:
        attachment = dict(row)
        report_id = attachment.pop("entity_id")
        attachments_by_report.setdefault(report_id, []).append(attachment)

    for report in reports:
        report["attachments"] = attachments_by_report.get(
            report["event_report_id"], []
        )
    return reports


def get_by_id(db: Session, event_report_id: int) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT
                e.event_report_id, e.event_report_code, e.volunteer_id,
                vr.volunteer_name, vr.supervisor_id,
                e.village_lgd_code, vh.village_name,
                vh.gram_panchayat_name, vh.block_name, vh.district_name, vh.state_name,
                vh.state_lgd_code, vh.district_lgd_code, vh.block_lgd_code,
                e.client_ref, e.device_id,
                e.event_type_id, etm.event_type_name, e.event_type_other,
                e.population_type_id, ptm.population_type_name, e.population_other,
                e.sector_code, e.event_date, e.event_time,
                e.is_out_of_area, e.purpose_of_visit, e.location_type, e.total_visits,
                e.description, e.observations, e.action_taken,
                e.referral_generated, e.alert_generated, e.follow_up_required,
                e.latitude, e.longitude, e.gps_accuracy_m, e.gps_unavailable_reason,
                e.captured_at, e.verification_status, e.created_at, e.updated_at
            FROM public.event_report e
            JOIN public.volunteer_registration vr ON vr.volunteer_id = e.volunteer_id
            JOIN public.v_village_hierarchy vh ON vh.village_lgd_code = e.village_lgd_code
            JOIN public.event_type_master etm ON etm.event_type_id = e.event_type_id
            LEFT JOIN public.population_type_master ptm ON ptm.population_type_id = e.population_type_id
            WHERE e.event_report_id = :event_report_id
            """
        ),
        {"event_report_id": event_report_id},
    ).mappings().one_or_none()
    if not row:
        return None
    data = dict(row)
    attachment_rows = db.execute(
        text(
            """
            SELECT attachment_id, file_kind, file_name,
                   storage_path, mime_type, size_bytes, caption
            FROM public.attachment
            WHERE entity_type = 'EVENT_REPORT'
              AND entity_id = :event_id
            ORDER BY attachment_id
            """
        ),
        {"event_id": event_report_id},
    ).mappings().all()
    data["attachments"] = [dict(a) for a in attachment_rows]
    return data
