from typing import Annotated

from fastapi import APIRouter, Depends, Form, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
from app.modules.awareness import repository, service
from app.modules.awareness.schemas import (
    AwarenessActivityCreate,
    AwarenessActivityResponse,
    AwarenessListQuery,
    AwarenessListResponse,
    AwarenessAllResponse,
)

router = APIRouter(prefix="/api/awareness-activities", tags=["Awareness Activities"])


@router.get("", response_model=AwarenessListResponse)
def list_awareness_activities(
    query: AwarenessListQuery = Depends(),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.list_activities(db, volunteer_id, query)


@router.get("/all", response_model=AwarenessAllResponse)
def list_all_awareness_activities(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_activities(db, volunteer_id),
    }


@router.post("", response_model=AwarenessActivityResponse, status_code=status.HTTP_201_CREATED)
def create_awareness_activity(
    data: Annotated[
        AwarenessActivityCreate,
        Form(media_type="multipart/form-data"),
    ],
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    return service.create_activity(db, volunteer_id, data)


@router.get("/activity-types")
def activity_types(db: Session = Depends(get_db)):
    return repository.list_activity_types(db)


@router.get("/topics")
def topics(db: Session = Depends(get_db)):
    return repository.list_topics(db)
