import logging
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.events import attachments, repository
from app.modules.events.schemas import (
    SECTOR_OF_COHV_TYPE,
    BACK_ENTRY_DAYS,
    EventReportForm,
)

logger = logging.getLogger(__name__)

# Alert raised from an event report, by the volunteer's sector.
ALERT_CATEGORY_OF_SECTOR = {
    "human": "Human health alert",
    "animal": "Animal health alert",
    "wildlife": "Wildlife alert",
    "environment": "Environmental alert",
}


def _invalid(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def sector_for_volunteer(db: Session, volunteer_id: int) -> tuple[dict, str]:
    scope = repository.volunteer_scope(db, volunteer_id)
    if scope is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer not found.")
    sector_code = SECTOR_OF_COHV_TYPE.get(scope["cohv_type"])
    if sector_code is None:
        raise _invalid("Your COHV type has no reporting sector.")
    return scope, sector_code


def get_form_metadata(db: Session, volunteer_id: int) -> dict:
    """Everything the Event Reporting form needs for this volunteer: the
    locked Primary sector, its Event and Population lists, their district's
    villages, and the attachment limits."""
    from datetime import date, timedelta

    scope, sector_code = sector_for_volunteer(db, volunteer_id)
    sec = repository.sector(db, sector_code)
    if sec is None:
        logger.error(
            "Reporting sector %r is missing from sector_master for volunteer %s",
            sector_code,
            volunteer_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reporting sector configuration is unavailable.",
        )
    today = date.today()

    return {
        "primary_sector": {"sector_code": sec["sector_code"], "sector_name": sec["sector_name"]},
        "event_types": repository.event_types_for(db, sector_code),
        "population": {
            "label": sec["population_label"],
            "options": repository.population_types_for(db, sector_code),
        },
        "location_types": ["Urban", "Rural"],
        "villages": repository.villages_in_district(db, scope["district_lgd_code"]),
        "upload_limits": attachments.upload_limits(),
        "min_date": today - timedelta(days=BACK_ENTRY_DAYS),
        "max_date": today,
    }


def list_event_reports(
    db: Session,
    volunteer_id: int,
    *,
    limit: int,
    offset: int,
) -> list[dict]:
    return repository.list_event_reports(
        db,
        volunteer_id,
        limit=limit,
        offset=offset,
    )


def list_event_reports_page(db: Session, volunteer_id: int, query) -> dict:
    filters = query.model_dump()
    if filters["volunteer_id"] not in (None, volunteer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only list your own event reports.",
        )
    items, total = repository.list_event_reports_page(
        db,
        owner_volunteer_id=volunteer_id,
        filters=filters,
    )
    return {
        "success": True,
        "message": "Records fetched successfully",
        "data": {
            "items": items,
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total_records": total,
                "total_pages": ceil(total / query.page_size) if total else 0,
            },
        },
    }


def _validate(db: Session, data: EventReportForm, scope: dict, sector_code: str) -> None:
    event_type = repository.event_type_in_sector(db, data.event_type_id, sector_code)
    if event_type is None:
        raise _invalid("Selected event is not valid for your sector.")
    if event_type["is_other"] and not data.event_type_other:
        raise _invalid("Event (please specify) cannot be left blank.")

    population = repository.population_in_sector(db, data.population_type_id, sector_code)
    if population is None:
        raise _invalid("Selected population is not valid for your sector.")
    if population["is_other"] and not data.population_other:
        raise _invalid("Population (please specify) cannot be left blank.")

    village_district = repository.village_district(db, data.village_lgd_code)
    if village_district is None:
        raise _invalid("Selected village / ward is invalid or inactive.")
    if village_district != scope["district_lgd_code"] and not data.is_out_of_area:
        raise _invalid(
            "This village is outside your registered area. Tick "
            '"Authorised out-of-area visit" to record it.'
        )

    # An alert needs something to act on; the alert table requires both fields.
    if data.alert_generated and not data.action_taken:
        raise _invalid('Immediate action taken is required when "Alert generated" is ticked.')


def create_event_report(db: Session, volunteer_id: int, data: EventReportForm) -> dict:
    """Validate and store an event report, its attachments, and - when the
    volunteer ticked Alert generated - the linked alert. All in one
    transaction: if the files cannot be written, nothing is committed."""
    scope, sector_code = sector_for_volunteer(db, volunteer_id)

    # Offline re-send of a record already stored: return it, don't duplicate.
    if data.client_ref:
        existing = repository.existing_by_client_ref(db, volunteer_id, data.client_ref)
        if existing:
            return {
                "message": "Event report already submitted.",
                "event_report_id": existing["event_report_id"],
                "event_report_code": existing["event_report_code"],
                "verification_status": existing["verification_status"],
                "duplicate": True,
            }

    _validate(db, data, scope, sector_code)
    ready_files = attachments.read_all(
        {"photos": data.photos, "videos": data.videos, "documents": data.documents}
    )

    gps = {
        "latitude": data.latitude,
        "longitude": data.longitude,
        "gps_accuracy_m": data.gps_accuracy_m,
        "gps_unavailable_reason": data.gps_unavailable_reason,
    }

    saved = False
    event = None
    try:
        event = repository.insert_event(
            db,
            {
                "volunteer_id": volunteer_id,
                "client_ref": data.client_ref,
                "device_id": data.device_id,
                "event_type_id": data.event_type_id,
                "event_type_other": data.event_type_other,
                "sector_code": sector_code,
                "event_date": data.date,
                "event_time": data.time,
                "village_lgd_code": data.village_lgd_code,
                "is_out_of_area": data.is_out_of_area,
                "purpose_of_visit": data.purpose_of_visit,
                "location_type": data.location_type.upper(),
                "total_visits": data.total_visits,
                "population_type_id": data.population_type_id,
                "population_other": data.population_other,
                "description": data.description,
                "observations": data.observations,
                "action_taken": data.action_taken,
                "referral_generated": data.referral_generated,
                "alert_generated": data.alert_generated,
                "follow_up_required": data.follow_up_required,
                **gps,
            },
        )

        if ready_files:
            rows = attachments.save_all(event["event_report_code"], ready_files)
            saved = True
            repository.insert_attachments(db, volunteer_id, event["event_report_id"], rows)

        alert_code = None
        if data.alert_generated:
            category = ALERT_CATEGORY_OF_SECTOR.get(sector_code, "Other unusual event")
            alert_code = repository.insert_alert(
                db,
                {
                    "volunteer_id": volunteer_id,
                    "device_id": data.device_id,
                    "alert_category_id": repository.alert_category_id(db, category),
                    "event_report_id": event["event_report_id"],
                    "event_category": data.event_type_other or None,
                    "alert_date": data.date,
                    "village_lgd_code": data.village_lgd_code,
                    "description": data.description or data.observations or category,
                    "action_taken": data.action_taken,
                    **gps,
                },
            )
            repository.notify(
                db,
                volunteer_id,
                "Alert raised",
                f"Event {event['event_report_code']} generated alert {alert_code}, "
                "sent to your supervisor for escalation.",
            )

        db.commit()

    except OSError as exc:
        db.rollback()
        if saved and event:
            attachments.delete_saved(event["event_report_code"])
        logger.error("Event attachment could not be saved: %s", exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Attachments could not be saved. Please try again.",
        ) from exc

    except IntegrityError as exc:
        db.rollback()
        if saved and event:
            attachments.delete_saved(event["event_report_code"])
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
        logger.warning("Event report constraint failure: %s", constraint)
        if constraint == "uq_event_report_client_ref":
            raise HTTPException(status.HTTP_409_CONFLICT, "This event report was already submitted.") from exc
        raise _invalid("One or more selected values are invalid.") from exc

    except SQLAlchemyError as exc:
        db.rollback()
        if saved and event:
            attachments.delete_saved(event["event_report_code"])
        logger.error("Event report database operation failed: %s", type(exc).__name__)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Event report could not be submitted. Please try again.",
        ) from exc

    return {
        "message": "Event report submitted. Awaiting verification.",
        "event_report_id": event["event_report_id"],
        "event_report_code": event["event_report_code"],
        "verification_status": event["verification_status"],
        "alert_code": alert_code,
        "attachments": len(ready_files),
        "duplicate": False,
    }
