from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_volunteer_profile(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
) -> dict[str, Any] | None:
    """Fetch the complete volunteer profile with location hierarchy, supervisor,
    department, institution, education, and profession details."""
    if volunteer_id is None and not volunteer_code:
        return None

    where_clauses: list[str] = []
    params: dict[str, Any] = {}

    if volunteer_id is not None:
        where_clauses.append("v.volunteer_id = :volunteer_id")
        params["volunteer_id"] = volunteer_id

    if volunteer_code:
        where_clauses.append("UPPER(v.volunteer_code) = UPPER(:volunteer_code)")
        params["volunteer_code"] = volunteer_code.strip()

    where_sql = " AND ".join(where_clauses)

    query = text(
        f"""
        SELECT v.volunteer_id, v.volunteer_code, v.volunteer_name, v.gender, v.date_of_birth,
               v.mobile_no, v.email, v.department_name, v.department_name AS cohv_type,
               v.department_id,
               v.institution_type_id, inst.option_name AS institution_type_name,
               COALESCE(v.institution_name, inst.option_name) AS institution_name,
               v.other_institution_name,
               v.state_lgd_code, h.state_name,
               v.district_lgd_code, h.district_name,
               v.block_lgd_code, h.block_name,
               v.gram_panchayat_lgd_code, h.gram_panchayat_name,
               v.village_lgd_code, h.village_name,
               v.date_of_joining,
               v.education_id, e.education_name,
               v.profession_id, p.profession_name,
               v.supervisor_id, s.supervisor_name, s.mobile_no AS supervisor_mobile, s.email AS supervisor_email,
               v.photo_path, v.status, v.status_remarks,
               v.approved_by, app.supervisor_name AS approved_by_name, v.approved_at,
               v.reg_latitude, v.reg_longitude, v.reg_gps_accuracy_m, v.reg_gps_unavailable_reason,
               v.device_id, v.last_login_at, v.created_at, v.updated_at
        FROM public.volunteer_registration v
        LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = v.village_lgd_code
        LEFT JOIN public.cohv_supervisor s ON s.supervisor_id = v.supervisor_id
        LEFT JOIN public.cohv_supervisor app ON app.supervisor_id = v.approved_by
        LEFT JOIN public.education_master e ON e.education_id = v.education_id
        LEFT JOIN public.profession_master p ON p.profession_id = v.profession_id
        LEFT JOIN public.department_master d ON d.department_id = v.department_id
        LEFT JOIN public.cohv_institution_type_master inst ON inst.institution_type_id = v.institution_type_id
        WHERE {where_sql}
        LIMIT 1
        """
    )
    row = db.execute(query, params).mappings().one_or_none()
    if not row:
        return None

    data = dict(row)
    v_id = data["volunteer_id"]
    p = {"vid": v_id}
    scalar = lambda q: db.execute(text(q), p).scalar() or 0  # noqa: E731

    # Total visits: sum of total_visits recorded on event reports
    data["total_visits"] = scalar(
        """
        SELECT COALESCE(SUM(CASE WHEN total_visits IS NOT NULL AND total_visits > 0 THEN total_visits ELSE 1 END), 0)
        FROM public.event_report
        WHERE volunteer_id = :vid
        """
    )

    # Alerts generated: count only TRUE in event_report.alert_generated
    alerts_from_events = scalar(
        "SELECT count(*) FROM public.event_report WHERE volunteer_id = :vid AND alert_generated = TRUE"
    )
    alerts_from_table = scalar("SELECT count(*) FROM public.alert WHERE volunteer_id = :vid")
    data["alerts_generated"] = max(alerts_from_events, alerts_from_table)

    # Referrals: count from referral table plus event reports marked with referral_generated = true
    referrals_from_table = scalar("SELECT count(*) FROM public.referral WHERE volunteer_id = :vid")
    referrals_from_events = scalar(
        "SELECT count(*) FROM public.event_report WHERE volunteer_id = :vid AND referral_generated = TRUE"
    )
    data["referrals"] = referrals_from_table + referrals_from_events

    # Awareness activities count
    data["awareness_activities"] = scalar(
        "SELECT count(*) FROM public.awareness_activity WHERE volunteer_id = :vid"
    )
    data["awareness"] = data["awareness_activities"]

    # Open alerts
    data["open_alerts"] = scalar(
        "SELECT count(*) FROM public.alert WHERE volunteer_id = :vid AND closure_status = 'OPEN'"
    )

    # Pending follow-ups
    data["referrals_followup"] = scalar(
        "SELECT count(*) FROM public.referral WHERE volunteer_id = :vid AND (is_followed_up IS NOT TRUE)"
    )
    data["pending_follow_ups"] = data["referrals_followup"]
    data["pending_followups"] = data["referrals_followup"]

    # Trainings
    data["trainings_imparted"] = scalar("SELECT count(*) FROM public.training_imparted WHERE volunteer_id = :vid")
    data["trainings_attended"] = scalar("SELECT count(*) FROM public.training_attended WHERE volunteer_id = :vid")

    # Meetings
    data["meetings"] = scalar("SELECT count(*) FROM public.meeting_attended WHERE volunteer_id = :vid")

    # Samples supported
    data["samples"] = scalar("SELECT count(*) FROM public.sample_support WHERE volunteer_id = :vid")
    data["samples_supported"] = data["samples"]

    # Success stories
    data["success_stories"] = scalar("SELECT count(*) FROM public.success_story WHERE volunteer_id = :vid")

    sp = data.get("photo_path")
    if sp:
        data["photo_url"] = f"/uploads/{sp}"
        data["photo"] = data["photo_url"]
    else:
        data["photo_url"] = None
        data["photo"] = None

    return data


def get_volunteer_summary(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
) -> dict[str, Any] | None:
    profile = get_volunteer_profile(db, volunteer_id=volunteer_id, volunteer_code=volunteer_code)
    if not profile:
        return None

    return {
        "volunteer_id": profile["volunteer_id"],
        "volunteer_code": profile["volunteer_code"],
        "volunteer_name": profile.get("volunteer_name"),
        "total_visits": profile.get("total_visits", 0),
        "alerts_generated": profile.get("alerts_generated", 0),
        "open_alerts": profile.get("open_alerts", 0),
        "referrals": profile.get("referrals", 0),
        "referrals_followup": profile.get("referrals_followup", 0),
        "pending_follow_ups": profile.get("pending_follow_ups", 0),
        "pending_followups": profile.get("pending_followups", 0),
        "awareness": profile.get("awareness_activities", 0),
        "awareness_activities": profile.get("awareness_activities", 0),
        "trainings_imparted": profile.get("trainings_imparted", 0),
        "trainings_attended": profile.get("trainings_attended", 0),
        "meetings": profile.get("meetings", 0),
        "samples": profile.get("samples", 0),
        "samples_supported": profile.get("samples_supported", 0),
        "success_stories": profile.get("success_stories", 0),
    }


def get_login_history(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    vid = volunteer_id
    code = volunteer_code
    if vid is None and volunteer_code:
        row = db.execute(
            text(
                "SELECT volunteer_id, volunteer_code FROM public.volunteer_registration WHERE UPPER(volunteer_code) = UPPER(:c)"
            ),
            {"c": volunteer_code.strip()},
        ).mappings().one_or_none()
        if row:
            vid = row["volunteer_id"]
            code = row["volunteer_code"]

    if vid is None:
        return []

    if code is None:
        code = db.execute(
            text("SELECT volunteer_code FROM public.volunteer_registration WHERE volunteer_id = :id"),
            {"id": vid},
        ).scalar_one_or_none()

    rows = db.execute(
        text(
            """
            SELECT login_id, volunteer_id, login_at, login_method, is_success,
                   device_id, ip_address::text, user_agent
            FROM public.login_history
            WHERE volunteer_id = :vid
            ORDER BY login_at DESC, login_id DESC
            LIMIT :limit
            """
        ),
        {"vid": vid, "limit": limit},
    ).mappings().all()

    return [{**dict(r), "volunteer_code": code} for r in rows]


def update_volunteer_profile(
    db: Session,
    volunteer_id: int,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    if not updates:
        return get_volunteer_profile(db, volunteer_id=volunteer_id)

    set_clauses = [f"{col} = :{col}" for col in updates.keys()]
    set_clauses.append("updated_at = CURRENT_TIMESTAMP")
    sql = text(
        f"""
        UPDATE public.volunteer_registration
        SET {", ".join(set_clauses)}
        WHERE volunteer_id = :volunteer_id
        """
    )
    db.execute(sql, {"volunteer_id": volunteer_id, **updates})
    db.commit()
    return get_volunteer_profile(db, volunteer_id=volunteer_id)
