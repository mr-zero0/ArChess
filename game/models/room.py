from extensions import db
from datetime import datetime

class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    room_code = db.Column(db.String(6), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='waiting') # waiting, active, finished
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    current_turn = db.Column(db.String(10), default='white') # white, black
    last_physics_state = db.Column(db.Text, nullable=True)
    last_hp_state = db.Column(db.Text, nullable=True)




    # Relationship to players
    players = db.relationship('User', backref='room', lazy=True, foreign_keys='User.room_id')
    white_player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    black_player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        players_data = []
        for p in self.players:
            team = 'white' if p.id == self.white_player_id else ('black' if p.id == self.black_player_id else 'spectator')
            players_data.append({'guestId': p.guest_id, 'team': team})
        return {
            'roomId': self.room_code,
            'status': self.status,
            'players': players_data
        }

    def __repr__(self):
        return f'<Room {self.room_code}>'