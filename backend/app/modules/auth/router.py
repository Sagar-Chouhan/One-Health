from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth import repository, service
from app.modules.auth.dependencies import get_current_claims, get_current_volunteer_id
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    VolunteerProfile,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Sign in with Volunteer ID or mobile number and PIN. Only approved
    (ACTIVE) volunteers receive a token; send it as
    `Authorization: Bearer <access_token>`."""
    return service.login(
        db,
        data,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    """Sign out: the token used for this request is revoked and will no longer
    be accepted. Send it as `Authorization: Bearer <access_token>`."""
    return service.logout(db, claims)


@router.get("/me", response_model=VolunteerProfile)
def me(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """The signed-in volunteer's profile. Also a quick way to check a token."""
    return repository.get_profile(db, volunteer_id)
