from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Integer,
    Numeric,
    SmallInteger,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class VolunteerRegistration(Base):
    """Maps public.volunteer_registration (database/01_schema.sql).

    The table is created by the SQL script, not by SQLAlchemy, so constraints
    (composite LGD foreign keys, CHECKs) live there. Columns with a server
    default are left to the database: volunteer_code comes from
    next_record_code('COHV').
    """

    __tablename__ = "volunteer_registration"
    __table_args__ = {"schema": "public"}

    volunteer_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    volunteer_code: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text("next_record_code('COHV')"),
    )

    # Registration form fields.
    volunteer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    mobile_no: Mapped[str] = mapped_column(String(10), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    

    # 'Public Health' | 'Animal' | 'Wildlife' | 'Environment' - stored as the label.
    department_name: Mapped[str] = mapped_column(String(150),nullable=False)
    department_id: Mapped[int | None] = mapped_column(SmallInteger)
    institution_type_id: Mapped[int | None] = mapped_column(SmallInteger)
    other_institution_name: Mapped[str | None] = mapped_column(String(200))
    institution_name: Mapped[str | None] = mapped_column(String(200))

    state_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)
    district_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)
    block_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)
    gram_panchayat_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)
    village_lgd_code: Mapped[int] = mapped_column(Integer, nullable=False)

    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    education_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    profession_id: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    supervisor_id: Mapped[int | None] = mapped_column(Integer)

    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_path: Mapped[str | None] = mapped_column(String(500))

    reg_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    reg_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    reg_gps_accuracy_m: Mapped[int | None] = mapped_column(Integer)
    reg_gps_unavailable_reason: Mapped[str | None] = mapped_column(String(200))
    device_id: Mapped[str | None] = mapped_column(String(50))

    # Set by the system, not the form.
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'PENDING'"),
    )
    approved_by: Mapped[int | None] = mapped_column(Integer)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status_remarks: Mapped[str | None] = mapped_column(String(500))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
