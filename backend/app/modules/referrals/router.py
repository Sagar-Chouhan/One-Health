from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Form, HTTPException, Path, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.events.attachments import parse_multipart_or_json
from app.core.security import decode_access_token
from app.database.session import get_db
from app.modules.auth import repository as auth_repo
from app.modules.auth.dependencies import get_current_volunteer_id, get_current_actor, get_optional_actor
from app.modules.referrals import service
from app.modules.referrals.schema import (
    ReferralCreate,
    ReferralFacilityResponse,
    ReferralResponse,
    ReferralAllResponse,
    ReferralSingleResponse,
)
from app.modules.referrals.service import (
    get_facilities,
    create_referral,
    get_referral_by_id,
)


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
async def post_referral(
    request: Request,
    actor: dict | None = Depends(get_optional_actor),
    db: Session = Depends(get_db),
):
    data = await parse_multipart_or_json(request, ReferralCreate)
    if actor and actor.get("role") == "COHV" and actor.get("volunteer_id"):
        data.volunteer_id = actor["volunteer_id"]
    return create_referral(
        db=db,
        data=data,
    )


@router.get("/all", response_model=ReferralAllResponse, status_code=status.HTTP_200_OK)
def list_all_referral_records(
    volunteer_id: int | None = Query(default=None, description="Optional volunteer ID to filter records"),
    supervisor_id: int | None = Query(default=None, description="Optional supervisor ID to filter records"),
    actor: dict | None = Depends(get_optional_actor),
    db: Session = Depends(get_db),
):
    """List all referrals.
    - If actor is a COHV volunteer: automatically filtered to that volunteer's records.
    - If volunteer_id is explicitly passed: filtered to that volunteer.
    - If supervisor_id is explicitly passed: filtered to that supervisor.
    - For supervisor or admin without filter: returns ALL referral records from the database.
    """
    v_id = volunteer_id
    s_id = supervisor_id

    if actor and actor.get("role") == "COHV":
        v_id = actor.get("volunteer_id")

    records = service.list_all_referrals(db, owner_volunteer_id=v_id, supervisor_id=s_id)
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": records,
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