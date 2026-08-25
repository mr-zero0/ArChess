from datetime import datetime, timezone

from core.extensions import db


class Friendship(db.Model):
    __tablename__ = 'friendships'

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    addressee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='pending', index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    requester = db.relationship('User', foreign_keys=[requester_id], backref='sent_friendships')
    addressee = db.relationship('User', foreign_keys=[addressee_id], backref='received_friendships')
    __table_args__ = (db.UniqueConstraint('requester_id', 'addressee_id', name='uq_friendship_direction'),)


class Challenge(db.Model):
    __tablename__ = 'challenges'

    id = db.Column(db.Integer, primary_key=True)
    challenger_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    challenged_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='pending', index=True)
    mode = db.Column(db.String(10), nullable=False, default='casual')
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    responded_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    challenger = db.relationship('User', foreign_keys=[challenger_id], backref='sent_challenges')
    challenged = db.relationship('User', foreign_keys=[challenged_id], backref='received_challenges')

    def to_public_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'mode': self.mode,
            'challenger': self.challenger.public_dict(),
            'challenged': self.challenged.public_dict(),
            'matchReady': self.room_id is not None and self.status == 'accepted',
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'respondedAt': self.responded_at.isoformat() if self.responded_at else None,
        }


class MatchHistory(db.Model):
    __tablename__ = 'match_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    opponent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False, index=True)
    result = db.Column(db.String(10), nullable=False)
    reason = db.Column(db.String(30), nullable=False, default='king_destroyed')
    mmr_before = db.Column(db.Integer, nullable=False)
    mmr_after = db.Column(db.Integer, nullable=False)
    xp_gained = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    user = db.relationship('User', foreign_keys=[user_id], backref='match_history')
    opponent = db.relationship('User', foreign_keys=[opponent_id])
    room = db.relationship('Room')
    __table_args__ = (db.UniqueConstraint('user_id', 'room_id', name='uq_match_history_user_room'),)

    def to_dict(self):
        return {
            'id': self.id,
            'opponent': self.opponent.public_dict(),
            'roomId': self.room_id,
            'result': self.result,
            'reason': self.reason,
            'mmrBefore': self.mmr_before,
            'mmrAfter': self.mmr_after,
            'mmrDelta': self.mmr_after - self.mmr_before,
            'xpGained': self.xp_gained,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
