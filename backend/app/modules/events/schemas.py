from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Volunteer COHV type -> surveillance sector. The form locks Primary sector to
# this, so the sector is never taken from the request.
SECTOR_OF_COHV_TYPE = {
    "Public Health Department": "human",
    "Animal Department": "animal",
    "Wildlife Department": "wildlife",
    "Environment Department": "environment",
}

BACK_ENTRY_DAYS = 14
MAX_WORDS = 250


def _word_count(value: str | None) -> int:
    text = (value or "").strip()
    return len(text.split()) if text else 0


class EventReportForm(BaseModel):
    """The Event Reporting form, posted as multipart/form-data. Primary sector
    is not here - it is fixed to the volunteer's registered COHV type."""

    model_config = ConfigDict(str_strip_whitespace=True)

    event_type_id: int = Field(gt=0, le=32767, description="Event dropdown.")
    event_type_other: str | None = Field(default=None, max_length=200)

    date: date
    time: time
    village_lgd_code: int = Field(gt=0)
    is_out_of_area: bool = False
    purpose_of_visit: str = Field(min_length=1, max_length=300)
    location_type: Literal["Urban", "Rural"]
    total_visits: int = Field(ge=0)

    population_type_id: int = Field(gt=0, le=32767)
    population_other: str | None = Field(default=None, max_length=200)

    observations: str | None = None
    action_taken: str | None = None
    description: str | None = Field(default=None, max_length=500, description="Description / caption.")

    referral_generated: bool = False
    alert_generated: bool = False
    follow_up_required: bool = False

    latitude: Decimal | None = Field(default=None, ge=-90, le=90, decimal_places=6)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180, decimal_places=6)
    gps_accuracy_m: int | None = Field(default=None, ge=0)
    gps_unavailable_reason: str | None = Field(default=None, max_length=200)

    device_id: str | None = Field(default=None, max_length=50)
    # Offline idempotency: the id the device gave this record. Re-sending it
    # returns the record already stored instead of a duplicate.
    client_ref: str | None = Field(default=None, max_length=64)

    photos: list[UploadFile] = Field(default_factory=list)
    videos: list[UploadFile] = Field(default_factory=list)
    documents: list[UploadFile] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        # A form posts an untouched optional field as "". Drop empties so the
        # model defaults apply instead of failing type coercion.
        if isinstance(values, dict):
            return {k: v for k, v in values.items() if v != ""}
        return values

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: date) -> date:
        today = date.today()
        if value > today:
            raise ValueError("Date cannot be in the future.")
        if (today - value).days > BACK_ENTRY_DAYS:
            raise ValueError(
                f"Date cannot be more than {BACK_ENTRY_DAYS // 7} weeks ago. "
                "Report older events to your supervisor directly."
            )
        return value

    @field_validator("observations", "action_taken")
    @classmethod
    def validate_word_cap(cls, value: str | None) -> str | None:
        if _word_count(value) > MAX_WORDS:
            raise ValueError(f"Must be {MAX_WORDS} words or fewer.")
        return value

    @model_validator(mode="after")
    def validate_gps_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Send both latitude and longitude, or neither.")
        return self


# ---- responses ------------------------------------------------------------

class OptionItem(BaseModel):
    id: int
    name: str
    is_other: bool = False


class VillageOption(BaseModel):
    village_lgd_code: int
    village_name: str
    gram_panchayat_name: str
    block_name: str


class SectorInfo(BaseModel):
    sector_code: str
    sector_name: str


class PopulationInfo(BaseModel):
    label: str
    options: list[OptionItem]


class EventFormMetadata(BaseModel):
    primary_sector: SectorInfo
    event_types: list[OptionItem]
    population: PopulationInfo
    location_types: list[str]
    villages: list[VillageOption]
    upload_limits: dict
    min_date: date
    max_date: date


class EventReportResponse(BaseModel):
    message: str
    event_report_id: int
    event_report_code: str
    verification_status: str
    alert_code: str | None = None
    attachments: int = 0
    duplicate: bool = False


class EventAttachmentResponse(BaseModel):
    attachment_id: int
    file_kind: str
    file_name: str
    storage_path: str
    mime_type: str | None = None
    size_bytes: int
    caption: str | None = None


class EventReportListItem(BaseModel):
    event_report_id: int
    event_report_code: str
    volunteer_id: int
    client_ref: str | None = None
    device_id: str | None = None
    event_type_id: int
    event_type_other: str | None = None
    sector_code: str
    event_date: date
    event_time: time
    village_lgd_code: int
    is_out_of_area: bool
    purpose_of_visit: str
    location_type: str
    total_visits: int
    population_type_id: int
    population_other: str | None = None
    description: str | None = None
    observations: str | None = None
    action_taken: str | None = None
    referral_generated: bool
    alert_generated: bool
    follow_up_required: bool
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    gps_accuracy_m: int | None = None
    gps_unavailable_reason: str | None = None
    captured_at: datetime
    verification_status: str
    created_at: datetime
    attachments: list[EventAttachmentResponse] = Field(default_factory=list)


class EventListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, max_length=100)
    state_lgd_code: int | None = Field(default=None, gt=0)
    district_lgd_code: int | None = Field(default=None, gt=0)
    village_lgd_code: int | None = Field(default=None, gt=0)
    volunteer_id: int | None = Field(default=None, gt=0)
    verification_status: Literal[
        "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RETURNED", "ESCALATED", "CLOSED"
    ] | None = None
    from_date: date | None = None
    to_date: date | None = None
    sort_by: Literal["event_date", "created_at"] = "event_date"
    sort_order: Literal["asc", "desc"] = "desc"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date cannot be greater than to_date.")
        if self.search is not None:
            self.search = self.search.strip() or None
        return self


class EventListPagination(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int


class EventListResponse(BaseModel):
    success: bool = True
    message: str = "Records fetched successfully"
    data: dict
