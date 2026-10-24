from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Form, HTTPException, Path, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.modules.auth import repository as auth_repo
from app.modules.auth.dependencies import get_current_volunteer_id

from app.modules.referrals.schema import (
    ReferralCreate,
    ReferralFacilityResponse,
    ReferralResponse,
    ReferralAllResponse,
    ReferralSingleResponse,
)

from app.modules.referrals import service
from app.modules.referrals.service import (
    get_facilities,
    create_referral,
    get_referral_by_id,
)

_bearer = HTTPBearer(auto_error=False)


def get_current_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict:
    """Validate token credentials for either COHV volunteer or SUPERVISOR."""
    from app.main import app
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
        if claims.get("jti") and auth_repo.is_token_revoked(db, claims["jti"]):
            raise unauthorized
        if auth_repo.get_status(db, user_id) != "ACTIVE":
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


router = APIRouter(
    prefix="/api/referrals",
    tags=["Referrals"],
)


@router.get(
    "/facilities",
    response_model=list[ReferralFacilityResponse],
    status_code=status.HTTP_200_OK,
)
def fetch_facilities(
    stream: Annotated[
        Literal["HUMAN", "ANIMAL"],
        Query(description="Referral stream: HUMAN or ANIMAL"),
    ],
    db: Session = Depends(get_db),
):
    return get_facilities(
        db=db,
        stream=stream,
    )


@router.post(
    "",
    response_model=ReferralResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_referral(
    data: Annotated[ReferralCreate, Form(media_type="multipart/form-data")],
    db: Session = Depends(get_db),
):
    return create_referral(
        db=db,
        data=data,
    )


@router.get("/all", response_model=ReferralAllResponse, status_code=status.HTTP_200_OK)
def list_all_referral_records(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_referrals(db, volunteer_id),
    }


@router.get(
    "/{referral_id}",
    response_model=ReferralSingleResponse,
    status_code=status.HTTP_200_OK,
)
def get_referral_record(
    referral_id: int = Path(
        ...,
        gt=0,
        le=2147483647,
        description="The referral ID to retrieve. Must be a positive integer greater than zero.",
    ),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Retrieve a single referral by referral ID with server-side validation and authorization."""
    record = get_referral_by_id(
        db=db,
        referral_id=referral_id,
        volunteer_id=actor.get("volunteer_id"),
        supervisor_id=actor.get("supervisor_id"),
    )
    return {
        "success": True,
        "message": "Referral record fetched successfully",
        "data": record,
    }