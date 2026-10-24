from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict, Field, model_validator


VerificationStatus = Literal[
    "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RETURNED", "ESCALATED", "CLOSED"
]


class AwarenessActivityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    client_ref: str | None = Field(default=None, min_length=1, max_length=64)
    device_id: str | None = Field(default=None, min_length=1, max_length=50)
    awareness_activity_id: int = Field(gt=0, le=32767)
    activity_date: date
    village_lgd_code: int = Field(gt=0)
    people_reached: int | None = Field(default=None, ge=0)
    awareness_topic_id: int | None = Field(default=None, gt=0, le=32767)
    topic_other: str | None = Field(default=None, max_length=200)
    department_id: int | None = Field(default=None, gt=0, le=32767)
    department_other: str | None = Field(default=None, max_length=200)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90, decimal_places=6)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, decimal_places=6)
    gps_accuracy_m: int | None = Field(default=None, ge=0)
    gps_unavailable_reason: str | None = Field(default=None, max_length=200)
    photos: list[UploadFile] = Field(default_factory=list)
    documents: list[UploadFile] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_form(self):
        if self.activity_date > date.today():
            raise ValueError("activity_date cannot be in the future.")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together.")
        if self.latitude is None and not self.gps_unavailable_reason:
            raise ValueError("gps_unavailable_reason is required without coordinates.")
        if self.latitude is not None and self.gps_unavailable_reason:
            raise ValueError("gps_unavailable_reason is not allowed with coordinates.")
        if self.awareness_topic_id is None and not self.topic_other:
            raise ValueError("awareness_topic_id or topic_other is required.")
        return self


class AwarenessAttachment(BaseModel):
    attachment_id: int
    file_kind: str
    file_name: str
    storage_path: str
    mime_type: str | None = None
    size_bytes: int
    caption: str | None = None


class AwarenessActivityItem(BaseModel):
    awareness_id: int
    awareness_code: str
    volunteer_id: int
    volunteer_name: str
    awareness_activity_id: int
    awareness_activity_name: str
    activity_date: date
    village_lgd_code: int
    village_name: str
    people_reached: int | None
    awareness_topic_id: int | None
    awareness_topic_name: str | None
    topic_other: str | None
    department_id: int | None
    department_name: str | None
    department_other: str | None
    verification_status: str
    captured_at: datetime
    created_at: datetime
    attachments: list[AwarenessAttachment] = Field(default_factory=list)


class AwarenessActivityResponse(BaseModel):
    message: str
    awareness_id: int
    awareness_code: str
    verification_status: str
    duplicate: bool = False


class AwarenessListQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, max_length=100)
    awareness_activity_id: int | None = Field(default=None, gt=0)
    village_lgd_code: int | None = Field(default=None, gt=0)
    department_id: int | None = Field(default=None, gt=0)
    verification_status: VerificationStatus | None = None
    from_date: date | None = None
    to_date: date | None = None
    sort_by: Literal["activity_date", "created_at"] = "activity_date"
    sort_order: Literal["asc", "desc"] = "desc"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date cannot be greater than to_date.")
        self.search = self.search or None
        return self


class AwarenessListPagination(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int


class AwarenessListData(BaseModel):
    items: list[AwarenessActivityItem]
    pagination: AwarenessListPagination


class AwarenessListResponse(BaseModel):
    success: bool = True
    message: str = "Records fetched successfully"
    data: AwarenessListData


class AwarenessAllResponse(BaseModel):
    success: bool = True
    message: str = "All records fetched successfully"
    data: list[AwarenessActivityItem]


class AwarenessSingleResponse(BaseModel):
    success: bool = True
    message: str = "Awareness activity fetched successfully"
    data: AwarenessActivityItem
