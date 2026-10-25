import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.security import DUMMY_PIN_HASH, create_access_token, verify_pin
from app.modules.auth import repository
from app.modules.auth.schemas import LoginRequest

logger = logging.getLogger(__name__)

# One message for "no such volunteer" and "wrong PIN", so the endpoint cannot
# be used to find out which IDs and mobile numbers are registered.
INVALID_CREDENTIALS = "Invalid Volunteer ID / mobile number or PIN."

# Shown only after the PIN has been verified, so account state is never
# revealed to someone who does not know the PIN.
STATUS_MESSAGES = {
    "PENDING": "Your registration is awaiting approval by your supervisor.",
    "REJECTED": "Your registration was not approved. Please contact your supervisor.",
    "SUSPENDED": "Your account is suspended. Please contact your supervisor.",
    "INACTIVE": "Your account is inactive. Please contact your supervisor.",
}


def logout(db: Session, claims: dict) -> dict:
    """Revoke the current token so it can no longer be used. The client should
    also discard it. Expired denylist rows are cleaned up on the way."""
    repository.purge_expired_tokens(db)
    repository.revoke_token(
        db,
        jti=claims["jti"],
        volunteer_id=int(claims["sub"]),
        expires_at=datetime.fromtimestamp(claims["exp"], tz=timezone.utc),
    )
    db.commit()
    logger.info("Volunteer %s signed out", claims.get("code"))
    return {"message": "Signed out successfully."}


def login(
    db: Session,
    data: LoginRequest,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> dict:
    """Sign a volunteer in with Volunteer ID or mobile number and PIN.

    Only an ACTIVE (supervisor-approved) volunteer gets a token. Every attempt
    against a known volunteer is written to login_history, which is also what
    the lockout counts.
    """
    volunteer = repository.find_for_login(db, data.login)

    if volunteer is None:
        verify_pin(data.pin, DUMMY_PIN_HASH)   # keep timing equal to a wrong PIN
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)

    volunteer_id = volunteer["volunteer_id"]

    failures = repository.recent_failures(db, volunteer_id, settings.LOGIN_LOCK_MINUTES)
    if failures >= settings.LOGIN_MAX_FAILURES:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many incorrect PIN attempts. Try again in "
            f"{settings.LOGIN_LOCK_MINUTES} minutes or reset your PIN.",
        )

    def record(is_success: bool) -> None:
        repository.record_attempt(
            db,
            volunteer_id=volunteer_id,
            is_success=is_success,
            device_id=data.device_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    if not verify_pin(data.pin, volunteer["pin_hash"]):
        record(False)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)

    if volunteer["status"] != "ACTIVE":
        db.rollback()
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            STATUS_MESSAGES.get(volunteer["status"], "Your account cannot sign in."),
        )

    record(True)
    repository.mark_logged_in(db, volunteer_id, data.device_id)
    db.commit()

    token, expires_in = create_access_token(volunteer_id, volunteer["volunteer_code"])
    logger.info("Volunteer %s signed in", volunteer["volunteer_code"])

    profile = repository.get_profile(db, volunteer_id)
    return {
        "success": True,
        "message": "Login successful",
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "volunteer": profile,
        **profile,
    }
