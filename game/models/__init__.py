from .models import PieceState
from .user import User
from .room import Room
from .matchmaking import MatchmakingQueue
from .telemetry import TelemetryEvent
from .social import Friendship, Challenge, MatchHistory
from game.ranked_hooks import register_ranked_room_hooks
from game.telemetry_hooks import register_telemetry_hooks
from game import ranked_routes  # noqa: F401,E402
from game import analytics_routes  # noqa: F401,E402

register_ranked_room_hooks(Room)
register_telemetry_hooks(Room)

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
