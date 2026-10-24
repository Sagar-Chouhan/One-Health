from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Referral(Base):
    __tablename__ = "referral"

    referral_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    referral_code: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("next_record_code('REF'::text)"),
    )

    volunteer_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    client_ref: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    device_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    referral_stream: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    referral_facility_id: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
    )

    event_report_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    village_lgd_code: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    event_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    referral_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_followed_up: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    followed_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    latitude: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    longitude: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    gps_accuracy_m: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    gps_unavailable_reason: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    verification_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("'SUBMITTED'"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReferralFacilityMaster(Base):
    __tablename__ = "referral_facility_master"

    referral_facility_id: Mapped[int] = mapped_column(
        SmallInteger,
        primary_key=True,
    )

    referral_stream: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    referral_facility_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    is_other: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    sort_order: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        server_default=text("0"),
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )