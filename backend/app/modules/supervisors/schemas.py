from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SupervisorOption(BaseModel):
    """One entry in the Reporting Supervisor dropdown. Contact details are
    deliberately left out - the form does not need them."""

    supervisor_id: int
    supervisor_code: str
    supervisor_name: str
    designation: str | None
    department_name: str | None


class SupervisorLocationOption(BaseModel):
    """One entry in the web sign-in's supervisor dropdown - shows designation,
    department name and the e-mail to sign in with."""

    supervisor_id: int
    supervisor_code: str
    supervisor_name: str
    designation: str | None
    department_name: str | None
    email: str | None


class SupervisorLoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=1, max_length=128)


class SupervisorProfile(BaseModel):
    supervisor_id: int
    supervisor_code: str
    supervisor_name: str
    designation: str | None
    department_name: str | None
    email: str | None
    state_lgd_code: int | None
    state_name: str | None
    district_lgd_code: int | None
    district_name: str | None
    block_lgd_code: int | None
    block_name: str | None


class SupervisorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    supervisor: SupervisorProfile


class TeamSummary(BaseModel):
    team_total: int
    pending_approvals: int
    active_count: int
    suspended_count: int
    inactive_count: int
    rejected_count: int
    awaiting_verification: int
    total_visits: int
    alerts_generated: int
    open_alerts: int
    referrals: int
    referrals_followup: int
    samples: int
    awareness: int
    trainings_imparted: int
    trainings_attended: int
    meetings: int
    success_stories: int


class RegistrationRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    volunteer_id: int
    volunteer_code: str
    volunteer_name: str
    status: str
    created_at: datetime
    department_name: str | None
    village_name: str | None
    block_name: str | None
    district_name: str | None


class TeamActivity(BaseModel):
    events: int = 0
    referrals: int = 0
    samples: int = 0
    awareness: int = 0
    imparted: int = 0
    attended: int = 0


class TeamMember(BaseModel):
    volunteer_id: int
    volunteer_name: str
    status: str
    village_name: str | None
    district_name: str | None
    activity: TeamActivity


class RegistrationActionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    action: Literal["approve", "reject", "deactivate", "suspend", "reinstate"]
    remarks: str | None = Field(default=None, max_length=500)


class RegistrationActionResponse(BaseModel):
    message: str
    volunteer_id: int
    volunteer_code: str
    volunteer_name: str
    status: str


from datetime import date


class AlertRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    alert_code: str
    volunteer_id: int
    volunteer_name: str | None = None
    volunteer_code: str | None = None
    village_name: str | None = None
    block_name: str | None = None
    district_name: str | None = None
    alert_date: date | None = None
    created_at: datetime | None = None
    description: str | None = None
    action_taken: str | None = None
    current_stage: str | None = None
    closure_status: str | None = None


class AlertActionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    action: Literal["escalate", "resolve", "close"]
    remarks: str | None = Field(default=None, max_length=500)


class AlertActionResponse(BaseModel):
    message: str
    alert_id: int
    alert_code: str
    closure_status: str


class VerificationRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: int
    record_code: str
    record_type: str
    type_label: str
    volunteer_id: int
    volunteer_name: str | None = None
    volunteer_code: str | None = None
    village_name: str | None = None
    record_date: date | None = None
    captured_at: datetime | None = None
    created_at: datetime | None = None
    verification_status: str
    summary: str | None = None


class VerificationActionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    action: str = Field(min_length=1, max_length=50)
    remarks: str | None = Field(default=None, max_length=500)


class VerificationActionResponse(BaseModel):
    message: str
    record_id: int
    record_code: str
    record_type: str
    verification_status: str
