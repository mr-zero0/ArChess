from datetime import datetime, timezone

from extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Ranked/Matchmaking stats
    mmr = db.Column(db.Integer, default=1200)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    # Progression/Cosmetics
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    cosmetics_owned = db.Column(db.JSON, default=dict)

    def __repr__(self):
        return f'<User {self.guest_id}>'
