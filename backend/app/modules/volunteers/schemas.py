import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from fastapi import UploadFile
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

# Labels the app shows -> codes stored in volunteer_registration.gender.
GENDER_CODES = {
    "male": "MALE",
    "female": "FEMALE",
    "other": "OTHER",
    "prefer not to say": "PREFER_NOT_TO_SAY",
    "prefer_not_to_say": "PREFER_NOT_TO_SAY",
    "m": "MALE",
    "f": "FEMALE",
    "o": "OTHER",
}

MIN_AGE_YEARS = 18

# The app receives this from department_master.department_name. The service
# temporarily converts it to the legacy database value while that column is
# being migrated.
CohvType = str


def _age_on(dob: date, today: date) -> int:
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def _parse_date_if_str(val):
    if not isinstance(val, str) or not val.strip():
        return val
    s = val.strip()
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", s)
    if m:
        d, mon, y = m.groups()
        return f"{y}-{int(mon):02d}-{int(d):02d}"
    return s


class VolunteerRegistrationRequest(BaseModel):
    """The Volunteer Registration form, field for field."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="ignore",
    )

    volunteer_name: str = Field(min_length=2, max_length=150)
    gender: str
    date_of_birth: date
    mobile_no: str
    email: str = Field(max_length=150)
    department_name: str | None = Field(default=None, max_length=150)
    cohv_type: str | None = Field(default=None, max_length=150)
    department_id: int | None = Field(default=None, gt=0, le=32767)
    institution_type_id: int | None = Field(default=None, gt=0, le=32767)
    other_institution_name: str | None = Field(default=None, max_length=200)

    state_lgd_code: int = Field(gt=0)
    district_lgd_code: int = Field(gt=0)
    block_lgd_code: int = Field(gt=0)
    gram_panchayat_lgd_code: int = Field(gt=0)
    village_lgd_code: int = Field(gt=0)

    date_of_joining: date
    education_id: int = Field(gt=0, le=32767)
    profession_id: int = Field(gt=0, le=32767)

    # Optional on the form; must match the department, state and district.
    supervisor_id: int | None = Field(default=None, gt=0)

    pin: str

    # Registration location: the GPS fix, or the reason there isn't one.
    latitude: Decimal | None = Field(default=None, ge=-90, le=90, decimal_places=6)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, decimal_places=6)
    gps_accuracy_m: int | None = Field(default=None, ge=0)
    gps_unavailable_reason: str | None = Field(default=None, max_length=200)

    device_id: str | None = Field(default=None, max_length=50)

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        # A form posts an empty optional field as "" - treat it as not sent,
        # or "" would fail as an integer / decimal.
        if isinstance(values, dict):
            cleaned = {}
            for k, v in values.items():
                if v in ("", "null", "undefined", "None"):
                    cleaned[k] = None
                else:
                    cleaned[k] = v

            # Zero values for optional foreign keys/IDs should be treated as None
            for fk_field in ("supervisor_id", "institution_type_id", "department_id"):
                if cleaned.get(fk_field) in (0, "0"):
                    cleaned[fk_field] = None

            # Clean and parse date fields if they are strings
            for date_field in ("date_of_birth", "date_of_joining"):
                if date_field in cleaned and cleaned[date_field]:
                    cleaned[date_field] = _parse_date_if_str(cleaned[date_field])

            legacy_map = {
                "Public Health": "Public Health Department",
                "Animal": "Animal Department",
                "Wildlife": "Wildlife Department",
                "Environment": "Environment Department",
            }

            dept_by_id = {
                1: "Public Health Department",
                2: "Animal Department",
                3: "Wildlife Department",
                4: "Environment Department",
                5: "Rural Department",
                6: "Urban Department",
            }

            name_to_id = {
                "Public Health Department": 1,
                "Animal Department": 2,
                "Wildlife Department": 3,
                "Environment Department": 4,
                "Rural Department": 5,
                "Urban Department": 6,
            }

            raw_dept = cleaned.get("department_name") or cleaned.get("cohv_type")
            if not raw_dept and cleaned.get("department_id"):
                try:
                    raw_dept = dept_by_id.get(int(cleaned["department_id"]))
                except (ValueError, TypeError):
                    pass

            if isinstance(raw_dept, str) and raw_dept.strip():
                mapped_dept = legacy_map.get(raw_dept.strip(), raw_dept.strip())
                cleaned["department_name"] = mapped_dept
                cleaned["cohv_type"] = mapped_dept

            if not cleaned.get("department_id") and cleaned.get("department_name") in name_to_id:
                cleaned["department_id"] = name_to_id[cleaned["department_name"]]

            return cleaned
        return values

    @field_validator("volunteer_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not any(char.isalpha() for char in value):
            raise ValueError("Enter a valid volunteer name.")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        code = GENDER_CODES.get(value.lower())
        if code is None:
            raise ValueError("Gender must be Male, Female, Other or Prefer not to say.")
        return code

    @field_validator("mobile_no")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        if not re.fullmatch(r"[6-9][0-9]{9}", value):
            raise ValueError("Mobile Number must be a valid 10-digit number.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("E-mail is not a valid address.")
        return value.lower()

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{4,6}", value):
            raise ValueError("PIN must be 4 to 6 digits.")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        today = date.today()
        if value > today:
            raise ValueError("Date of Birth cannot be in the future.")
        if _age_on(value, today) < MIN_AGE_YEARS:
            raise ValueError("The volunteer must be at least 18 years old.")
        return value

    @field_validator("date_of_joining")
    @classmethod
    def validate_joining(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of Joining cannot be in the future.")
        return value

    @model_validator(mode="after")
    def validate_cross_fields(self):
        if not self.department_name:
            raise ValueError("department_name or cohv_type is required.")

        if self.date_of_joining <= self.date_of_birth:
            raise ValueError("Date of Joining must be after Date of Birth.")

        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Send both latitude and longitude, or neither.")

        return self


class VolunteerRegistrationForm(VolunteerRegistrationRequest):
    """The multipart form posted to /register: every field above plus the
    profile photograph. The photo lives in the model, not as a separate
    parameter, because FastAPI only lays a form model out as flat fields
    when it is the endpoint's sole body parameter."""

    photo: UploadFile | None = Field(
        default=None,
        description="Profile Photograph: JPEG, PNG or WebP, up to 5 MB.",
    )


class VolunteerRegistrationResponse(BaseModel):
    message: str
    volunteer_id: int
    volunteer_code: str
    status: str
    institution_name: str | None = None
    photo_path: str | None = None


class VolunteerCodePreviewResponse(BaseModel):
    message: str
    volunteer_code_preview: str


class VolunteerProfileResponse(BaseModel):
    """Full volunteer profile for display and verification."""

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="allow",
    )

    success: bool = True
    message: str = "Volunteer profile fetched successfully"
    data: dict[str, Any] | None = None

    volunteer_id: int
    volunteer_code: str
    volunteer_name: str
    gender: str
    date_of_birth: date
    mobile_no: str
    email: str

    department_id: int | None = None
    department_name: str | None = None
    cohv_type: str | None = None
    institution_type_id: int | None = None
    institution_type_name: str | None = None
    institution_name: str | None = None
    other_institution_name: str | None = None

    state_lgd_code: int | None = None
    state_name: str | None = None
    district_lgd_code: int | None = None
    district_name: str | None = None
    block_lgd_code: int | None = None
    block_name: str | None = None
    gram_panchayat_lgd_code: int | None = None
    gram_panchayat_name: str | None = None
    village_lgd_code: int | None = None
    village_name: str | None = None

    date_of_joining: date | None = None
    education_id: int | None = None
    education_name: str | None = None
    profession_id: int | None = None
    profession_name: str | None = None

    supervisor_id: int | None = None
    supervisor_name: str | None = None
    supervisor_mobile: str | None = None
    supervisor_email: str | None = None

    photo_path: str | None = None
    photo_url: str | None = None
    photo: str | None = None
    status: str | None = None
    status_remarks: str | None = None
    approved_by: int | None = None
    approved_by_name: str | None = None
    approved_at: datetime | None = None

    reg_latitude: Decimal | None = None
    reg_longitude: Decimal | None = None
    reg_gps_accuracy_m: int | None = None
    reg_gps_unavailable_reason: str | None = None
    device_id: str | None = None

    last_login_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Dynamic KPI and activity counters
    total_visits: int = 0
    alerts_generated: int = 0
    referrals: int = 0
    awareness_activities: int = 0


class LoginHistoryItem(BaseModel):
    login_id: int
    volunteer_id: int
    volunteer_code: str | None = None
    login_at: datetime
    login_method: str
    is_success: bool
    device_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None


class LoginHistoryResponse(BaseModel):
    success: bool = True
    message: str = "Login history fetched successfully"
    data: list[LoginHistoryItem]


class VolunteerProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    volunteer_name: str | None = Field(default=None, min_length=2, max_length=150)
    gender: str | None = None
    date_of_birth: date | None = None
    mobile_no: str | None = None
    email: str | None = None
    department_id: int | None = Field(default=None, gt=0)
    department_name: str | None = None
    cohv_type: str | None = None
    institution_type_id: int | None = Field(default=None, gt=0)
    institution_name: str | None = Field(default=None, max_length=200)
    other_institution_name: str | None = Field(default=None, max_length=200)
    education_id: int | None = Field(default=None, gt=0)
    profession_id: int | None = Field(default=None, gt=0)
    supervisor_id: int | None = Field(default=None, gt=0)
    state_lgd_code: int | None = Field(default=None, gt=0)
    district_lgd_code: int | None = Field(default=None, gt=0)
    block_lgd_code: int | None = Field(default=None, gt=0)
    gram_panchayat_lgd_code: int | None = Field(default=None, gt=0)
    village_lgd_code: int | None = Field(default=None, gt=0)
    date_of_joining: date | None = None
    pin: str | None = None
    device_id: str | None = None
    status: str | None = None
    status_remarks: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    reg_latitude: Decimal | None = None
    reg_longitude: Decimal | None = None
    gps_accuracy_m: int | None = None
    reg_gps_accuracy_m: int | None = None
    gps_unavailable_reason: str | None = None
    reg_gps_unavailable_reason: str | None = None
    photo: Any | None = None

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        if isinstance(values, dict):
            cleaned = {}
            for k, v in values.items():
                if v in ("", "null", "undefined", "None", None):
                    cleaned[k] = None
                else:
                    cleaned[k] = v

            # Numeric ID fields: convert string digits to int, ignore empty/invalid strings
            for fk_field in (
                "department_id",
                "supervisor_id",
                "institution_type_id",
                "education_id",
                "profession_id",
                "state_lgd_code",
                "district_lgd_code",
                "block_lgd_code",
                "gram_panchayat_lgd_code",
                "village_lgd_code",
            ):
                val = cleaned.get(fk_field)
                if val in (0, "0", "null", "undefined", "None", "", None):
                    cleaned[fk_field] = None
                elif isinstance(val, str):
                    s_val = val.strip()
                    if s_val.isdigit():
                        cleaned[fk_field] = int(s_val)
                    else:
                        cleaned[fk_field] = None

            # Clean and parse date fields if they are strings
            for d_field in ("date_of_birth", "date_of_joining"):
                val = cleaned.get(d_field)
                if val:
                    parsed = _parse_date_if_str(val)
                    try:
                        if isinstance(parsed, str):
                            date.fromisoformat(parsed)
                        cleaned[d_field] = parsed
                    except Exception:
                        cleaned[d_field] = None

            # Map gender if provided
            if "gender" in cleaned and cleaned["gender"]:
                g_str = str(cleaned["gender"]).strip().lower()
                cleaned["gender"] = GENDER_CODES.get(g_str, str(cleaned["gender"]).upper())

            return cleaned
        return values

