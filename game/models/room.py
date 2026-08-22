from extensions import db
from datetime import datetime

class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    room_code = db.Column(db.String(6), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='waiting') # waiting, active, finished
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to players
    players = db.relationship('User', backref='room', lazy=True)

    def to_dict(self):
        return {
            'roomId': self.room_code,
            'status': self.status,
            'players': [{'guestId': p.guest_id, 'team': 'white'} for p in self.players]
        }

    def __repr__(self):
        return f'<Room {self.room_code}>'