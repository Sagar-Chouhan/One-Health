from logging.config import fileConfig
from app.database.base import Base
from app.database.session import DATABASE_URL
from app.modules.volunteers.models import VolunteerRegistration  # noqa: F401 - registers the table

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# Connection comes from .env, not the placeholder in alembic.ini.
config.set_main_option(
    "sqlalchemy.url",
    DATABASE_URL.render_as_string(hide_password=False).replace("%", "%%"),
)


def include_object(object, name, type_, reflected, compare_to):
    # The schema is created by database/01_schema.sql, and models only map
    # columns - they don't redeclare its indexes, unique keys or composite LGD
    # foreign keys. Anything that exists in the database but not in a model
    # (tables, columns, indexes, constraints) is left alone; otherwise
    # autogenerate would propose dropping it.
    if reflected and compare_to is None:
        return False
    return True


def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    # Columns typed with a domain from 01_schema.sql (cohv_type_label) map to
    # plain String in the models; the domain only adds a CHECK. Not a change.
    if type(inspected_type).__name__ == "DOMAIN":
        return False
    return None   # default comparison for everything else

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        include_object=include_object,
        compare_type=compare_type,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=compare_type,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
