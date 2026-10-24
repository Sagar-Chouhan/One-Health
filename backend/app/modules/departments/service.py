from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.departments import repository

COHV_TYPE_BY_DEPARTMENT_NAME = {
    "Public Health Department": "Public Health",
    "Animal Department": "Animal",
    "Wildlife Department": "Wildlife",
    "Environment Department": "Environment",
}


def _department_or_404(db: Session, department_id: int) -> dict:
    department = repository.get_active_department(db, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department is invalid or inactive.",
        )
    return department


def list_departments(db: Session) -> list[dict]:
    return repository.list_active_departments(db)


def get_cohv_type(db: Session, department_id: int) -> dict:
    department = _department_or_404(db, department_id)
    # Until the database is migrated, supervisor records already use the
    # department name as their COHV type. Return that exact master value so the
    # app can use it directly in the Reporting Supervisor lookup.
    return {
        "department_id": department_id,
        "cohv_type": department["department_name"],
    }


def list_institutions(db: Session, department_id: int) -> list[dict]:
    _department_or_404(db, department_id)
    return repository.list_institution_options(db, department_id)
