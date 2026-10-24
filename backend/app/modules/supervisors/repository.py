from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

# Who may be a volunteer's Reporting Supervisor: an active supervisor of the
# same department/COHV type (or one covering all types, cohv_type NULL) in the
# same state and district. The value is compared exactly as stored in
# department_master and cohv_supervisor (for example, "Public Health
# Department"). The registration dropdown and the registration check both use
# this one condition, so the API can never accept a supervisor the dropdown
# would not have shown.
_MATCH = """
    is_active
    AND TRIM(department_name) = TRIM(:department_name)
    AND state_lgd_code = :state_lgd_code
    AND district_lgd_code = :district_lgd_code
"""


def list_for(
    db: Session,
    *,
    department_name: str,
    state_lgd_code: int,
    district_lgd_code: int,
) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            f"""
            SELECT
                supervisor_id,
                supervisor_code,
                supervisor_name,
                designation,
                department_name
            FROM public.cohv_supervisor
            WHERE {_MATCH}
            ORDER BY supervisor_name, supervisor_id
            """
        ),
        {
            "department_name": department_name,
            "state_lgd_code": state_lgd_code,
            "district_lgd_code": district_lgd_code,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def by_location(
    db: Session,
    *,
    state_lgd_code: int,
    district_lgd_code: int,
    block_lgd_code: int,
) -> list[dict[str, Any]]:
    """Supervisors in one block, for the web sign-in dropdown. Includes the
    designation, COHV type and e-mail the sign-in form shows."""
    rows = db.execute(
        text(
            """
            SELECT supervisor_id, supervisor_code, supervisor_name,
                   designation, department_name, email
            FROM public.cohv_supervisor
            WHERE is_active
              AND state_lgd_code = :state_lgd_code
              AND district_lgd_code = :district_lgd_code
              AND block_lgd_code = :block_lgd_code
            ORDER BY supervisor_name, supervisor_id
            """
        ),
        {
            "state_lgd_code": state_lgd_code,
            "district_lgd_code": district_lgd_code,
            "block_lgd_code": block_lgd_code,
        },
    ).mappings().all()
    return [dict(r) for r in rows]


def find_by_email(db: Session, email: str) -> dict[str, Any] | None:
    """The supervisor account for a sign-in e-mail, with what login needs."""
    row = db.execute(
        text(
            """
            SELECT s.supervisor_id, s.supervisor_code, s.supervisor_name, s.designation,
                   s.department_name, s.email, s.password_hash, s.is_active,
                   s.state_lgd_code, st.state_name,
                   s.district_lgd_code, d.district_name,
                   s.block_lgd_code, b.block_name
            FROM public.cohv_supervisor s
            LEFT JOIN public.state_master st ON st.state_lgd_code = s.state_lgd_code
            LEFT JOIN public.district_master d ON d.district_lgd_code = s.district_lgd_code
            LEFT JOIN public.block_master b ON b.block_lgd_code = s.block_lgd_code
            WHERE LOWER(s.email) = LOWER(:email)
            """
        ),
        {"email": email},
    ).mappings().one_or_none()
    return dict(row) if row else None


# Field-record tables that carry a verification_status, for the dashboard
# "awaiting verification" and performance counts.
_PENDING = ("SUBMITTED", "UNDER_REVIEW")


def team_summary(db: Session, supervisor_id: int) -> dict[str, Any]:
    """Counts for the supervisor's dashboard, scoped to volunteers who report
    to this supervisor."""
    status_rows = db.execute(
        text(
            """
            SELECT status, count(*) AS n
            FROM public.volunteer_registration
            WHERE supervisor_id = :me
            GROUP BY status
            """
        ),
        {"me": supervisor_id},
    ).mappings().all()
    by_status = {r["status"]: r["n"] for r in status_rows}
    team_total = sum(by_status.values())

    # Include volunteers assigned directly to this supervisor, as well as volunteers
    # in the supervisor's administrative area (e.g. block) so area/unassigned activities are captured.
    team_ids = [
        r[0]
        for r in db.execute(
            text(
                """
                SELECT v.volunteer_id
                FROM public.volunteer_registration v
                JOIN public.cohv_supervisor s ON s.supervisor_id = :me
                WHERE v.supervisor_id = :me
                   OR (v.supervisor_id IS NULL AND v.block_lgd_code = s.block_lgd_code)
                   OR (v.block_lgd_code = s.block_lgd_code AND s.block_lgd_code IS NOT NULL)
                """
            ),
            {"me": supervisor_id},
        )
    ]

    if not team_ids:
        team_ids = [
            r[0]
            for r in db.execute(
                text("SELECT volunteer_id FROM public.volunteer_registration WHERE supervisor_id = :me"),
                {"me": supervisor_id},
            )
        ]

    counts = {
        "awaiting_verification": 0, "total_visits": 0, "alerts_generated": 0,
        "open_alerts": 0, "referrals": 0, "referrals_followup": 0,
        "samples": 0, "awareness": 0, "trainings_imparted": 0,
        "trainings_attended": 0, "meetings": 0, "success_stories": 0,
    }

    if team_ids:
        p = {"ids": team_ids, "pending": list(_PENDING)}
        scalar = lambda q: db.execute(text(q), p).scalar() or 0  # noqa: E731

        # awaiting verification across every field-record table
        awaiting = 0
        for tbl in ("event_report", "referral", "sample_support", "awareness_activity",
                    "training_attended", "training_imparted", "meeting_attended",
                    "success_story", "area_coverage"):
            awaiting += scalar(
                f"SELECT count(*) FROM public.{tbl} "
                "WHERE volunteer_id = ANY(:ids) AND verification_status = ANY(:pending)"
            )
        counts["awaiting_verification"] = awaiting

        # Total visits: sum of total_visits recorded on event reports, with fallback to report count if total_visits is null/0
        counts["total_visits"] = scalar(
            """
            SELECT COALESCE(SUM(CASE WHEN total_visits IS NOT NULL AND total_visits > 0 THEN total_visits ELSE 1 END), 0)
            FROM public.event_report
            WHERE volunteer_id = ANY(:ids)
            """
        )

        # Alerts generated: count true values in event_report.alert_generated, combined with alert table
        alerts_from_events = scalar(
            "SELECT count(*) FROM public.event_report WHERE volunteer_id = ANY(:ids) AND alert_generated = TRUE"
        )
        alerts_from_table = scalar("SELECT count(*) FROM public.alert WHERE volunteer_id = ANY(:ids)")
        counts["alerts_generated"] = max(alerts_from_events, alerts_from_table)

        open_alerts_from_table = scalar(
            "SELECT count(*) FROM public.alert WHERE volunteer_id = ANY(:ids) AND closure_status = 'OPEN'"
        )
        counts["open_alerts"] = open_alerts_from_table if open_alerts_from_table > 0 else counts["alerts_generated"]

        # Referrals: count from referral table plus event reports marked with referral_generated = true
        referrals_from_table = scalar("SELECT count(*) FROM public.referral WHERE volunteer_id = ANY(:ids)")
        referrals_from_events = scalar(
            "SELECT count(*) FROM public.event_report WHERE volunteer_id = ANY(:ids) AND referral_generated = TRUE"
        )
        counts["referrals"] = referrals_from_table + referrals_from_events

        # Pending follow-ups: referrals not followed up + event reports with follow_up_required = true
        followup_from_table = scalar("SELECT count(*) FROM public.referral WHERE volunteer_id = ANY(:ids) AND NOT is_followed_up")
        followup_from_events = scalar(
            "SELECT count(*) FROM public.event_report WHERE volunteer_id = ANY(:ids) AND follow_up_required = TRUE"
        )
        counts["referrals_followup"] = followup_from_table + followup_from_events

        counts["samples"] = scalar("SELECT count(*) FROM public.sample_support WHERE volunteer_id = ANY(:ids)")
        counts["awareness"] = scalar("SELECT count(*) FROM public.awareness_activity WHERE volunteer_id = ANY(:ids)")
        counts["trainings_imparted"] = scalar("SELECT count(*) FROM public.training_imparted WHERE volunteer_id = ANY(:ids)")
        counts["trainings_attended"] = scalar("SELECT count(*) FROM public.training_attended WHERE volunteer_id = ANY(:ids)")
        counts["meetings"] = scalar("SELECT count(*) FROM public.meeting_attended WHERE volunteer_id = ANY(:ids)")
        counts["success_stories"] = scalar("SELECT count(*) FROM public.success_story WHERE volunteer_id = ANY(:ids)")

    return {
        "team_total": team_total,
        "pending_approvals": by_status.get("PENDING", 0),
        "active_count": by_status.get("ACTIVE", 0),
        "suspended_count": by_status.get("SUSPENDED", 0),
        "inactive_count": by_status.get("INACTIVE", 0),
        "rejected_count": by_status.get("REJECTED", 0),
        **counts,
    }


def team_registrations(db: Session, supervisor_id: int) -> list[dict[str, Any]]:
    """Volunteers reporting to this supervisor, for the Approvals queue."""
    rows = db.execute(
        text(
            """
            SELECT v.volunteer_id, v.volunteer_code, v.volunteer_name, v.status,
                   v.created_at, v.department_name,
                   h.village_name, h.block_name, h.district_name
            FROM public.volunteer_registration v
            JOIN public.v_village_hierarchy h ON h.village_lgd_code = v.village_lgd_code
            WHERE v.supervisor_id = :me
            ORDER BY v.created_at DESC, v.volunteer_id DESC
            """
        ),
        {"me": supervisor_id},
    ).mappings().all()
    return [dict(r) for r in rows]


# Dashboard "Where your team works": each volunteer with their activity
# breakdown, in the same six metrics the volunteer app shows.
_ACTIVITY = [
    ("event_report", "events"), ("referral", "referrals"), ("sample_support", "samples"),
    ("awareness_activity", "awareness"), ("training_imparted", "imparted"),
    ("training_attended", "attended"),
]


def team_members(db: Session, supervisor_id: int) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT v.volunteer_id, v.volunteer_name, v.status,
                   h.village_name, h.district_name
            FROM public.volunteer_registration v
            JOIN public.v_village_hierarchy h ON h.village_lgd_code = v.village_lgd_code
            JOIN public.cohv_supervisor s ON s.supervisor_id = :me
            WHERE v.supervisor_id = :me
               OR (v.supervisor_id IS NULL AND v.block_lgd_code = s.block_lgd_code)
               OR (v.block_lgd_code = s.block_lgd_code AND s.block_lgd_code IS NOT NULL)
            ORDER BY v.volunteer_name, v.volunteer_id
            """
        ),
        {"me": supervisor_id},
    ).mappings().all()

    members = {
        r["volunteer_id"]: {
            **dict(r),
            "activity": {"events": 0, "referrals": 0, "samples": 0,
                         "awareness": 0, "imparted": 0, "attended": 0},
        }
        for r in rows
    }
    ids = list(members.keys())
    if ids:
        for tbl, metric in _ACTIVITY:
            for vid, n in db.execute(
                text(f"SELECT volunteer_id, count(*) FROM public.{tbl} WHERE volunteer_id = ANY(:ids) GROUP BY volunteer_id"),
                {"ids": ids},
            ):
                if vid in members:
                    members[vid]["activity"][metric] = n

        # Also add referrals generated during event reporting
        for vid, n in db.execute(
            text("SELECT volunteer_id, count(*) FROM public.event_report WHERE volunteer_id = ANY(:ids) AND referral_generated = TRUE GROUP BY volunteer_id"),
            {"ids": ids},
        ):
            if vid in members:
                members[vid]["activity"]["referrals"] += n

    return list(members.values())


# action -> new status. approve/reinstate make the volunteer ACTIVE.
STATUS_FOR_ACTION = {
    "approve": "ACTIVE", "reinstate": "ACTIVE", "reject": "REJECTED",
    "deactivate": "INACTIVE", "suspend": "SUSPENDED",
}


def set_volunteer_status(
    db: Session, *, supervisor_id: int, volunteer_id: int, new_status: str, remarks: str | None
) -> dict[str, Any] | None:
    """Update a volunteer's status, only if they report to this supervisor.
    Returns the updated row, or None if the volunteer is not on the team."""
    approved = new_status == "ACTIVE"
    row = db.execute(
        text(
            """
            UPDATE public.volunteer_registration
               SET status = :status,
                   status_remarks = :remarks,
                   approved_by = CASE WHEN :approved THEN :me ELSE approved_by END,
                   approved_at = CASE WHEN :approved THEN CURRENT_TIMESTAMP ELSE approved_at END
             WHERE volunteer_id = :vid AND supervisor_id = :me
            RETURNING volunteer_id, volunteer_code, volunteer_name, status
            """
        ),
        {"status": new_status, "remarks": remarks, "approved": approved,
         "me": supervisor_id, "vid": volunteer_id},
    ).mappings().one_or_none()
    if row:
        db.commit()
        return dict(row)
    db.rollback()
    return None


def is_eligible(
    db: Session,
    *,
    supervisor_id: int,
    department_name: str,
    state_lgd_code: int,
    district_lgd_code: int,
) -> bool:
    return db.execute(
        text(
            f"""
            SELECT 1
            FROM public.cohv_supervisor
            WHERE supervisor_id = :supervisor_id
              AND {_MATCH}
            """
        ),
        {
            "supervisor_id": supervisor_id,
            "department_name": department_name,
            "state_lgd_code": state_lgd_code,
            "district_lgd_code": district_lgd_code,
        },
    ).scalar_one_or_none() is not None


def get_team_volunteer_ids(db: Session, supervisor_id: int) -> list[int]:
    team_ids = [
        r[0]
        for r in db.execute(
            text(
                """
                SELECT v.volunteer_id
                FROM public.volunteer_registration v
                JOIN public.cohv_supervisor s ON s.supervisor_id = :me
                WHERE v.supervisor_id = :me
                   OR (v.supervisor_id IS NULL AND v.block_lgd_code = s.block_lgd_code)
                   OR (v.block_lgd_code = s.block_lgd_code AND s.block_lgd_code IS NOT NULL)
                """
            ),
            {"me": supervisor_id},
        )
    ]
    if not team_ids:
        team_ids = [
            r[0]
            for r in db.execute(
                text("SELECT volunteer_id FROM public.volunteer_registration WHERE supervisor_id = :me"),
                {"me": supervisor_id},
            )
        ]
    return team_ids


def team_alerts(db: Session, supervisor_id: int) -> list[dict[str, Any]]:
    team_ids = get_team_volunteer_ids(db, supervisor_id)
    if not team_ids:
        return []

    rows = db.execute(
        text(
            """
            SELECT a.alert_id, a.alert_code, a.volunteer_id, a.description,
                   a.action_taken, a.closure_status, a.current_stage,
                   a.alert_date, a.created_at,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name, h.block_name, h.district_name
            FROM public.alert a
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = a.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = a.village_lgd_code
            WHERE a.volunteer_id = ANY(:ids)
            ORDER BY a.created_at DESC, a.alert_id DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()

    existing_event_ids = {
        r[0]
        for r in db.execute(
            text("SELECT event_report_id FROM public.alert WHERE event_report_id IS NOT NULL AND volunteer_id = ANY(:ids)"),
            {"ids": team_ids},
        )
    }

    event_alerts = db.execute(
        text(
            """
            SELECT e.event_report_id, e.event_report_code, e.volunteer_id, e.description,
                   e.action_taken, e.event_date, e.created_at,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name, h.block_name, h.district_name
            FROM public.event_report e
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = e.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = e.village_lgd_code
            WHERE e.volunteer_id = ANY(:ids) AND e.alert_generated = TRUE
            ORDER BY e.created_at DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()

    results = [dict(r) for r in rows]
    for ea in event_alerts:
        if ea["event_report_id"] not in existing_event_ids:
            results.append({
                "alert_id": ea["event_report_id"],
                "alert_code": f"EVT-ALERT-{ea['event_report_code']}",
                "volunteer_id": ea["volunteer_id"],
                "description": ea["description"] or "Event Alert",
                "action_taken": ea["action_taken"] or "Immediate review required",
                "closure_status": "OPEN",
                "current_stage": "SUPERVISOR",
                "alert_date": ea["event_date"],
                "created_at": ea["created_at"],
                "volunteer_name": ea["volunteer_name"],
                "volunteer_code": ea["volunteer_code"],
                "village_name": ea["village_name"],
                "block_name": ea["block_name"],
                "district_name": ea["district_name"],
            })
    return results


def set_alert_status(
    db: Session, *, supervisor_id: int, alert_id: int, action: str, remarks: str | None
) -> dict[str, Any] | None:
    team_ids = get_team_volunteer_ids(db, supervisor_id)
    if not team_ids:
        return None

    if action == "escalate":
        new_status = "ESCALATED"
        new_stage = "DISTRICT"
    elif action in ("resolve", "close"):
        new_status = "CLOSED"
        new_stage = "SUPERVISOR"
    else:
        new_status = "OPEN"
        new_stage = "SUPERVISOR"

    row = db.execute(
        text(
            """
            UPDATE public.alert
               SET closure_status = :status,
                   current_stage = :stage,
                   closed_at = CASE WHEN :status = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE closed_at END,
                   updated_at = CURRENT_TIMESTAMP
             WHERE alert_id = :aid AND volunteer_id = ANY(:ids)
            RETURNING alert_id, alert_code, closure_status
            """
        ),
        {"status": new_status, "stage": new_stage, "aid": alert_id, "ids": team_ids},
    ).mappings().one_or_none()

    if row:
        db.commit()
        return dict(row)
    db.rollback()
    return None


def team_verifications(db: Session, supervisor_id: int) -> list[dict[str, Any]]:
    team_ids = get_team_volunteer_ids(db, supervisor_id)
    if not team_ids:
        return []

    items = []

    # 1. event_report
    evts = db.execute(
        text(
            """
            SELECT e.event_report_id AS record_id, e.event_report_code AS record_code,
                   'event_report' AS record_type,
                   CASE 
                       WHEN LOWER(COALESCE(e.sector_code, '')) = 'environment' THEN 'Environmental event'
                       WHEN LOWER(COALESCE(e.sector_code, '')) = 'animal' THEN 'Animal health event'
                       WHEN LOWER(COALESCE(e.sector_code, '')) = 'wildlife' THEN 'Wildlife event'
                       ELSE 'Human health visit'
                   END AS type_label,
                   e.volunteer_id, e.event_date AS record_date,
                   COALESCE(e.captured_at, e.created_at) AS captured_at,
                   e.created_at,
                   e.verification_status,
                   COALESCE(e.description, e.purpose_of_visit, 'Visit Report') AS summary,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name
            FROM public.event_report e
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = e.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = e.village_lgd_code
            WHERE e.volunteer_id = ANY(:ids)
            ORDER BY COALESCE(e.captured_at, e.created_at) DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()
    items.extend([dict(r) for r in evts])

    # 2. referral
    refs = db.execute(
        text(
            """
            SELECT r.referral_id AS record_id, r.referral_code AS record_code,
                   'referral' AS record_type, 'Referral' AS type_label,
                   r.volunteer_id, r.referral_date AS record_date,
                   COALESCE(r.captured_at, r.created_at) AS captured_at,
                   r.created_at,
                   r.verification_status,
                   COALESCE(r.reason, 'Patient Referral') AS summary,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name
            FROM public.referral r
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = r.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = r.village_lgd_code
            WHERE r.volunteer_id = ANY(:ids)
            ORDER BY COALESCE(r.captured_at, r.created_at) DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()
    items.extend([dict(r) for r in refs])

    # 3. awareness_activity
    awrs = db.execute(
        text(
            """
            SELECT a.awareness_id AS record_id, a.awareness_code AS record_code,
                   'awareness_activity' AS record_type, 'Community awareness' AS type_label,
                   a.volunteer_id, a.activity_date AS record_date,
                   COALESCE(a.captured_at, a.created_at) AS captured_at,
                   a.created_at,
                   a.verification_status,
                   CONCAT('Awareness session - ', COALESCE(a.people_reached, 0), ' people reached') AS summary,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name
            FROM public.awareness_activity a
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = a.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = a.village_lgd_code
            WHERE a.volunteer_id = ANY(:ids)
            ORDER BY COALESCE(a.captured_at, a.created_at) DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()
    items.extend([dict(r) for r in awrs])

    # 4. sample_support
    samps = db.execute(
        text(
            """
            SELECT s.sample_id AS record_id, s.sample_code AS record_code,
                   'sample_support' AS record_type, 'Sample collection' AS type_label,
                   s.volunteer_id, s.sample_date AS record_date,
                   COALESCE(s.captured_at, s.created_at) AS captured_at,
                   s.created_at,
                   s.verification_status,
                   CONCAT('Sample collection - count: ', COALESCE(s.sample_count, 1)) AS summary,
                   v.volunteer_name, v.volunteer_code,
                   h.village_name
            FROM public.sample_support s
            LEFT JOIN public.volunteer_registration v ON v.volunteer_id = s.volunteer_id
            LEFT JOIN public.v_village_hierarchy h ON h.village_lgd_code = s.village_lgd_code
            WHERE s.volunteer_id = ANY(:ids)
            ORDER BY COALESCE(s.captured_at, s.created_at) DESC
            """
        ),
        {"ids": team_ids},
    ).mappings().all()
    items.extend([dict(r) for r in samps])

    # sort overall by captured_at / created_at desc
    items.sort(key=lambda x: str(x.get("captured_at") or x.get("created_at") or ""), reverse=True)
    return items


TABLE_PK_MAP = {
    "event_report": "event_report_id",
    "referral": "referral_id",
    "awareness_activity": "awareness_id",
    "sample_support": "sample_id",
    "training_attended": "training_attended_id",
    "training_imparted": "training_imparted_id",
    "meeting_attended": "meeting_id",
    "success_story": "story_id",
    "area_coverage": "coverage_id",
}

TABLE_CODE_MAP = {
    "event_report": "event_report_code",
    "referral": "referral_code",
    "awareness_activity": "awareness_code",
    "sample_support": "sample_code",
    "training_attended": "training_attended_code",
    "training_imparted": "training_imparted_code",
    "meeting_attended": "meeting_code",
    "success_story": "story_code",
    "area_coverage": "coverage_code",
}


def get_current_record_status(
    db: Session,
    *,
    supervisor_id: int,
    record_type: str,
    record_id: int,
) -> dict[str, Any] | None:
    if record_type not in TABLE_PK_MAP:
        return None
    team_ids = get_team_volunteer_ids(db, supervisor_id)
    if not team_ids:
        return None
    pk_col = TABLE_PK_MAP[record_type]
    code_col = TABLE_CODE_MAP[record_type]
    row = db.execute(
        text(
            f"""
            SELECT {pk_col} AS record_id, {code_col} AS record_code, verification_status
            FROM public.{record_type}
            WHERE {pk_col} = :rid AND volunteer_id = ANY(:ids)
            """
        ),
        {"rid": record_id, "ids": team_ids},
    ).mappings().one_or_none()
    return dict(row) if row else None


def set_verification_status(
    db: Session,
    *,
    supervisor_id: int,
    record_type: str,
    record_id: int,
    new_status: str,
    remarks: str | None,
) -> dict[str, Any] | None:
    if record_type not in TABLE_PK_MAP:
        return None

    team_ids = get_team_volunteer_ids(db, supervisor_id)
    if not team_ids:
        return None

    pk_col = TABLE_PK_MAP[record_type]
    code_col = TABLE_CODE_MAP[record_type]

    row = db.execute(
        text(
            f"""
            UPDATE public.{record_type}
               SET verification_status = :status,
                   updated_at = CURRENT_TIMESTAMP
             WHERE {pk_col} = :rid AND volunteer_id = ANY(:ids)
            RETURNING {pk_col} AS record_id, {code_col} AS record_code, verification_status
            """
        ),
        {"status": new_status, "rid": record_id, "ids": team_ids},
    ).mappings().one_or_none()

    if row:
        db.commit()
        return {**dict(row), "record_type": record_type}
    db.rollback()
    return None
