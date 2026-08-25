from datetime import datetime, timezone

from core.extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    # Account / identity
    username = db.Column(db.String(20), unique=True, nullable=True, index=True)
    email = db.Column(db.String(254), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=True, index=True)
    auth_provider = db.Column(db.String(20), nullable=True)
    bio = db.Column(db.String(280), nullable=True)
    avatar_key = db.Column(db.String(32), nullable=False, default='knight')
    avatar_url = db.Column(db.String(500), nullable=True)
    achievements = db.Column(db.JSON, default=list)

    # Ranked/Matchmaking stats
    mmr = db.Column(db.Integer, default=1200)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)

    # Progression/Cosmetics
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    cosmetics_owned = db.Column(db.JSON, default=list)

    def public_dict(self):
        return {
            'id': self.id,
            'username': self.username or f'Player{self.id or ""}',
            'avatarKey': self.avatar_key or 'knight',
            'avatarUrl': self.avatar_url,
            'bio': self.bio or '',
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'mmr': int(self.mmr or 1200),
            'matchesPlayed': int(self.matches_played or 0),
            'wins': int(self.wins or 0),
            'losses': int(self.losses or 0),
            'level': int(self.level or 1),
            'xp': int(self.xp or 0),
        }

    def __repr__(self):
        return f'<User {self.username or self.guest_id}>'
