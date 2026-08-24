"""Add account, profile, social graph and match history.

Revision ID: a8f31c2d7e90
Revises: f1a7c3d9b402
"""
from alembic import op
import sqlalchemy as sa

revision = 'a8f31c2d7e90'
down_revision = 'f1a7c3d9b402'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_seen', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('username', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('email', sa.String(length=254), nullable=True))
        batch_op.add_column(sa.Column('password_hash', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('google_sub', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('bio', sa.String(length=280), nullable=True))
        batch_op.add_column(sa.Column('avatar_key', sa.String(length=32), nullable=False, server_default='knight'))
        batch_op.add_column(sa.Column('avatar_url', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('achievements', sa.JSON(), nullable=True))
        batch_op.create_unique_constraint('uq_users_username', ['username'])
        batch_op.create_unique_constraint('uq_users_email', ['email'])
        batch_op.create_unique_constraint('uq_users_google_sub', ['google_sub'])

    op.create_table(
        'friendships',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('requester_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('addressee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('requester_id', 'addressee_id', name='uq_friendship_direction'),
    )
    op.create_index('ix_friendships_requester_id', 'friendships', ['requester_id'])
    op.create_index('ix_friendships_addressee_id', 'friendships', ['addressee_id'])
    op.create_index('ix_friendships_status', 'friendships', ['status'])

    op.create_table(
        'challenges',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('challenger_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('challenged_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('mode', sa.String(length=10), nullable=False, server_default='casual'),
        sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_challenges_challenger_id', 'challenges', ['challenger_id'])
    op.create_index('ix_challenges_challenged_id', 'challenges', ['challenged_id'])
    op.create_index('ix_challenges_status', 'challenges', ['status'])
    op.create_index('ix_challenges_room_id', 'challenges', ['room_id'])

    op.create_table(
        'match_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('opponent_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id'), nullable=False),
        sa.Column('result', sa.String(length=10), nullable=False),
        sa.Column('reason', sa.String(length=30), nullable=False, server_default='king_destroyed'),
        sa.Column('mmr_before', sa.Integer(), nullable=False),
        sa.Column('mmr_after', sa.Integer(), nullable=False),
        sa.Column('xp_gained', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'room_id', name='uq_match_history_user_room'),
    )
    op.create_index('ix_match_history_user_id', 'match_history', ['user_id'])
    op.create_index('ix_match_history_opponent_id', 'match_history', ['opponent_id'])
    op.create_index('ix_match_history_room_id', 'match_history', ['room_id'])
    op.create_index('ix_match_history_created_at', 'match_history', ['created_at'])


def downgrade():
    op.drop_table('match_history')
    op.drop_table('challenges')
    op.drop_table('friendships')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_google_sub', type_='unique')
        batch_op.drop_constraint('uq_users_email', type_='unique')
        batch_op.drop_constraint('uq_users_username', type_='unique')
        for column in ('achievements', 'avatar_url', 'avatar_key', 'bio', 'auth_provider', 'google_sub', 'password_hash', 'email', 'username', 'last_seen'):
            batch_op.drop_column(column)
