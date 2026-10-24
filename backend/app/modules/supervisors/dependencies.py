from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db

_bearer = HTTPBearer(auto_error=False)


def get_current_supervisor_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> int:
    """Protect a supervisor endpoint. Requires a SUPERVISOR token for an
    account that is still active."""
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not signed in or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    claims = decode_access_token(credentials.credentials)
    if not claims or claims.get("role") != "SUPERVISOR":
        raise unauthorized

    try:
        supervisor_id = int(claims["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    active = db.execute(
        text("SELECT is_active FROM public.cohv_supervisor WHERE supervisor_id = :id"),
        {"id": supervisor_id},
    ).scalar_one_or_none()
    if not active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This supervisor account cannot sign in.")

    return supervisor_id
