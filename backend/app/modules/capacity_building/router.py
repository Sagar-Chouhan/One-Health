"""Capacity Building router.

Exposes REST APIs for:
1. Training Master (lookup)
2. Training Imparted (create, list, get by ID)
3. Training Attended (create, list, get by ID)
"""

from datetime import date
from fastapi import APIRouter, Depends, Path, Query, Request, status
from sqlalchemy.orm import Session

from app.modules.events.attachments import parse_multipart_or_json
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.capacity_building import service
from app.modules.capacity_building.schemas import (
    TrainingAttendedCreate,
    TrainingAttendedCreateResponse,
    TrainingAttendedListResponse,
    TrainingAttendedSingleResponse,
    TrainingImpartedCreate,
    TrainingImpartedCreateResponse,
    TrainingImpartedListResponse,
    TrainingImpartedSingleResponse,
    TrainingMasterItem,
    VerificationStatus,
)

router = APIRouter(
    prefix="/api/capacity-building",
    tags=["Capacity Building"],
)


# ============================================================================
# Training Master Endpoint
# ============================================================================

@router.get(
    "/training-master",
    response_model=list[TrainingMasterItem],
    status_code=status.HTTP_200_OK,
    summary="Get active training master types",
)
def get_training_master(db: Session = Depends(get_db)):
    """Retrieve all active training master records sorted by sort_order."""
    return service.list_training_masters(db)


# ============================================================================
# Training Imparted Endpoints
# ============================================================================

@router.post(
    "/training-imparted",
    response_model=TrainingImpartedCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new training imparted record",
)
async def create_training_imparted(
    request: Request,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Create a training imparted record for the authenticated volunteer."""
    data = await parse_multipart_or_json(request, TrainingImpartedCreate)
    data.volunteer_id = volunteer_id
    return service.create_training_imparted(
        db=db, owner_volunteer_id=volunteer_id, data=data
    )


@router.get(
    "/training-imparted",
    response_model=TrainingImpartedListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all training imparted records for authenticated volunteer",
)
def list_training_imparted(
    training_id: int | None = Query(
        default=None, gt=0, description="Filter by training type ID"
    ),
    date_from: date | None = Query(
        default=None, description="Filter from training date (YYYY-MM-DD)"
    ),
    date_to: date | None = Query(
        default=None, description="Filter to training date (YYYY-MM-DD)"
    ),
    verification_status: VerificationStatus | None = Query(
        default=None, description="Filter by verification status"
    ),
    limit: int = Query(
        default=20, ge=1, le=100, description="Maximum number of records to return"
    ),
    offset: int = Query(
        default=0, ge=0, description="Number of records to skip"
    ),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Retrieve paginated training imparted records for the authenticated volunteer."""
    filters = {
        "training_id": training_id,
        "date_from": date_from,
        "date_to": date_to,
        "verification_status": verification_status,
    }
    return service.list_training_imparted(
        db=db,
        owner_volunteer_id=volunteer_id,
        filters=filters,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/training-imparted/{training_imparted_id}",
    response_model=TrainingImpartedSingleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get training imparted record by ID",
)
def get_training_imparted_by_id(
    training_imparted_id: int = Path(
        ...,
        gt=0,
        description="The primary key ID of the training imparted record",
    ),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Retrieve a single training imparted record by ID, verifying volunteer ownership."""
    return service.get_training_imparted(
        db=db,
        training_imparted_id=training_imparted_id,
        owner_volunteer_id=volunteer_id,
    )


# ============================================================================
# Training Attended Endpoints
# ============================================================================

@router.post(
    "/training-attended",
    response_model=TrainingAttendedCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new training attended record",
)
async def create_training_attended(
    request: Request,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Create a training attended record for the authenticated volunteer."""
    data = await parse_multipart_or_json(request, TrainingAttendedCreate)
    data.volunteer_id = volunteer_id
    return service.create_training_attended(
        db=db, owner_volunteer_id=volunteer_id, data=data
    )


@router.get(
    "/training-attended",
    response_model=TrainingAttendedListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all training attended records for authenticated volunteer",
)
def list_training_attended(
    training_id: int | None = Query(
        default=None, gt=0, description="Filter by training type ID"
    ),
    date_from: date | None = Query(
        default=None, description="Filter from training date (YYYY-MM-DD)"
    ),
    date_to: date | None = Query(
        default=None, description="Filter to training date (YYYY-MM-DD)"
    ),
    verification_status: VerificationStatus | None = Query(
        default=None, description="Filter by verification status"
    ),
    certificate_issued: bool | None = Query(
        default=None, description="Filter by certificate issued status"
    ),
    limit: int = Query(
        default=20, ge=1, le=100, description="Maximum number of records to return"
    ),
    offset: int = Query(
        default=0, ge=0, description="Number of records to skip"
    ),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Retrieve paginated training attended records for the authenticated volunteer."""
    filters = {
        "training_id": training_id,
        "date_from": date_from,
        "date_to": date_to,
        "verification_status": verification_status,
        "certificate_issued": certificate_issued,
    }
    return service.list_training_attended(
        db=db,
        owner_volunteer_id=volunteer_id,
        filters=filters,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/training-attended/{training_attended_id}",
    response_model=TrainingAttendedSingleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get training attended record by ID",
)
def get_training_attended_by_id(
    training_attended_id: int = Path(
        ...,
        gt=0,
        description="The primary key ID of the training attended record",
    ),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Retrieve a single training attended record by ID, verifying volunteer ownership."""
    return service.get_training_attended(
        db=db,
        training_attended_id=training_attended_id,
        owner_volunteer_id=volunteer_id,
    )
