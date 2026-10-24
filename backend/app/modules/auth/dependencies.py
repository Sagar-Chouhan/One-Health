from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.modules.auth import repository

_bearer = HTTPBearer(auto_error=False)


def get_current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict:
    """The validated claims of the bearer token: signature, role, revocation
    and account status are all checked here. Endpoints usually want
    `get_current_volunteer_id`; logout needs the claims (jti, exp).

    A token stops working the moment it is logged out (its jti is revoked) or
    the account stops being ACTIVE, without waiting for the token to expire.
    """
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not signed in or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    claims = decode_access_token(credentials.credentials)
    if not claims or claims.get("role") != "COHV" or "jti" not in claims:
        raise unauthorized

    try:
        volunteer_id = int(claims["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    if repository.is_token_revoked(db, claims["jti"]):
        raise unauthorized

    if repository.get_status(db, volunteer_id) != "ACTIVE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account cannot sign in.")

    return claims


def get_current_volunteer_id(
    claims: dict = Depends(get_current_claims),
) -> int:
    """Protect an endpoint: `volunteer_id: int = Depends(get_current_volunteer_id)`."""
    return int(claims["sub"])


def get_current_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict:
    """Validate token credentials for either COHV volunteer or SUPERVISOR."""
    from app.main import app
    from sqlalchemy import text

    if get_current_volunteer_id in app.dependency_overrides:
        return {"role": "COHV", "volunteer_id": app.dependency_overrides[get_current_volunteer_id]()}

    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not signed in or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    claims = decode_access_token(credentials.credentials)
    if not claims or "role" not in claims or "sub" not in claims:
        raise unauthorized

    role = claims.get("role")
    try:
        user_id = int(claims["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    if role == "COHV":
        if claims.get("jti") and repository.is_token_revoked(db, claims["jti"]):
            raise unauthorized
        if repository.get_status(db, user_id) != "ACTIVE":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account cannot sign in.")
        return {"role": "COHV", "volunteer_id": user_id, "claims": claims}
    elif role == "SUPERVISOR":
        active = db.execute(
            text("SELECT is_active FROM public.cohv_supervisor WHERE supervisor_id = :id"),
            {"id": user_id},
        ).scalar_one_or_none()
        if not active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This supervisor account cannot sign in.")
        return {"role": "SUPERVISOR", "supervisor_id": user_id, "claims": claims}
    else:
        raise unauthorized


def get_optional_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict | None:
    """Returns actor info if valid token provided; returns None otherwise without raising 401."""
    from app.main import app

    if get_current_volunteer_id in app.dependency_overrides:
        return {"role": "COHV", "volunteer_id": app.dependency_overrides[get_current_volunteer_id]()}

    if credentials is None:
        return None
    try:
        return get_current_actor(credentials=credentials, db=db)
    except Exception:
        return None

