import ipaddress
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def find_for_login(db: Session, login: str) -> dict[str, Any] | None:
    """The volunteer a login identifier belongs to - Volunteer ID (any case)
    or mobile number - with what sign-in needs to decide."""
    row = db.execute(
        text(
            """
            SELECT volunteer_id, volunteer_code, pin_hash, status
            FROM public.volunteer_registration
            WHERE volunteer_code = UPPER(:login) OR mobile_no = :login
            LIMIT 1
            """
        ),
        {"login": login},
    ).mappings().one_or_none()
    return dict(row) if row else None


def recent_failures(db: Session, volunteer_id: int, minutes: int) -> int:
    return db.execute(
        text(
            """
            SELECT count(*)
            FROM public.login_history
            WHERE volunteer_id = :volunteer_id
              AND NOT is_success
              AND login_at > CURRENT_TIMESTAMP - make_interval(mins => :minutes)
            """
        ),
        {"volunteer_id": volunteer_id, "minutes": minutes},
    ).scalar_one()


def _valid_ip(value: str | None) -> str | None:
    # The client host is not always an IP (a test client, some proxies).
    # Logging must never be what makes a sign-in fail, so keep only real IPs.
    try:
        return str(ipaddress.ip_address(value)) if value else None
    except ValueError:
        return None


def record_attempt(
    db: Session,
    *,
    volunteer_id: int,
    is_success: bool,
    device_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO public.login_history
                (volunteer_id, login_method, is_success, device_id, ip_address, user_agent)
            VALUES (:volunteer_id, 'PIN', :is_success, :device_id,
                    CAST(:ip_address AS INET), :user_agent)
            """
        ),
        {
            "volunteer_id": volunteer_id,
            "is_success": is_success,
            "device_id": device_id,
            "ip_address": _valid_ip(ip_address),
            "user_agent": (user_agent or "")[:300] or None,
        },
    )


def mark_logged_in(db: Session, volunteer_id: int, device_id: str | None) -> None:
    db.execute(
        text(
            """
            UPDATE public.volunteer_registration
               SET last_login_at = CURRENT_TIMESTAMP,
                   device_id = COALESCE(:device_id, device_id)
             WHERE volunteer_id = :volunteer_id
            """
        ),
        {"volunteer_id": volunteer_id, "device_id": device_id},
    )


def get_profile(db: Session, volunteer_id: int) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT v.volunteer_id, v.volunteer_code, v.volunteer_name, v.mobile_no,
                   v.email, v.department_name AS cohv_type, v.status, v.photo_path,
                   h.state_lgd_code, h.state_name,
                   h.district_lgd_code, h.district_name,
                   h.block_lgd_code, h.block_name,
                   h.gram_panchayat_lgd_code, h.gram_panchayat_name,
                   h.village_lgd_code, h.village_name,
                   v.supervisor_id, s.supervisor_name
            FROM public.volunteer_registration v
            JOIN public.v_village_hierarchy h ON h.village_lgd_code = v.village_lgd_code
            LEFT JOIN public.cohv_supervisor s ON s.supervisor_id = v.supervisor_id
            WHERE v.volunteer_id = :volunteer_id
            """
        ),
        {"volunteer_id": volunteer_id},
    ).mappings().one_or_none()
    return dict(row) if row else None


def get_status(db: Session, volunteer_id: int) -> str | None:
    return db.execute(
        text("SELECT status FROM public.volunteer_registration WHERE volunteer_id = :id"),
        {"id": volunteer_id},
    ).scalar_one_or_none()


def is_token_revoked(db: Session, jti: str) -> bool:
    return db.execute(
        text("SELECT 1 FROM public.revoked_token WHERE jti = :jti"),
        {"jti": jti},
    ).scalar_one_or_none() is not None


def revoke_token(db: Session, *, jti: str, volunteer_id: int, expires_at: datetime) -> bool:
    """List this token's jti as revoked. Returns False if it was already
    listed (a repeated logout), True on the first time."""
    result = db.execute(
        text(
            """
            INSERT INTO public.revoked_token (jti, volunteer_id, expires_at)
            VALUES (:jti, :volunteer_id, :expires_at)
            ON CONFLICT (jti) DO NOTHING
            """
        ),
        {"jti": jti, "volunteer_id": volunteer_id, "expires_at": expires_at},
    )
    return result.rowcount > 0


def purge_expired_tokens(db: Session) -> None:
    """Drop denylist rows for tokens that have expired on their own - they can
    never be presented again, so keeping them only grows the table."""
    db.execute(
        text("DELETE FROM public.revoked_token WHERE expires_at < CURRENT_TIMESTAMP")
    )
