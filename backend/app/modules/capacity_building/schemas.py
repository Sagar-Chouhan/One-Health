from datetime import date, datetime
from typing import Any, Literal
from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.events.attachments import AttachmentResponse

MAX_WORDS = 250

VerificationStatus = Literal[
    "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "RETURNED", "ESCALATED", "CLOSED"
]


def _word_count(value: str | None) -> int:
    return len(value.split()) if value else 0


# ============================================================================
# Training Master Schemas
# ============================================================================

class TrainingMasterItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    training_id: int
    training_name: str
    is_other: bool
    sort_order: int


# ============================================================================
# Training Imparted Schemas
# ============================================================================

class TrainingImpartedCreate(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    volunteer_id: int | None = Field(
        default=None,
        description="Volunteer ID (overridden by authenticated volunteer)",
    )
    client_ref: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="Client reference for offline idempotency",
    )
    device_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="ID of device that captured the record",
    )
    training_id: int = Field(
        ...,
        gt=0,
        le=32767,
        description="ID of training type from training_master",
    )
    training_date: date = Field(
        ...,
        description="Date the training was imparted/conducted",
    )
    organised_by: str | None = Field(
        default=None,
        max_length=200,
        description="Organising authority or institution",
    )
    duration: str | None = Field(
        default=None,
        max_length=50,
        description="Duration (e.g. '2 hours', 'Full day', '3 days')",
    )
    remarks: str | None = Field(
        default=None,
        description="Remarks or notes (max 250 words)",
    )
    captured_at: datetime | None = Field(
        default=None,
        description="Offline capture timestamp, defaults to now",
    )
    photos: list[Any] = Field(default_factory=list)
    videos: list[Any] = Field(default_factory=list)
    documents: list[Any] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        if isinstance(values, dict):
            return {k: v for k, v in values.items() if v != ""}
        return values

    @model_validator(mode="after")
    def validate_imparted(self):
        if self.training_date > date.today():
            raise ValueError("training_date cannot be in the future.")
        if self.remarks and _word_count(self.remarks) > MAX_WORDS:
            raise ValueError(f"remarks must be {MAX_WORDS} words or fewer.")
        return self


class TrainingImpartedItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    training_imparted_id: int
    training_imparted_code: str
    volunteer_id: int
    volunteer_name: str
    client_ref: str | None
    device_id: str | None
    training_id: int
    training_name: str
    training_date: date
    organised_by: str | None
    duration: str | None
    remarks: str | None
    captured_at: datetime
    verification_status: str
    created_at: datetime
    updated_at: datetime
    photos: list[AttachmentResponse] = Field(default_factory=list)
    videos: list[AttachmentResponse] = Field(default_factory=list)
    documents: list[AttachmentResponse] = Field(default_factory=list)
    attachments: list[AttachmentResponse] = Field(default_factory=list)


class TrainingImpartedListData(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[TrainingImpartedItem]


class TrainingImpartedListResponse(BaseModel):
    success: bool = True
    message: str = "Training imparted records fetched successfully"
    data: TrainingImpartedListData


class TrainingImpartedSingleResponse(BaseModel):
    success: bool = True
    message: str = "Training imparted record fetched successfully"
    data: TrainingImpartedItem


class TrainingImpartedCreateResponse(BaseModel):
    success: bool = True
    message: str = "Training imparted record created successfully"
    data: TrainingImpartedItem


# ============================================================================
# Training Attended Schemas
# ============================================================================

class TrainingAttendedCreate(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    volunteer_id: int | None = Field(
        default=None,
        description="Volunteer ID (overridden by authenticated volunteer)",
    )
    client_ref: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="Client reference for offline idempotency",
    )
    device_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="ID of device that captured the record",
    )
    training_id: int = Field(
        ...,
        gt=0,
        le=32767,
        description="ID of training type from training_master",
    )
    training_date: date = Field(
        ...,
        description="Date the training was attended",
    )
    venue: str | None = Field(
        default=None,
        max_length=200,
        description="Venue where training took place",
    )
    chaired_by: str | None = Field(
        default=None,
        max_length=150,
        description="Person or authority who chaired the training",
    )
    key_points: str | None = Field(
        default=None,
        description="Key points covered during training (max 250 words)",
    )
    certificate_issued: bool = Field(
        default=False,
        description="Whether a training certificate was issued",
    )
    captured_at: datetime | None = Field(
        default=None,
        description="Offline capture timestamp, defaults to now",
    )
    photos: list[Any] = Field(default_factory=list)
    videos: list[Any] = Field(default_factory=list)
    documents: list[Any] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        if isinstance(values, dict):
            return {k: v for k, v in values.items() if v != ""}
        return values

    @model_validator(mode="after")
    def validate_attended(self):
        if self.training_date > date.today():
            raise ValueError("training_date cannot be in the future.")
        if self.key_points and _word_count(self.key_points) > MAX_WORDS:
            raise ValueError(f"key_points must be {MAX_WORDS} words or fewer.")
        return self


class TrainingAttendedItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    training_attended_id: int
    training_attended_code: str
    volunteer_id: int
    volunteer_name: str
    client_ref: str | None
    device_id: str | None
    training_id: int
    training_name: str
    training_date: date
    venue: str | None
    chaired_by: str | None
    key_points: str | None
    certificate_issued: bool
    captured_at: datetime
    verification_status: str
    created_at: datetime
    updated_at: datetime
    photos: list[AttachmentResponse] = Field(default_factory=list)
    videos: list[AttachmentResponse] = Field(default_factory=list)
    documents: list[AttachmentResponse] = Field(default_factory=list)
    attachments: list[AttachmentResponse] = Field(default_factory=list)


class TrainingAttendedListData(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[TrainingAttendedItem]


class TrainingAttendedListResponse(BaseModel):
    success: bool = True
    message: str = "Training attended records fetched successfully"
    data: TrainingAttendedListData


class TrainingAttendedSingleResponse(BaseModel):
    success: bool = True
    message: str = "Training attended record fetched successfully"
    data: TrainingAttendedItem


class TrainingAttendedCreateResponse(BaseModel):
    success: bool = True
    message: str = "Training attended record created successfully"
    data: TrainingAttendedItem
