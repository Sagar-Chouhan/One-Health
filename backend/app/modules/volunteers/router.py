from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Path, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.volunteers.schemas import (
    VolunteerCodePreviewResponse,
    VolunteerProfileResponse,
    VolunteerRegistrationForm,
    VolunteerRegistrationRequest,
    VolunteerRegistrationResponse,
)
from app.modules.volunteers.service import (
    get_volunteer_profile,
    preview_volunteer_code,
    register_volunteer,
)

_bearer = HTTPBearer(auto_error=False)

router = APIRouter(
    prefix="/api/volunteers",
    tags=["Volunteers"],
)

# Both endpoints take the registration form as multipart/form-data, so the
# app can post the same form to either one (preview simply has no photo).


import logging

logger = logging.getLogger(__name__)


@router.post(
    "/preview-id",
    response_model=VolunteerCodePreviewResponse,
)
def preview_id(
    data: Annotated[VolunteerRegistrationRequest, Form(media_type="multipart/form-data")],
    db: Session = Depends(get_db),
):
    try:
        code = preview_volunteer_code(db, data)
    except HTTPException as exc:
        logger.warning("Volunteer preview-id rejected: status=%s, detail=%s", exc.status_code, exc.detail)
        raise

    return {
        "message": "Volunteer ID preview generated successfully.",
        "volunteer_code_preview": code,
    }


@router.post(
    "/register",
    response_model=VolunteerRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_volunteer(
    # multipart, not urlencoded: it carries a file, and Swagger only offers
    # a file picker for multipart bodies.
    data: Annotated[VolunteerRegistrationForm, Form(media_type="multipart/form-data")],
    db: Session = Depends(get_db),
):
    """Volunteer Registration: every form field plus the profile photograph,
    in one multipart/form-data request."""
    try:
        volunteer = register_volunteer(db, data, data.photo)
    except HTTPException as exc:
        logger.warning("Volunteer registration rejected: status=%s, detail=%s", exc.status_code, exc.detail)
        raise

    return {
        "message": "Registration submitted. Awaiting supervisor approval.",
        "volunteer_id": volunteer.volunteer_id,
        "volunteer_code": volunteer.volunteer_code,
        "status": volunteer.status,
        "institution_name": volunteer.institution_name,
        "photo_path": volunteer.photo_path,
    }


@router.get(
    "/me",
    response_model=VolunteerProfileResponse,
)
def get_my_profile(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Get the full profile of the currently signed-in volunteer."""
    return get_volunteer_profile(db, volunteer_id=volunteer_id)


@router.get(
    "/profile",
    response_model=VolunteerProfileResponse,
)
def get_profile(
    volunteer_id: int | None = Query(default=None, gt=0, description="Volunteer ID"),
    volunteer_code: str | None = Query(default=None, description="Volunteer code (e.g. COHV-26-0001)"),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Get a volunteer profile by ID, code, or from the bearer session token."""
    resolved_id = volunteer_id
    if resolved_id is None and not volunteer_code and credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            try:
                resolved_id = int(claims["sub"])
            except (ValueError, TypeError):
                pass

    if resolved_id is None and not volunteer_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a volunteer_id, volunteer_code, or sign in.",
        )

    return get_volunteer_profile(db, volunteer_id=resolved_id, volunteer_code=volunteer_code)


@router.get(
    "/profile/{volunteer_id}",
    response_model=VolunteerProfileResponse,
    include_in_schema=False,
)
@router.get(
    "/{volunteer_id}",
    response_model=VolunteerProfileResponse,
)
def get_volunteer_by_id(
    volunteer_id: int = Path(..., gt=0, description="The volunteer ID"),
    db: Session = Depends(get_db),
):
    """Get volunteer profile by ID."""
    return get_volunteer_profile(db, volunteer_id=volunteer_id)

