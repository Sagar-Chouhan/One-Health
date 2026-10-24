import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    login: str = Field(
        min_length=1,
        max_length=30,
        description="Volunteer ID (e.g. COHV-26-0001) or 10-digit mobile number.",
    )
    pin: str = Field(description="The 4-6 digit PIN set at registration.")
    device_id: str | None = Field(default=None, max_length=50)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{4,6}", value):
            raise ValueError("PIN must be 4 to 6 digits.")
        return value


class VolunteerProfile(BaseModel):
    """What the app needs after sign-in: the dashboard header and the
    volunteer's own scope."""

    volunteer_id: int
    volunteer_code: str
    volunteer_name: str
    mobile_no: str
    email: str
    cohv_type: str
    status: str
    photo_path: str | None

    state_lgd_code: int
    state_name: str
    district_lgd_code: int
    district_name: str
    block_lgd_code: int
    block_name: str
    gram_panchayat_lgd_code: int
    gram_panchayat_name: str
    village_lgd_code: int
    village_name: str

    supervisor_id: int | None
    supervisor_name: str | None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Seconds until the token expires.")
    volunteer: VolunteerProfile


class LogoutResponse(BaseModel):
    message: str
