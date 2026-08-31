"""Add privacy-safe telemetry event storage.

Revision ID: 9c4f1d7a8e20
Revises: f1a7c3d9b402
"""
from alembic import op
import sqlalchemy as sa

revision = "9c4f1d7a8e20"
down_revision = "f1a7c3d9b402"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "telemetry_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("actor_hash", sa.String(length=64), nullable=True),
        sa.Column("room_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
    )
    op.create_index("ix_telemetry_events_event_type", "telemetry_events", ["event_type"])
    op.create_index("ix_telemetry_events_actor_hash", "telemetry_events", ["actor_hash"])
    op.create_index("ix_telemetry_events_room_id", "telemetry_events", ["room_id"])
    op.create_index("ix_telemetry_events_created_at", "telemetry_events", ["created_at"])


def downgrade():
    op.drop_index("ix_telemetry_events_created_at", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_room_id", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_actor_hash", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_event_type", table_name="telemetry_events")
    op.drop_table("telemetry_events")
