from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.departments import service
from app.modules.departments.schemas import (
    DepartmentCohvTypeResponse,
    DepartmentResponse,
    InstitutionOptionResponse,
)

router = APIRouter(prefix="/api/departments", tags=["Department Masters"])


@router.get("", response_model=list[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    return service.list_departments(db)


@router.get(
    "/{department_id}/cohv-type",
    response_model=DepartmentCohvTypeResponse,
)
def get_department_cohv_type(
    department_id: int,
    db: Session = Depends(get_db),
):
    return service.get_cohv_type(db, department_id)


@router.get(
    "/{department_id}/institutions",
    response_model=list[InstitutionOptionResponse],
)
def get_department_institutions(
    department_id: int,
    db: Session = Depends(get_db),
):
    return service.list_institutions(db, department_id)
