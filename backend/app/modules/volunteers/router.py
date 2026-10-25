from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.volunteers.schemas import (
    LoginHistoryResponse,
    VolunteerCodePreviewResponse,
    VolunteerProfileResponse,
    VolunteerProfileUpdate,
    VolunteerRegistrationForm,
    VolunteerRegistrationRequest,
    VolunteerRegistrationResponse,
    VolunteerSummaryResponse,
)
from app.modules.volunteers import service
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

singular_router = APIRouter(
    prefix="/api/volunteer",
    include_in_schema=False,
)


# Both endpoints take the registration form as multipart/form-data, so the
# app can post the same form to either one (preview simply has no photo).


import logging

logger = logging.getLogger(__name__)


@router.post(
    "/preview-id",
    response_model=VolunteerCodePreviewResponse,
)
@singular_router.post(
    "/preview-id",
    response_model=VolunteerCodePreviewResponse,
    include_in_schema=False,
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
@singular_router.post(
    "/register",
    response_model=VolunteerRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
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
@singular_router.get(
    "/me",
    response_model=VolunteerProfileResponse,
    include_in_schema=False,
)
def get_my_profile(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Get the full profile of the currently signed-in volunteer."""
    profile = get_volunteer_profile(db, volunteer_id=volunteer_id)
    return {
        "success": True,
        "message": "Volunteer profile fetched successfully",
        "data": profile,
        **profile,
    }


@router.get(
    "/profile",
    response_model=VolunteerProfileResponse,
)
@singular_router.get(
    "/profile",
    response_model=VolunteerProfileResponse,
    include_in_schema=False,
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

    profile = get_volunteer_profile(db, volunteer_id=resolved_id, volunteer_code=volunteer_code)
    return {
        "success": True,
        "message": "Volunteer profile fetched successfully",
        "data": profile,
        **profile,
    }


@router.get(
    "/login-history",
    response_model=LoginHistoryResponse,
    status_code=status.HTTP_200_OK,
)
@singular_router.get(
    "/login-history",
    response_model=LoginHistoryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_volunteer_login_history(
    volunteer_id: str | None = Query(
        default=None,
        description="Volunteer ID (integer) or Volunteer Code (e.g. COHV-26-0017)",
    ),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Fetch login history for a volunteer by ID or volunteer code."""
    resolved_id = None
    resolved_code = None

    if volunteer_id:
        v_str = str(volunteer_id).strip()
        if v_str.isdigit():
            resolved_id = int(v_str)
        else:
            resolved_code = v_str
    elif credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            try:
                resolved_id = int(claims["sub"])
            except (ValueError, TypeError):
                pass

    if resolved_id is None and not resolved_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a volunteer_id/volunteer_code or sign in.",
        )

    history = service.get_login_history(
        db,
        volunteer_id=resolved_id,
        volunteer_code=resolved_code,
    )
    return {
        "success": True,
        "message": "Login history fetched successfully",
        "data": history,
    }


@router.get(
    "/me/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
)
@singular_router.get(
    "/me/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_my_summary(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Get performance KPI summary for the currently signed-in volunteer."""
    summary = service.get_volunteer_summary(db, volunteer_id=volunteer_id)
    return {
        "success": True,
        "message": "Volunteer summary fetched successfully",
        "data": summary,
    }


@router.get(
    "/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
)
@singular_router.get(
    "/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_volunteer_summary_endpoint(
    volunteer_id: str | None = Query(
        default=None,
        description="Volunteer ID (integer) or Volunteer Code (e.g. COHV-26-0017)",
    ),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Fetch performance KPI summary for a volunteer by ID, code, or session token."""
    resolved_id = None
    resolved_code = None

    if volunteer_id:
        v_str = str(volunteer_id).strip()
        if v_str.isdigit():
            resolved_id = int(v_str)
        else:
            resolved_code = v_str
    elif credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            try:
                resolved_id = int(claims["sub"])
            except (ValueError, TypeError):
                pass

    if resolved_id is None and not resolved_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a volunteer_id/volunteer_code or sign in.",
        )

    summary = service.get_volunteer_summary(
        db,
        volunteer_id=resolved_id,
        volunteer_code=resolved_code,
    )
    return {
        "success": True,
        "message": "Volunteer summary fetched successfully",
        "data": summary,
    }


@router.get(
    "/summary/{volunteer_id}",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
)
@singular_router.get(
    "/summary/{volunteer_id}",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_volunteer_summary_by_subpath(
    volunteer_id: str = Path(..., description="The volunteer ID (integer) or code (e.g. COHV-26-0017)"),
    db: Session = Depends(get_db),
):
    """Fetch performance KPI summary for a volunteer by path ID or volunteer code (e.g. /summary/50)."""
    resolved_id = None
    resolved_code = None
    v_str = str(volunteer_id).strip()
    if v_str.isdigit():
        resolved_id = int(v_str)
    else:
        resolved_code = v_str

    summary = service.get_volunteer_summary(
        db,
        volunteer_id=resolved_id,
        volunteer_code=resolved_code,
    )
    return {
        "success": True,
        "message": "Volunteer summary fetched successfully",
        "data": summary,
    }


@router.get(
    "/{volunteer_id}",
    response_model=VolunteerProfileResponse,
)
@singular_router.get(
    "/{volunteer_id}",
    response_model=VolunteerProfileResponse,
    include_in_schema=False,
)
def get_volunteer_by_id(
    volunteer_id: int = Path(..., gt=0, description="The volunteer ID"),
    db: Session = Depends(get_db),
):
    """Get volunteer profile by ID."""
    profile = get_volunteer_profile(db, volunteer_id=volunteer_id)
    return {
        "success": True,
        "message": "Volunteer profile fetched successfully",
        "data": profile,
        **profile,
    }


@router.get(
    "/{volunteer_id}/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
)
@singular_router.get(
    "/{volunteer_id}/summary",
    response_model=VolunteerSummaryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_volunteer_summary_by_id(
    volunteer_id: int = Path(..., gt=0, description="The volunteer ID"),
    db: Session = Depends(get_db),
):
    """Fetch performance KPI summary for a volunteer by path ID."""
    summary = service.get_volunteer_summary(db, volunteer_id=volunteer_id)
    return {
        "success": True,
        "message": "Volunteer summary fetched successfully",
        "data": summary,
    }


async def _parse_profile_update(request: Request) -> tuple[dict[str, Any], Any]:
    content_type = request.headers.get("content-type", "").lower()
    photo = None
    fields: dict[str, Any] = {}

    if "multipart" in content_type or "form-urlencoded" in content_type:
        try:
            form = await request.form()
            for key, value in form.multi_items():
                k = key.strip()
                if k in ("photo", "profile_photo", "image", "file"):
                    if hasattr(value, "filename") and value.filename:
                        photo = value
                    elif isinstance(value, str) and value:
                        photo = value
                else:
                    fields[k] = value
        except Exception as e:
            logger.warning("Failed to parse form in _parse_profile_update: %s", e)
    else:
        try:
            body = await request.json()
            if isinstance(body, dict):
                fields = body
                photo = body.get("photo")
        except Exception:
            try:
                form = await request.form()
                for key, value in form.multi_items():
                    k = key.strip()
                    if k in ("photo", "profile_photo", "image", "file"):
                        if hasattr(value, "filename") and value.filename:
                            photo = value
                        elif isinstance(value, str) and value:
                            photo = value
                    else:
                        fields[k] = value
            except Exception:
                fields = {}

    try:
        validated = VolunteerProfileUpdate.model_validate(fields)
    except ValidationError as exc:
        raise RequestValidationError(errors=exc.errors()) from exc

    payload = validated.model_dump(exclude_unset=True)
    if not photo:
        photo = getattr(validated, "photo", None)

    return payload, photo


@router.put("/profile", response_model=VolunteerProfileResponse)
@singular_router.put("/profile", response_model=VolunteerProfileResponse, include_in_schema=False)
async def update_my_profile(
    request: Request,
    volunteer_id: str | None = Query(default=None, description="Volunteer ID or Volunteer Code (optional if signed in)"),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Update profile of volunteer via token session or explicit volunteer ID/code."""
    resolved_id = None
    if volunteer_id:
        v_str = str(volunteer_id).strip()
        if v_str.isdigit():
            resolved_id = int(v_str)
        else:
            profile = service.get_volunteer_profile(db, volunteer_code=v_str)
            if profile:
                resolved_id = profile["volunteer_id"]
    elif credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            try:
                resolved_id = int(claims["sub"])
            except (ValueError, TypeError):
                pass

    if resolved_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid volunteer_id / volunteer_code or sign in.",
        )

    payload, photo = await _parse_profile_update(request)
    profile = service.edit_volunteer_profile(
        db=db,
        volunteer_id=resolved_id,
        data=payload,
        photo=photo,
    )
    return {
        "success": True,
        "message": "Volunteer profile updated successfully",
        "data": profile,
        **profile,
    }


@router.put("/{volunteer_id}", response_model=VolunteerProfileResponse)
@singular_router.put("/{volunteer_id}", response_model=VolunteerProfileResponse, include_in_schema=False)
async def update_volunteer_profile_by_id(
    request: Request,
    volunteer_id: int = Path(..., gt=0, description="The volunteer ID to update"),
    db: Session = Depends(get_db),
):
    """Update volunteer profile by volunteer ID."""
    payload, photo = await _parse_profile_update(request)
    profile = service.edit_volunteer_profile(
        db=db,
        volunteer_id=volunteer_id,
        data=payload,
        photo=photo,
    )
    return {
        "success": True,
        "message": "Volunteer profile updated successfully",
        "data": profile,
        **profile,
    }


@router.post("/photo", response_model=VolunteerProfileResponse)
@singular_router.post("/photo", response_model=VolunteerProfileResponse, include_in_schema=False)
def upload_volunteer_photo(
    photo: UploadFile = File(...),
    volunteer_id: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Upload or update profile picture for volunteer."""
    resolved_id = None
    if volunteer_id:
        v_str = str(volunteer_id).strip()
        if v_str.isdigit():
            resolved_id = int(v_str)
        else:
            profile = service.get_volunteer_profile(db, volunteer_code=v_str)
            if profile:
                resolved_id = profile["volunteer_id"]
    elif credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            try:
                resolved_id = int(claims["sub"])
            except (ValueError, TypeError):
                pass

    if resolved_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid volunteer_id / volunteer_code or sign in.",
        )

    profile = service.edit_volunteer_profile(
        db=db,
        volunteer_id=resolved_id,
        data={},
        photo=photo,
    )
    return {
        "success": True,
        "message": "Volunteer photo updated successfully",
        "data": profile,
        **profile,
    }

