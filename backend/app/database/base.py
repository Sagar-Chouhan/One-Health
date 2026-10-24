from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Common SQLAlchemy base for application-owned models.

    Existing PostgreSQL tables are not modified automatically.
    Schema changes will be managed through Alembic migrations.
    """

    pass
