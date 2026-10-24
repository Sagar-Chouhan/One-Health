from enum import Enum
from pydantic import BaseModel


class DepartmentName(str, Enum):
    PUBLIC_HEALTH = "Public Health Department"
    ANIMAL = "Animal Department"
    WILDLIFE = "Wildlife Department"
    ENVIRONMENT = "Environment Department"
    RURAL = "Rural Department"
    URBAN = "Urban Department"


class DepartmentResponse(BaseModel):
    department_id: int
    department_name: str


class DepartmentCohvTypeResponse(BaseModel):
    department_id: int
    cohv_type: str


class InstitutionOptionResponse(BaseModel):
    institution_type_id: int
    department_id: int
    field_label: str
    option_name: str
    is_other: bool
    sort_order: int
