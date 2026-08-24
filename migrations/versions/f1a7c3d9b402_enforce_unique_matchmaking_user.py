"""Enforce one matchmaking queue entry per user.

Revision ID: f1a7c3d9b402
Revises: 72cba26399f5
"""
from alembic import op


revision = 'f1a7c3d9b402'
down_revision = '72cba26399f5'
branch_labels = None
depends_on = None


def upgrade():
    # Older builds did not enforce one queue row per user. Keep a matched
    # row when duplicates exist, otherwise retain the newest row, then add
    # the uniqueness constraint.
    op.execute(
        """
        DELETE FROM matchmaking_queue AS q
        WHERE EXISTS (
            SELECT 1
            FROM matchmaking_queue AS newer
            WHERE newer.user_id = q.user_id
              AND (
                    (newer.status = 'matched' AND q.status <> 'matched')
                    OR (
                        newer.status = q.status
                        AND newer.id > q.id
                    )
              )
        )
        """
    )
    with op.batch_alter_table('matchmaking_queue', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_matchmaking_queue_user', ['user_id'])


def downgrade():
    with op.batch_alter_table('matchmaking_queue', schema=None) as batch_op:
        batch_op.drop_constraint('uq_matchmaking_queue_user', type_='unique')
