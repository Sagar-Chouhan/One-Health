from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Status = Literal[
    "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RETURNED", "ESCALATED", "CLOSED"
]


class SampleTypeResponse(BaseModel):
    sample_type_id: int
    sample_type_name: str
    applicable_sectors: list[str]
    is_other: bool


class SampleSupportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    volunteer_id: int = Field(gt=0)
    client_ref: str | None = Field(default=None, min_length=1, max_length=64)
    device_id: str | None = Field(default=None, min_length=1, max_length=50)
    sample_type_id: int = Field(gt=0, le=32767)
    sample_date: date
    sample_count: int = Field(gt=0)
    village_lgd_code: int = Field(gt=0)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90, decimal_places=6)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, decimal_places=6)
    gps_accuracy_m: int | None = Field(default=None, ge=0)
    gps_unavailable_reason: str | None = Field(default=None, max_length=200)
    captured_at: datetime | None = None

    @model_validator(mode="after")
    def validate_gps_and_date(self):
        if self.sample_date > date.today():
            raise ValueError("sample_date cannot be in the future.")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together.")
        if self.latitude is None and not self.gps_unavailable_reason:
            raise ValueError("gps_unavailable_reason is required without coordinates.")
        if self.latitude is not None and self.gps_unavailable_reason:
            raise ValueError("gps_unavailable_reason is not allowed with coordinates.")
        if self.latitude is None and self.gps_accuracy_m is not None:
            raise ValueError("gps_accuracy_m requires coordinates.")
        return self


class SampleSupportItem(BaseModel):
    sample_id: int
    sample_code: str
    volunteer_id: int
    volunteer_name: str
    cohv_type: str
    sample_type_id: int
    sample_type_name: str
    sample_date: date
    sample_count: int
    village_lgd_code: int
    village_name: str
    verification_status: str
    captured_at: datetime
    created_at: datetime


class SampleSupportResponse(BaseModel):
    message: str
    data: SampleSupportItem


class SampleSupportListQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, max_length=100)
    sample_type_id: int | None = Field(default=None, gt=0)
    volunteer_id: int | None = Field(default=None, gt=0)
    village_lgd_code: int | None = Field(default=None, gt=0)
    verification_status: Status | None = None
    from_date: date | None = None
    to_date: date | None = None
    sort_by: Literal["sample_date", "created_at"] = "sample_date"
    sort_order: Literal["asc", "desc"] = "desc"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date cannot be greater than to_date.")
        self.search = self.search or None
        return self


class SampleSupportListResponse(BaseModel):
    success: bool = True
    message: str = "Records fetched successfully"
    data: dict

