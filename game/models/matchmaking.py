from datetime import datetime, timezone

from core.extensions import db


class MatchmakingQueue(db.Model):
    __tablename__ = 'matchmaking_queue'
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uq_matchmaking_queue_user'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = db.Column(db.String(20), default='searching', nullable=False)
    matched_room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)

    user = db.relationship('User', backref='matchmaking_entries', lazy=True)

    def __repr__(self):
        return f'<MatchmakingQueue User={self.user_id} Status={self.status}>'
