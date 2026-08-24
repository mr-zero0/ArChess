from .models import PieceState
from .user import User
from .room import Room
from .matchmaking import MatchmakingQueue
from .telemetry import TelemetryEvent
from game.ranked_hooks import register_ranked_room_hooks
from game.telemetry_hooks import register_telemetry_hooks

register_ranked_room_hooks(Room)
register_telemetry_hooks(Room)
from game import ranked_routes  # noqa: F401
from game import analytics_routes  # noqa: F401

__all__ = ['PieceState', 'User', 'Room', 'MatchmakingQueue', 'TelemetryEvent']
