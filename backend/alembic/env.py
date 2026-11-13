import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# Ensure backend root is in Python sys.path so app modules import properly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import application configuration and models
from app.core.config import settings
from app.database.connection import Base, get_normalized_database_url
import app.models  # Ensures all models (User, Ticket, Comment, Team, TicketHistory) are loaded

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for 'autogenerate' support
target_metadata = Base.metadata

# Retrieve and normalize database URL
db_url = get_normalized_database_url()

# Escape '%' as '%%' for ConfigParser to prevent interpolation syntax error
if db_url and not db_url.startswith("http"):
    config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = db_url or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    if not db_url or db_url.startswith("http"):
        print("\n[ERROR] DATABASE_URL is not set to a valid PostgreSQL connection string in backend/.env!")
        print("Please configure your Supabase PostgreSQL connection string before running migrations.\n")
        return

    connect_args = {}
    if "sslmode" not in db_url:
        connect_args["sslmode"] = "require"

    # Create engine directly from the normalized db_url
    connectable = create_engine(
        db_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
