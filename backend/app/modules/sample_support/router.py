from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.sample_support import repository, service
from app.modules.sample_support.schemas import (
    SampleSupportCreate,
    SampleSupportListQuery,
    SampleSupportListResponse,
    SampleSupportResponse,
    SampleTypeResponse,
)

router = APIRouter(prefix="/api/sample-support", tags=["Sample Support"])


@router.get("/types", response_model=list[SampleTypeResponse])
def sample_types(db: Session = Depends(get_db)):
    return repository.list_types(db)


@router.post("", response_model=SampleSupportResponse, status_code=status.HTTP_201_CREATED)
def create_sample_support(
    data: SampleSupportCreate,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.create_sample(db, volunteer_id, data)


@router.get("", response_model=SampleSupportListResponse)
def list_sample_support(
    query: SampleSupportListQuery = Depends(),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.list_samples(db, volunteer_id, query)


@router.get("/{sample_id}", response_model=SampleSupportResponse)
def sample_support_details(
    sample_id: int,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    if sample_id <= 0:
        from fastapi import HTTPException
        raise HTTPException(422, "sample_id must be positive.")
    return service.get_sample(db, volunteer_id, sample_id)

