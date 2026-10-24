from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id, get_current_actor
from app.modules.success_stories import repository, service
from app.modules.success_stories.schemas import (
    DepartmentResponse,
    SuccessStoryCreate,
    SuccessStoryResponse,
    SuccessStoryAllResponse,
    SuccessStorySingleResponse,
)

router = APIRouter(
    prefix="/api/success-stories",
    tags=["Success Stories"],
)


@router.get("/departments", response_model=list[DepartmentResponse])
def success_story_departments(db: Session = Depends(get_db)):
    return repository.list_departments(db)


@router.get("/all", response_model=SuccessStoryAllResponse, status_code=status.HTTP_200_OK)
def list_all_success_stories(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Retrieve all success stories belonging to the signed-in volunteer."""
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_stories(db, volunteer_id),
    }


@router.get(
    "/{story_id}",
    response_model=SuccessStorySingleResponse,
    status_code=status.HTTP_200_OK,
)
def success_story_details(
    story_id: int = Path(
        ...,
        gt=0,
        le=2147483647,
        description="The success story ID to retrieve. Must be a positive integer greater than zero.",
    ),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Retrieve a single success story by ID with server-side validation and authorization."""
    record = service.get_story(
        db=db,
        story_id=story_id,
        volunteer_id=actor.get("volunteer_id"),
        supervisor_id=actor.get("supervisor_id"),
    )
    return {
        "success": True,
        "message": "Success story record fetched successfully",
        "data": record,
    }


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
