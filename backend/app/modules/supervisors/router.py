from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.departments import repository as departments
from app.modules.departments.schemas import DepartmentName
from app.modules.supervisors import repository, service
from app.modules.supervisors.dependencies import get_current_supervisor_id
from app.modules.supervisors.schemas import (
    RegistrationActionRequest,
    RegistrationActionResponse,
    RegistrationRow,
    TeamMember,
    SupervisorLocationOption,
    SupervisorLoginRequest,
    SupervisorLoginResponse,
    SupervisorOption,
    TeamSummary,
    AlertActionRequest,
    AlertActionResponse,
    AlertRow,
    VerificationActionRequest,
    VerificationActionResponse,
    VerificationRow,
)
router = APIRouter(
    prefix="/api/supervisors",
    tags=["Supervisors"],
)


@router.get("/by-location", response_model=list[SupervisorLocationOption])
def get_supervisors_by_location(
    state_lgd_code: int = Query(gt=0),
    district_lgd_code: int = Query(gt=0),
    block_lgd_code: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    """Web sign-in: supervisors in the chosen State > District > Block."""
    return repository.by_location(
        db,
        state_lgd_code=state_lgd_code,
        district_lgd_code=district_lgd_code,
        block_lgd_code=block_lgd_code,
    )


@router.post("/login", response_model=SupervisorLoginResponse)
def supervisor_login(data: SupervisorLoginRequest, db: Session = Depends(get_db)):
    """Sign a COHV supervisor in with e-mail and password."""
    return service.login(db, data)


# ---- signed-in supervisor's own team (dashboard + approvals) ----------------

@router.get("/me/summary", response_model=TeamSummary)
def my_team_summary(
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Dashboard counts for the signed-in supervisor's team."""
    return repository.team_summary(db, supervisor_id)


@router.get("/me/team", response_model=list[TeamMember])
def my_team(
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """The supervisor's team with each volunteer's activity breakdown, for the
    dashboard's 'Where your team works' list and map."""
    return repository.team_members(db, supervisor_id)


@router.get("/me/registrations", response_model=list[RegistrationRow])
def my_team_registrations(
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Volunteers reporting to the signed-in supervisor, for the Approvals queue."""
    return repository.team_registrations(db, supervisor_id)


@router.post(
    "/me/registrations/{volunteer_id}/action",
    response_model=RegistrationActionResponse,
)
def act_on_registration(
    data: RegistrationActionRequest,
    volunteer_id: int = Path(gt=0),
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Approve, reject, deactivate, suspend or reinstate a volunteer on your team."""
    new_status = repository.STATUS_FOR_ACTION[data.action]
    row = repository.set_volunteer_status(
        db,
        supervisor_id=supervisor_id,
        volunteer_id=volunteer_id,
        new_status=new_status,
        remarks=data.remarks,
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer not found on your team.")
    done = {"approve": "approved and activated", "reject": "rejected",
            "deactivate": "deactivated", "suspend": "suspended", "reinstate": "reinstated"}
    return {"message": f"Volunteer {done[data.action]}.", **row}


LEGACY_COHV_MAP = {
    "Public Health": "Public Health Department",
    "Animal": "Animal Department",
    "Wildlife": "Wildlife Department",
    "Environment": "Environment Department",
}


@router.get("", response_model=list[SupervisorOption])
def get_supervisors(
    department_name: DepartmentName = Query(
        default=None,
        description="Select active department",
    ),
    cohv_type: str | None = Query(
        default=None,
        description="Legacy parameter for department name",
        include_in_schema=False,
    ),
    state_lgd_code: int = Query(gt=0, description="State LGD code", examples=[36]),
    district_lgd_code: int = Query(gt=0, description="District LGD code", examples=[694]),
    db: Session = Depends(get_db),
):
    raw_dept = (
        (department_name.value if hasattr(department_name, "value") else str(department_name))
        if department_name is not None
        else cohv_type
    )

    if not raw_dept:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Department name is required.",
        )

    dept_value = LEGACY_COHV_MAP.get(raw_dept.strip(), raw_dept.strip())

    if departments.get_active_department_by_name(db, dept_value) is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Department name must be an active department.",
        )
    return repository.list_for(
        db,
        department_name=dept_value,
        state_lgd_code=state_lgd_code,
        district_lgd_code=district_lgd_code,
    )


@router.get("/me/alerts", response_model=list[AlertRow])
def my_team_alerts(
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Alerts escalations queue for the signed-in supervisor's team."""
    return repository.team_alerts(db, supervisor_id)


@router.post(
    "/me/alerts/{alert_id}/action",
    response_model=AlertActionResponse,
)
def act_on_alert(
    data: AlertActionRequest,
    alert_id: int = Path(gt=0),
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Escalate, resolve, or close an alert from your team."""
    row = repository.set_alert_status(
        db,
        supervisor_id=supervisor_id,
        alert_id=alert_id,
        action=data.action,
        remarks=data.remarks,
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found on your team.")
    done = {"escalate": "escalated to district", "resolve": "resolved and closed", "close": "closed"}
    return {"message": f"Alert {done.get(data.action, data.action)}.", **row}


@router.get("/me/verifications", response_model=list[VerificationRow])
def my_team_verifications(
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Field-records awaiting verification queue for the signed-in supervisor's team."""
    return repository.team_verifications(db, supervisor_id)


STATUS_ACTION_MAP = {
    "under_review": ("UNDER_REVIEW", "Under Review"),
    "under review": ("UNDER_REVIEW", "Under Review"),
    "verified": ("VERIFIED", "Verified"),
    "verify": ("VERIFIED", "Verified"),
    "returned": ("RETURNED", "Returned for Correction"),
    "returned for correction": ("RETURNED", "Returned for Correction"),
    "returned_for_correction": ("RETURNED", "Returned for Correction"),
    "reject": ("RETURNED", "Returned for Correction"),
    "rejected": ("RETURNED", "Returned for Correction"),
    "escalated": ("ESCALATED", "Escalated"),
    "escalate": ("ESCALATED", "Escalated"),
    "closed": ("CLOSED", "Closed"),
    "close": ("CLOSED", "Closed"),
    "submitted": ("SUBMITTED", "Submitted"),
}


@router.post(
    "/me/verifications/{record_type}/{record_id}/action",
    response_model=VerificationActionResponse,
)
def act_on_verification(
    data: VerificationActionRequest,
    record_type: str = Path(),
    record_id: int = Path(gt=0),
    supervisor_id: int = Depends(get_current_supervisor_id),
    db: Session = Depends(get_db),
):
    """Change verification state for a field record with strict validation."""
    # 1. Validate record_type
    if record_type not in repository.TABLE_PK_MAP:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid record type '{record_type}'. Supported: {', '.join(repository.TABLE_PK_MAP.keys())}"
        )

    # 2. Validate action status
    raw_action = data.action.strip().lower()
    if raw_action not in STATUS_ACTION_MAP:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid status '{data.action}'. Allowed: Under Review, Verified, Returned for Correction, Escalated, Closed."
        )

    canonical_status, display_label = STATUS_ACTION_MAP[raw_action]

    # 3. Check existing record
    existing = repository.get_current_record_status(
        db, supervisor_id=supervisor_id, record_type=record_type, record_id=record_id
    )
    if existing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found on your team.")

    if existing["verification_status"] == canonical_status:
        return {
            "message": f"Record {existing['record_code']} is already in '{display_label}' status.",
            "record_id": record_id,
            "record_code": existing["record_code"],
            "record_type": record_type,
            "verification_status": canonical_status,
        }

    # 4. Perform update
    row = repository.set_verification_status(
        db,
        supervisor_id=supervisor_id,
        record_type=record_type,
        record_id=record_id,
        new_status=canonical_status,
        remarks=data.remarks,
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found on your team.")

    return {
        "message": f"Record {row['record_code']} updated to '{display_label}'.",
        **row,
    }
