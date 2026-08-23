from extensions import db
from datetime import datetime

class MatchmakingQueue(db.Model):
    __tablename__ = 'matchmaking_queue'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='searching') # searching, matched, canceled
    matched_room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)

    user = db.relationship('User', backref='matchmaking_entries', lazy=True)

    def __repr__(self):
        return f'<MatchmakingQueue User={self.user_id} Status={self.status}>'
