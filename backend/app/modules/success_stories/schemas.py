from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


VerificationStatus = Literal[
    "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RETURNED", "ESCALATED", "CLOSED"
]


class SuccessStoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    volunteer_id: int = Field(gt=0)
    client_ref: str | None = Field(default=None, min_length=1, max_length=64)
    device_id: str | None = Field(default=None, min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=250)
    story_date: date
    location_text: str | None = Field(default=None, max_length=250)
    one_health_issue: str = Field(min_length=1, max_length=250)
    situation: str = Field(min_length=1)
    action_taken: str = Field(min_length=1)
    department_id: int | None = Field(default=None, gt=0, le=32767)
    department_other: str | None = Field(default=None, max_length=200)
    outcome: str = Field(min_length=1)
    community_benefit: str | None = None
    lessons_learned: str | None = None
    is_innovation: bool = False
    latitude: Decimal | None = Field(default=None, ge=-90, le=90, decimal_places=6)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, decimal_places=6)
    gps_accuracy_m: int | None = Field(default=None, ge=0)
    gps_unavailable_reason: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_story(self):
        if self.story_date > date.today():
            raise ValueError("story_date cannot be in the future.")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together.")
        if self.latitude is None:
            if not self.gps_unavailable_reason:
                raise ValueError(
                    "gps_unavailable_reason is required without coordinates."
                )
            if self.gps_accuracy_m is not None:
                raise ValueError("gps_accuracy_m requires coordinates.")
        elif self.gps_unavailable_reason:
            raise ValueError("gps_unavailable_reason is not allowed with coordinates.")
        return self


class DepartmentResponse(BaseModel):
    department_id: int
    department_name: str


class SuccessStoryItem(BaseModel):
    story_id: int
    story_code: str
    volunteer_id: int
    volunteer_name: str
    title: str
    story_date: date
    location_text: str | None
    one_health_issue: str
    situation: str
    action_taken: str
    department_id: int | None
    department_name: str | None
    department_other: str | None
    outcome: str
    community_benefit: str | None
    lessons_learned: str | None
    is_innovation: bool
    latitude: Decimal | None
    longitude: Decimal | None
    gps_accuracy_m: int | None
    gps_unavailable_reason: str | None
    verification_status: str
    captured_at: datetime
    created_at: datetime
    updated_at: datetime


class SuccessStoryResponse(BaseModel):
    message: str
    data: SuccessStoryItem


class SuccessStoryListQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, max_length=100)
    department_id: int | None = Field(default=None, gt=0, le=32767)
    verification_status: VerificationStatus | None = None
    from_date: date | None = None
    to_date: date | None = None
    sort_by: Literal["story_date", "created_at", "updated_at"] = "story_date"
    sort_order: Literal["asc", "desc"] = "desc"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date cannot be greater than to_date.")
        self.search = self.search or None
        return self


class SuccessStoryListPagination(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int


class SuccessStoryListData(BaseModel):
    items: list[SuccessStoryItem]
    pagination: SuccessStoryListPagination


class SuccessStoryListResponse(BaseModel):
    success: bool = True
    message: str = "Records fetched successfully"
    data: SuccessStoryListData


class SuccessStoryAllResponse(BaseModel):
    success: bool = True
    message: str = "All records fetched successfully"
    data: list[SuccessStoryItem]


class SuccessStorySingleResponse(BaseModel):
    success: bool = True
    message: str = "Success story record fetched successfully"
    data: SuccessStoryItem
