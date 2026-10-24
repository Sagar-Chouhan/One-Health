from typing import Annotated

from fastapi import APIRouter, Depends, Form, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.auth.dependencies import get_current_volunteer_id
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


@router.get("", response_model=dict)
def get_event_reports(
    query: EventListQuery = Depends(),
    volunteer_id: int = Depends(get_current_volunteer_id),
    db: Session = Depends(get_db),
):
    """List event reports belonging to the signed-in volunteer."""
    return service.list_event_reports_page(db, volunteer_id, query)


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
