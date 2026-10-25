import logging
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_pin
from app.modules.departments import repository as departments
from app.modules.supervisors import repository as supervisors
from app.modules.volunteers.models import VolunteerRegistration
from app.modules.volunteers.photo import delete_photo, read_photo, save_photo
from app.modules.volunteers import repository as volunteers_repo
from app.modules.volunteers.schemas import VolunteerRegistrationRequest

logger = logging.getLogger(__name__)


def _invalid(detail: str) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail=detail,
    )


def _is_active(db: Session, table: str, key: str, value: int) -> bool:
    return db.execute(
        text(f"SELECT 1 FROM public.{table} WHERE {key} = :value AND is_active"),
        {"value": value},
    ).scalar_one_or_none() is not None


def validate_department_selection(
    db: Session,
    data: VolunteerRegistrationRequest,
) -> bool | None:
    """Validate optional department/institution fields and return is_other."""
    if data.department_id is None and data.institution_type_id is None:
        return None
    if data.department_id is None and data.institution_type_id is not None:
        raise _invalid(
            "department_id is required when institution_type_id is provided."
        )

    if data.department_id is not None:
        department = departments.get_active_department(db, data.department_id)
        if department is None:
            raise _invalid("Department is invalid or inactive.")

        if data.department_name != department["department_name"]:
            data.department_name = department["department_name"]

    if data.institution_type_id is not None:
        institution = departments.get_active_institution(
            db,
            data.department_id,
            data.institution_type_id,
        )
        if institution is None:
            raise _invalid(
                "Institution is invalid, inactive, or does not belong to the "
                "selected department."
            )

        if institution["is_other"] and not data.other_institution_name:
            raise _invalid(
                "other_institution_name is required for the selected institution."
            )
        return institution["is_other"]

    return None


def get_institution_name(
    db: Session,
    department_id: int | None,
    institution_type_id: int | None,
) -> str | None:
    """Return the active institution label for the selected department."""
    if department_id is None or institution_type_id is None:
        return None

    if not hasattr(db, "execute"):
        return None

    return db.execute(
        text(
            """
            SELECT option_name
            FROM public.cohv_institution_type_master
            WHERE institution_type_id = :institution_type_id
              AND department_id = :department_id
              AND is_active = TRUE
            """
        ),
        {
            "institution_type_id": institution_type_id,
            "department_id": department_id,
        },
    ).scalar_one_or_none()


def validate_reference_ids(db: Session, data: VolunteerRegistrationRequest) -> None:
    """Check the LGD chain and every master id before touching the table.

    The database enforces the same rules through foreign keys; checking here
    first gives the volunteer a specific message instead of a generic error.
    """
    village_ok = db.execute(
        text(
            """
            SELECT 1
            FROM public.village_master v
            JOIN public.gram_panchayat_master g USING (gram_panchayat_lgd_code)
            JOIN public.block_master b ON b.block_lgd_code = v.block_lgd_code
            JOIN public.district_master d ON d.district_lgd_code = v.district_lgd_code
            JOIN public.state_master s ON s.state_lgd_code = v.state_lgd_code
            WHERE v.village_lgd_code = :village
              AND v.gram_panchayat_lgd_code = :gp
              AND v.block_lgd_code = :block
              AND v.district_lgd_code = :district
              AND v.state_lgd_code = :state
              AND v.is_active AND g.is_active AND b.is_active
              AND d.is_active AND s.is_active
            """
        ),
        {
            "village": data.village_lgd_code,
            "gp": data.gram_panchayat_lgd_code,
            "block": data.block_lgd_code,
            "district": data.district_lgd_code,
            "state": data.state_lgd_code,
        },
    ).scalar_one_or_none()

    if village_ok is None:
        raise _invalid(
            "Selected location does not follow the State > District > Block > "
            "Gram Panchayat > Village hierarchy, or is inactive."
        )

    if not _is_active(db, "education_master", "education_id", data.education_id):
        raise _invalid("Educational Qualification is invalid.")

    if not _is_active(db, "profession_master", "profession_id", data.profession_id):
        raise _invalid("Profession is invalid.")

    if departments.get_active_department_by_name(db, data.department_name) is None:
        raise _invalid("Department name is invalid or inactive.")

    # Same rule as the Reporting Supervisor dropdown.
    if data.supervisor_id is not None and not supervisors.is_eligible(
        db,
        supervisor_id=data.supervisor_id,
        department_name=data.department_name,
        state_lgd_code=data.state_lgd_code,
        district_lgd_code=data.district_lgd_code,
    ):
        raise _invalid(
            "Reporting Supervisor must be an active supervisor "
            "of the selected department, state and district."
        )

    validate_department_selection(db, data)


def validate_mobile_and_email(
    db: Session,
    data: VolunteerRegistrationRequest,
) -> None:
    """Check whether the mobile number or email already exists."""

    mobile_exists = db.scalar(
        select(VolunteerRegistration.volunteer_id).where(
            VolunteerRegistration.mobile_no == data.mobile_no
        )
    )

    if mobile_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This mobile number is already registered.",
        )

    email_exists = db.scalar(
        select(VolunteerRegistration.volunteer_id).where(
            VolunteerRegistration.email == data.email
        )
    )

    if email_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already registered.",
        )


def peek_volunteer_code(db: Session) -> str:
    """The code next_record_code('COHV') would issue now, without using it up.

    Not a reservation: if another volunteer registers first, the final code
    will be the next number along.
    """
    return db.execute(
        text(
            """
            SELECT 'COHV-' || LPAD(y::TEXT, 2, '0') || '-' ||
                   LPAD((COALESCE(cs.last_value, 0) + 1)::TEXT, 4, '0')
            FROM (SELECT (EXTRACT(YEAR FROM CURRENT_DATE)::INT % 100)::SMALLINT AS y) yr
            LEFT JOIN public.code_sequence cs
              ON cs.prefix = 'COHV' AND cs.year_2d = yr.y
            """
        )
    ).scalar_one()


def preview_volunteer_code(
    db: Session,
    data: VolunteerRegistrationRequest,
) -> str:
    """Validate details and return a non-reserved code preview."""

    validate_reference_ids(db, data)
    validate_mobile_and_email(db, data)
    return peek_volunteer_code(db)


def register_volunteer(
    db: Session,
    data: VolunteerRegistrationRequest,
    photo: UploadFile | None = None,
) -> VolunteerRegistration:
    """Validate, create and persist a volunteer registration, with the
    profile photograph if one was sent.

    The volunteer starts as PENDING; the supervisor system approves it.
    The row and the photo succeed or fail together: the photo is named after
    the volunteer code, so it is written after the insert but before the
    commit, and removed again if the commit does not go through.
    """

    validate_reference_ids(db, data)
    validate_mobile_and_email(db, data)
    photo_file = read_photo(photo)   # validated before anything is written
    institution_is_other = validate_department_selection(db, data)
    institution_name = get_institution_name(
        db=db,
        department_id=data.department_id,
        institution_type_id=data.institution_type_id,
    )

    volunteer = VolunteerRegistration(
        volunteer_name=data.volunteer_name,
        gender=data.gender,
        date_of_birth=data.date_of_birth,
        mobile_no=data.mobile_no,
        email=data.email,
        department_name=data.department_name,
        department_id=data.department_id,
        institution_type_id=data.institution_type_id,
        institution_name=institution_name,
        other_institution_name=(
            data.other_institution_name if institution_is_other else None
        ),
        state_lgd_code=data.state_lgd_code,
        district_lgd_code=data.district_lgd_code,
        block_lgd_code=data.block_lgd_code,
        gram_panchayat_lgd_code=data.gram_panchayat_lgd_code,
        village_lgd_code=data.village_lgd_code,
        date_of_joining=data.date_of_joining,
        education_id=data.education_id,
        profession_id=data.profession_id,
        supervisor_id=data.supervisor_id,
        pin_hash=hash_pin(data.pin),
        reg_latitude=data.latitude,
        reg_longitude=data.longitude,
        reg_gps_accuracy_m=data.gps_accuracy_m,
        reg_gps_unavailable_reason=data.gps_unavailable_reason,
        device_id=data.device_id,
    )

    saved_photo = None
    try:
        db.add(volunteer)
        db.flush()
        db.refresh(volunteer)            # pick up the database-issued volunteer_code

        if photo_file is not None:
            saved_photo = save_photo(volunteer.volunteer_code, *photo_file)
            volunteer.photo_path = saved_photo

        db.commit()
        db.refresh(volunteer)
        return volunteer

    except OSError as exc:
        db.rollback()
        delete_photo(saved_photo)
        logger.error("Volunteer photo could not be saved: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile Photograph could not be saved. Please try again.",
        ) from exc

    except IntegrityError as exc:
        db.rollback()
        delete_photo(saved_photo)

        # psycopg exposes the violated constraint by name - match on that
        # rather than on the message text.
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""

        # Log the actual database error on the server, not to the client.
        logger.warning("Volunteer registration constraint failure: %s", constraint)

        if constraint == "volunteer_registration_mobile_no_key":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This mobile number is already registered.",
            ) from exc

        if constraint == "volunteer_registration_email_key":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email address is already registered.",
            ) from exc

        if constraint.startswith("fk_volunteer_"):
            raise _invalid(
                "One or more selected location or master values are invalid."
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration violates a database constraint.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        delete_photo(saved_photo)

        logger.error(
            "Volunteer registration database operation failed: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration could not be completed. Please try again.",
        ) from exc


def get_volunteer_profile(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
) -> dict:
    """Retrieve full volunteer profile by volunteer_id or volunteer_code."""
    profile = volunteers_repo.get_volunteer_profile(
        db,
        volunteer_id=volunteer_id,
        volunteer_code=volunteer_code,
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer profile not found.",
        )
    return profile


def get_volunteer_summary(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
) -> dict:
    """Retrieve performance KPI summary for volunteer."""
    summary = volunteers_repo.get_volunteer_summary(
        db,
        volunteer_id=volunteer_id,
        volunteer_code=volunteer_code,
    )
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer summary not found.",
        )
    return summary


def get_login_history(
    db: Session,
    *,
    volunteer_id: int | None = None,
    volunteer_code: str | None = None,
    limit: int = 50,
) -> list[dict]:
    history = volunteers_repo.get_login_history(
        db,
        volunteer_id=volunteer_id,
        volunteer_code=volunteer_code,
        limit=limit,
    )
    return history


def edit_volunteer_profile(
    db: Session,
    *,
    volunteer_id: int,
    data: dict,
    photo: Any | None = None,
) -> dict:
    current = volunteers_repo.get_volunteer_profile(db, volunteer_id=volunteer_id)
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found.",
        )

    allowed_fields = {
        "volunteer_name", "gender", "date_of_birth", "mobile_no", "email",
        "department_id", "department_name", "cohv_type",
        "institution_type_id", "institution_name", "other_institution_name",
        "education_id", "profession_id", "supervisor_id",
        "state_lgd_code", "district_lgd_code", "block_lgd_code",
        "gram_panchayat_lgd_code", "village_lgd_code",
        "date_of_joining", "device_id", "status", "status_remarks",
        "reg_latitude", "reg_longitude", "reg_gps_accuracy_m", "reg_gps_unavailable_reason"
    }

    # Map aliases
    if "latitude" in data and "reg_latitude" not in data:
        data["reg_latitude"] = data["latitude"]
    if "longitude" in data and "reg_longitude" not in data:
        data["reg_longitude"] = data["longitude"]
    if "gps_accuracy_m" in data and "reg_gps_accuracy_m" not in data:
        data["reg_gps_accuracy_m"] = data["gps_accuracy_m"]
    if "gps_unavailable_reason" in data and "reg_gps_unavailable_reason" not in data:
        data["reg_gps_unavailable_reason"] = data["gps_unavailable_reason"]

    updates = {}
    for k, v in data.items():
        if k in allowed_fields and v is not None and v != "":
            updates[k] = v

    if "pin" in data and data["pin"]:
        updates["pin"] = hash_pin(str(data["pin"]).strip())

    if photo:
        photo_file = read_photo(photo)
        if photo_file is not None:
            saved_photo = save_photo(current["volunteer_code"], *photo_file)
            updates["photo_path"] = saved_photo

    updated_profile = volunteers_repo.update_volunteer_profile(db, volunteer_id, updates)
    if updated_profile:
        sp = updated_profile.get("photo_path")
        if sp:
            updated_profile["photo_url"] = f"/uploads/{sp}"
            updated_profile["photo"] = updated_profile["photo_url"]
        else:
            updated_profile["photo_url"] = None
            updated_profile["photo"] = None

    return updated_profile

