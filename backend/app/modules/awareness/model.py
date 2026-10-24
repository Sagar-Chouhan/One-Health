from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, SmallInteger, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AwarenessActivity(Base):
    __tablename__ = "awareness_activity"
    __table_args__ = {"schema": "public"}

    awareness_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    awareness_code: Mapped[str] = mapped_column(String(30), nullable=False)
    volunteer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    client_ref: Mapped[str | None] = mapped_column(String(64))
    device_id: Mapped[str | None] = mapped_column(String(50))
    awareness_activity_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    village_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)
    people_reached: Mapped[int | None] = mapped_column(Integer)
    awareness_topic_id: Mapped[int | None] = mapped_column(SmallInteger)
    topic_other: Mapped[str | None] = mapped_column(String(200))
    department_id: Mapped[int | None] = mapped_column(SmallInteger)
    department_other: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    gps_accuracy_m: Mapped[int | None] = mapped_column(Integer)
    gps_unavailable_reason: Mapped[str | None] = mapped_column(String(200))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'SUBMITTED'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

