from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)
from fastapi import UploadFile


ReferralStream = Literal["HUMAN", "ANIMAL"]


class ReferralCreate(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
    )

    volunteer_id: int | None = Field(default=None, gt=0)

    client_ref: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
    )

    device_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    referral_stream: ReferralStream

    referral_facility_id: int = Field(
        gt=0,
        le=32767,
    )

    event_report_id: int | None = Field(
        default=None,
        gt=0,
    )

    village_lgd_code: int = Field(gt=0)

    event_date: date
    referral_date: date

    reason: str | None = Field(
        default=None,
        max_length=5000,
    )

    is_followed_up: bool = False
    followed_up_at: datetime | None = None

    latitude: Decimal | None = Field(
        default=None,
        ge=Decimal("-90"),
        le=Decimal("90"),
    )

    longitude: Decimal | None = Field(
        default=None,
        ge=Decimal("-180"),
        le=Decimal("180"),
    )

    gps_accuracy_m: int | None = Field(
        default=None,
        ge=0,
        le=100000,
    )

    gps_unavailable_reason: str | None = Field(
        default=None,
        max_length=200,
    )

    captured_at: datetime | None = None
    photos: list[Any] = Field(default_factory=list)
    videos: list[Any] = Field(default_factory=list)
    documents: list[Any] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def blank_means_missing(cls, values):
        if isinstance(values, dict):
            return {k: v for k, v in values.items() if v != ""}
        return values

    @field_validator("is_followed_up", mode="before")
    @classmethod
    def parse_bool_followed_up(cls, value):
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes", "t")
        return bool(value) if value is not None else False

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Reason cannot be blank")

        return value

    @field_validator(
        "client_ref",
        "device_id",
        "gps_unavailable_reason",
    )
    @classmethod
    def validate_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @model_validator(mode="after")
    def validate_referral(self):
        # Referral date should not be before the event date.
        if self.referral_date < self.event_date:
            raise ValueError(
                "Referral date cannot be before event date"
            )

        # Latitude and longitude must be supplied together.
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "Latitude and longitude must be provided together"
            )

        coordinates_missing = (
            self.latitude is None
            and self.longitude is None
        )

        # If GPS coordinates are unavailable, reason is mandatory.
        if coordinates_missing and not self.gps_unavailable_reason:
            raise ValueError(
                "GPS unavailable reason is required "
                "when coordinates are missing"
            )

        # If GPS coordinates exist, unavailable reason should be absent.
        if (
            not coordinates_missing
            and self.gps_unavailable_reason
        ):
            raise ValueError(
                "GPS unavailable reason must be empty "
                "when coordinates are provided"
            )

        # captured_at must contain timezone information.
        if (
            self.captured_at is not None
            and self.captured_at.tzinfo is None
        ):
            raise ValueError(
                "captured_at must include timezone information"
            )

        # GPS accuracy is not meaningful without coordinates.
        if (
            coordinates_missing
            and self.gps_accuracy_m is not None
        ):
            raise ValueError(
                "GPS accuracy cannot be provided "
                "when GPS coordinates are missing"
            )

        return self


class ReferralFacilityResponse(BaseModel):
    referral_facility_id: int
    referral_stream: ReferralStream
    referral_facility_name: str
    is_other: bool

    model_config = ConfigDict(from_attributes=True)


class ReferralResponse(BaseModel):
    referral_id: int
    referral_code: str
    volunteer_id: int
    referral_stream: ReferralStream
    referral_facility_id: int
    village_lgd_code: int
    event_date: date
    referral_date: date
    is_followed_up: bool
    verification_status: str
    created_at: datetime
    photos: list["ReferralAttachment"] = Field(default_factory=list)
    videos: list["ReferralAttachment"] = Field(default_factory=list)
    documents: list["ReferralAttachment"] = Field(default_factory=list)
    attachments: list["ReferralAttachment"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ReferralAttachment(BaseModel):
    attachment_id: int
    file_kind: str
    file_name: str
    storage_path: str | None = None
    mime_type: str | None = None
    size_bytes: int
    caption: str | None = None
    url: str | None = None
    file_url: str | None = None


class ReferralListItem(BaseModel):
    referral_id: int
    referral_code: str
    volunteer_id: int
    volunteer_name: str
    referral_stream: ReferralStream
    referral_facility_id: int
    referral_facility_name: str
    village_lgd_code: int
    village_name: str
    state_lgd_code: int
    district_lgd_code: int
    block_lgd_code: int
    event_date: date
    referral_date: date
    is_followed_up: bool
    verification_status: str
    created_at: datetime
    photos: list[ReferralAttachment] = Field(default_factory=list)
    videos: list[ReferralAttachment] = Field(default_factory=list)
    documents: list[ReferralAttachment] = Field(default_factory=list)
    attachments: list[ReferralAttachment] = Field(default_factory=list)


class ReferralListData(BaseModel):
    items: list[ReferralListItem]
    pagination: dict


class ReferralListResponse(BaseModel):
    success: bool = True
    message: str = "Records fetched successfully"
    data: ReferralListData


class ReferralAllResponse(BaseModel):
    success: bool = True
    message: str = "All records fetched successfully"
    data: list[ReferralListItem]


class ReferralDetail(BaseModel):
    referral_id: int
    referral_code: str
    volunteer_id: int
    volunteer_name: str | None = None
    volunteer_code: str | None = None
    client_ref: str | None = None
    device_id: str | None = None
    referral_stream: ReferralStream
    referral_facility_id: int
    referral_facility_name: str | None = None
    facility_is_other: bool | None = None
    event_report_id: int | None = None
    village_lgd_code: int
    village_name: str | None = None
    gram_panchayat_name: str | None = None
    block_name: str | None = None
    district_name: str | None = None
    state_name: str | None = None
    state_lgd_code: int | None = None
    district_lgd_code: int | None = None
    block_lgd_code: int | None = None
    event_date: date
    referral_date: date
    reason: str | None = None
    is_followed_up: bool
    followed_up_at: datetime | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    gps_accuracy_m: int | None = None
    gps_unavailable_reason: str | None = None
    captured_at: datetime | None = None
    verification_status: str
    created_at: datetime
    updated_at: datetime | None = None
    photos: list[ReferralAttachment] = Field(default_factory=list)
    videos: list[ReferralAttachment] = Field(default_factory=list)
    documents: list[ReferralAttachment] = Field(default_factory=list)
    attachments: list[ReferralAttachment] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ReferralSingleResponse(BaseModel):
    success: bool = True
    message: str = "Referral record fetched successfully"
    data: ReferralDetail