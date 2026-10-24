from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.success_stories import repository, service
from app.modules.success_stories.schemas import (
    DepartmentResponse,
    SuccessStoryCreate,
    SuccessStoryListQuery,
    SuccessStoryListResponse,
    SuccessStoryResponse,
)

router = APIRouter(
    prefix="/api/success-stories",
    tags=["Success Stories"],
)


@router.get("/departments", response_model=list[DepartmentResponse])
def success_story_departments(db: Session = Depends(get_db)):
    return repository.list_departments(db)


@router.get("", response_model=SuccessStoryListResponse)
def list_success_stories(
    query: SuccessStoryListQuery = Depends(),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.list_stories(db, volunteer_id, query)


@router.post(
    "",
    response_model=SuccessStoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_success_story(
    data: SuccessStoryCreate,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.create_story(db, volunteer_id, data)


@router.get("/{story_id}", response_model=SuccessStoryResponse)
def success_story_details(
    story_id: int = Path(gt=0),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.get_story(db, volunteer_id, story_id)
