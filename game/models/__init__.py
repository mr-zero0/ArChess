from flask import appcontext_pushed

from .models import PieceState
from .user import User
from .room import Room
from .matchmaking import MatchmakingQueue
from .telemetry import TelemetryEvent
from .social import Friendship, Challenge, MatchHistory
from game.ranked_hooks import register_ranked_room_hooks
from game.telemetry_hooks import register_telemetry_hooks
from game.auth_routes import configure_auth
from game.auth_routes import AUTH_BP
from game.social_routes import SOCIAL_BP

register_ranked_room_hooks(Room)
register_telemetry_hooks(Room)
from game import ranked_routes  # noqa: F401,E402
from game import analytics_routes  # noqa: F401,E402


def _register_web_extensions(sender, **kwargs):
    configure_auth(sender)
    if 'archess_auth' not in sender.extensions:
        sender.register_blueprint(AUTH_BP)
        sender.register_blueprint(SOCIAL_BP)
        sender.extensions['archess_auth'] = True


appcontext_pushed.connect(_register_web_extensions, weak=False)

__all__ = [
    'PieceState',
    'User',
    'Room',
    'MatchmakingQueue',
    'TelemetryEvent',
    'Friendship',
    'Challenge',
    'MatchHistory',
]
