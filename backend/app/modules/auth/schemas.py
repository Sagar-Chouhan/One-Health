import re

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    login: str = Field(
        default="",
        max_length=50,
        description="Volunteer ID (e.g. COHV-26-0001) or 10-digit mobile number.",
    )
    identifier: str | None = None
    pin: str = Field(description="The 4-6 digit PIN set at registration.")
    password: str | None = None
    device_id: str | None = Field(default=None, max_length=50)

    @model_validator(mode="before")
    @classmethod
    def normalize_login_payload(cls, values):
        if isinstance(values, dict):
            cleaned = dict(values)
            if not cleaned.get("login"):
                for alt in ("identifier", "mobile_no", "mobile", "phone", "username", "volunteer_code"):
                    if cleaned.get(alt):
                        cleaned["login"] = str(cleaned[alt]).strip()
                        break
            if not cleaned.get("pin"):
                for alt_p in ("password", "passcode", "code"):
                    if cleaned.get(alt_p):
                        cleaned["pin"] = str(cleaned[alt_p]).strip()
                        break
            return cleaned
        return values

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{4,6}", value):
            raise ValueError("PIN must be 4 to 6 digits.")
        return value


class VolunteerProfile(BaseModel):
    """What the app needs after sign-in: the dashboard header and the
    volunteer's own scope."""

    model_config = ConfigDict(extra="allow")

    volunteer_id: int
    volunteer_code: str
    volunteer_name: str
    mobile_no: str
    email: str
    cohv_type: str | None = None
    status: str
    photo_path: str | None = None

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

    supervisor_id: int | None = None
    supervisor_name: str | None = None


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    success: bool = True
    message: str = "Login successful"
    access_token: str
    token: str | None = None
    token_type: str = "bearer"
    expires_in: int = Field(description="Seconds until the token expires.")
    volunteer: VolunteerProfile | dict[str, Any]


class LogoutResponse(BaseModel):
    message: str
