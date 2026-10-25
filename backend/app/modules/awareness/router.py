from typing import Annotated

from fastapi import APIRouter, Depends, Form, Path, Request, status
from sqlalchemy.orm import Session

from app.modules.events.attachments import parse_multipart_or_json
from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id, get_current_actor, get_optional_actor
from app.modules.awareness import repository, service
from app.modules.awareness.schemas import (
    AwarenessActivityCreate,
    AwarenessActivityResponse,
    AwarenessAllResponse,
    AwarenessSingleResponse,
)

router = APIRouter(prefix="/api/awareness-activities", tags=["Awareness Activities"])


@router.get("/all", response_model=AwarenessAllResponse, status_code=status.HTTP_200_OK)
def list_all_awareness_activities(
    volunteer_id: int | None = None,
    actor: dict | None = Depends(get_optional_actor),
    db: Session = Depends(get_db),
):
    v_id = volunteer_id
    if actor and actor.get("role") == "COHV":
        v_id = actor.get("volunteer_id")
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_activities(db, v_id),
    }


@router.get("/activity-types")
def activity_types(db: Session = Depends(get_db)):
    return repository.list_activity_types(db)


@router.get("/topics")
def topics(db: Session = Depends(get_db)):
    return repository.list_topics(db)


@router.get(
    "/{awareness_id}",
    response_model=AwarenessSingleResponse,
    status_code=status.HTTP_200_OK,
)
def get_awareness_activity(
    awareness_id: int = Path(
        ...,
        gt=0,
        le=2147483647,
        description="The awareness activity ID to retrieve. Must be a positive integer greater than zero.",
    ),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Retrieve a single awareness activity by ID with server-side validation and authorization."""
    record = service.get_activity_by_id(
        db=db,
        awareness_id=awareness_id,
        volunteer_id=actor.get("volunteer_id"),
        supervisor_id=actor.get("supervisor_id"),
    )
    return {
        "success": True,
        "message": "Awareness activity fetched successfully",
        "data": record,
    }


@router.post("", response_model=AwarenessActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_awareness_activity(
    request: Request,
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    data = await parse_multipart_or_json(request, AwarenessActivityCreate)
    return service.create_activity(db, volunteer_id, data)
