import json
from datetime import datetime, timezone
from core.extensions import db
from game.physics.state_hash import state_hash

class MatchSession(db.Model):
    __tablename__ = 'matches'

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.String(36), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='waiting')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    current_turn = db.Column(db.String(10), default='white')
    last_physics_state = db.Column(db.Text, nullable=True)
    last_hp_state = db.Column(db.Text, nullable=True)
    last_destruction_event = db.Column(db.Text, nullable=True)
    last_gameover_event = db.Column(db.Text, nullable=True)
    
    canonical_state = db.Column(db.Text, nullable=True)
    match_log = db.Column(db.Text, nullable=True)
    invalid_action_log = db.Column(db.Text, nullable=True)

    players = db.relationship('User', backref='match', lazy=True, foreign_keys='User.match_id')
    white_player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    black_player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    @property
    def canonical_hash(self):
        if not self.canonical_state:
            return None
        try:
            return state_hash(json.loads(self.canonical_state))
        except (TypeError, ValueError, json.JSONDecodeError):
            return None

    def to_dict(self):
        players_data = []
        for p in self.players:
            team = 'white' if p.id == self.white_player_id else ('black' if p.id == self.black_player_id else 'spectator')
            players_data.append({'guestId': p.guest_id, 'team': team})
        return {
            'matchId': self.match_id,
            'status': self.status,
            'players': players_data,
            'canonicalHash': self.canonical_hash,
        }
