from typing import Annotated

from fastapi import APIRouter, Depends, Form, Path, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id, get_current_actor
from app.modules.events import service
from app.modules.events.schemas import (
    EventFormMetadata,
    EventReportForm,
    EventReportListItem,
    EventReportResponse,
    EventListQuery,
)

router = APIRouter(
    prefix="/api/events",
    tags=["Event Reporting"],
)


@router.get("/form-metadata", response_model=EventFormMetadata)
def form_metadata(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Everything the Event Reporting form needs for the signed-in volunteer:
    the locked Primary sector (from their COHV type), its Event and Population
    dropdowns, their district's villages, and the attachment limits."""
    return service.get_form_metadata(db, volunteer_id)


@router.get("/all", response_model=dict, status_code=status.HTTP_200_OK)
def list_all_event_reports(
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """List all event reports belonging to the signed-in volunteer."""
    return {
        "success": True,
        "message": "All records fetched successfully",
        "data": service.list_all_event_reports(db, volunteer_id),
    }


@router.get(
    "/{event_report_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def get_event_report_record(
    event_report_id: int = Path(
        ...,
        gt=0,
        le=2147483647,
        description="The event report ID to retrieve. Must be a positive integer greater than zero.",
    ),
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Retrieve a single event report by ID with server-side validation and authorization."""
    record = service.get_event_report_by_id(
        db=db,
        event_report_id=event_report_id,
        volunteer_id=actor.get("volunteer_id"),
        supervisor_id=actor.get("supervisor_id"),
    )
    return {
        "success": True,
        "message": "Event report record fetched successfully",
        "data": record,
    }


@router.post(
    "",
    response_model=EventReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_event_report(
    data: Annotated[EventReportForm, Form(media_type="multipart/form-data")],
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """Submit an event report with its photos, videos and documents. The
    Primary sector is taken from the volunteer's COHV type, not the request."""
    return service.create_event_report(db, volunteer_id, data)
