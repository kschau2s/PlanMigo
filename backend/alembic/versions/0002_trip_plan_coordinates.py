"""trip_plans.lat/lon for the map panel

Fresh databases get the columns via 0001's create_all (current models); databases
already stamped 0001 before this change get them added here — guarded so both
paths stay idempotent.

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("trip_plans")}
    if "lat" not in columns:
        op.add_column("trip_plans", sa.Column("lat", sa.Float(), nullable=True))
    if "lon" not in columns:
        op.add_column("trip_plans", sa.Column("lon", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("trip_plans", "lon")
    op.drop_column("trip_plans", "lat")
