from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id, get_current_actor, get_optional_actor
from app.modules.sample_support import repository, service
from app.modules.sample_support.schemas import (
    SampleSupportCreate,
    SampleSupportResponse,
    SampleSupportAllResponse,
    SampleSupportSingleResponse,
    SampleTypeResponse,
)

router = APIRouter(prefix="/api/sample-support", tags=["Sample Support"])


@router.get("/types", response_model=list[SampleTypeResponse])
def sample_types(db: Session = Depends(get_db)):
    return repository.list_types(db)


@router.get("/all", response_model=SampleSupportAllResponse, status_code=status.HTTP_200_OK)
def list_all_sample_support(
    volunteer_id: int | None = None,
    actor: dict | None = Depends(get_optional_actor),
    db: Session = Depends(get_db),
):
    """Retrieve all sample support records."""
    v_id = volunteer_id
    if actor and actor.get("role") == "COHV":
        v_id = actor.get("volunteer_id")
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_samples(db, v_id),
    }


@router.get(
    "/{sample_id}",
    response_model=SampleSupportSingleResponse,
    status_code=status.HTTP_200_OK,
)
def sample_support_details(
    sample_id: int = Path(
        ...,
        gt=0,
        le=2147483647,
        description="The sample support ID to retrieve. Must be a positive integer greater than zero.",
    ),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Retrieve a single sample support record by ID with server-side validation and authorization."""
    record = service.get_sample(
        db=db,
        sample_id=sample_id,
        volunteer_id=actor.get("volunteer_id"),
        supervisor_id=actor.get("supervisor_id"),
    )
    return {
        "success": True,
        "message": "Sample support record fetched successfully",
        "data": record,
    }


@router.post("", response_model=SampleSupportResponse, status_code=status.HTTP_201_CREATED)
def create_sample_support(
    data: SampleSupportCreate,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.create_sample(db, volunteer_id, data)

