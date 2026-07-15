"""Initial schema + users.password_hash

Baseline migration for databases in any of the states that exist in the wild:
- fresh database  -> create_all builds the full current schema (incl. password_hash)
- database bootstrapped by the old create_all startup path -> tables exist but
  users.password_hash is missing; it is added here.

Revision ID: 0001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    import app.models  # noqa: F401  # register all models on Base.metadata
    from app.models.session import Base

    Base.metadata.create_all(bind=bind, checkfirst=True)

    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "password_hash" not in columns:
        op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
