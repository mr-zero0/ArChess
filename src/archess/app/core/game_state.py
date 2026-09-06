"""
Game state management for Archess.
Implements state tracking, update tracking, and domain separation.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Dict, List, Optional, Any
from collections import deque

from archess.app.config import game_config
from archess.app.bootstrap.logging import get_logger


class GameState(Enum):
    """Possible states of the game."""
    INITIALIZING = auto()
    MENU = auto()
    OPTIONS = auto()
    RUNNING = auto()
    PAUSED = auto()
    GAME_OVER = auto()
    SHUTTING_DOWN = auto()


class TurnState(Enum):
    """States within a turn."""
    PLAYER_SELECTING = auto()
    PLAYER_LAUNCHING = auto()
    PIECES_IN_MOTION = auto()
    PROCESSING_COLLISIONS = auto()
    APPLYING_DAMAGE = auto()
    TURN_ENDING = auto()


@dataclass
class UpdateRecord:
    """Record of a game state change for debugging and observability."""
    sequence_id: int
    timestamp: str
    game_id: str
    turn: int
    event_type: str
    entity_id: Optional[str] = None
    old_value: Any = None
    new_value: Any = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Piece:
    """Represents a game piece with basic properties."""
    id: str
    piece_type: str
    player_id: int  # 0 or 1 for two players
    hp: int
    max_hp: int
    mass: float
    is_active: bool = True
    is_destroyed: bool = False
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    velocity: tuple[float, float, float] = (0.0, 0.0, 0.0)

    def take_damage(self, damage: int) -> int:
        """
        Apply damage to piece and return actual damage dealt.

        Args:
            damage: Amount of damage to apply

        Returns:
            int: Actual damage dealt (may be less if piece dies)
        """
        old_hp = self.hp
        self.hp = max(0, self.hp - damage)
        actual_damage = old_hp - self.hp

        if self.hp <= 0 and not self.is_destroyed:
            self.is_destroyed = True
            self.is_active = False

        return actual_damage

    def is_alive(self) -> bool:
        """Check if piece is alive and active."""
        return self.hp > 0 and self.is_active and not self.is_destroyed


@dataclass
class GameStats:
    """Tracking of game statistics."""
    pieces_launched: int = 0
    collisions_detected: int = 0
    damage_dealt: int = 0
    pieces_destroyed: int = 0
    turns_completed: int = 0


class UpdateTracker:
    """Tracks important game state changes for debugging and observability."""

    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self._updates: deque[UpdateRecord] = deque(maxlen=max_history)
        self._sequence_counter = 0
        self.logger = get_logger()

    def record_update(
        self,
        event_type: str,
        entity_id: Optional[str] = None,
        old_value: Any = None,
        new_value: Any = None,
        metadata: Optional[Dict[str, Any]] = None,
        game_id: Optional[str] = None,
        turn: int = 0
    ) -> None:
        """
        Record a game state update.

        Args:
            event_type: Type of event that occurred
            entity_id: ID of entity affected (if applicable)
            old_value: Previous value
            new_value: New value
            metadata: Additional context information
            game_id: Current game ID
            turn: Current turn number
        """
        self._sequence_counter += 1

        update = UpdateRecord(
            sequence_id=self._sequence_counter,
            timestamp=datetime.utcnow().isoformat() + "Z",
            game_id=game_id or "unknown",
            turn=turn,
            event_type=event_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            metadata=metadata or {}
        )

        self._updates.append(update)

        # Log important events
        if event_type in [
            "piece_launched", "piece_destroyed", "king_hit",
            "king_destroyed", "game_over", "turn_started", "turn_ended"
        ]:
            self.logger.info(
                f"game_event_{event_type}",
                sequence_id=update.sequence_id,
                game_id=update.game_id,
                turn=update.turn,
                entity_id=entity_id,
                event_type=event_type,
                **({} if metadata is None else metadata)
            )

    def get_recent_updates(self, count: int = 10) -> List[UpdateRecord]:
        """Get recent updates for debugging."""
        return list(self._updates)[-count:]

    def get_updates_by_event(self, event_type: str) -> List[UpdateRecord]:
        """Get all updates of a specific event type."""
        return [update for update in self._updates if update.event_type == event_type]

    def clear_history(self) -> None:
        """Clear update history (useful for testing)."""
        self._updates.clear()
        self._sequence_counter = 0


class GameStateManager:
    """Manages the overall game state and coordinates between systems."""

    def __init__(self):
        self.logger = get_logger()
        self.state = GameState.INITIALIZING
        self.turn_state = TurnState.PLAYER_SELECTING
        self.current_turn = 0
        self.max_turns = game_config.max_turns

        # Game identification
        self.game_id = str(uuid.uuid4())

        # Update tracking
        self.update_tracker = UpdateTracker()

        # Game entities
        self.pieces: Dict[str, Piece] = {}
        self.active_pieces: Dict[str, Piece] = {}

        # Players
        self.player_pieces: Dict[int, List[str]] = {0: [], 1: []}
        self.current_player = 0

        # Game statistics
        self.stats = GameStats()

        # Initialize with correlation ID for logging
        get_logger().set_correlation_id(self.game_id)

    def initialize_game(self) -> bool:
        """
        Initialize a new game session.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("game_initializing", game_id=self.game_id)

            # Reset game state - start in menu
            self.state = GameState.MENU
            self.turn_state = TurnState.PLAYER_SELECTING
            self.current_turn = 0
            self.stats = GameStats()

            # Clear existing pieces
            self.pieces.clear()
            self.active_pieces.clear()
            self.player_pieces = {0: [], 1: []}

            # Create initial pieces for both players
            from archess.app.pieces.piece_factory import PieceFactory
            piece_factory = PieceFactory()
            # Player 0 pieces (left side)
            player0_pieces = piece_factory.create_standard_set(
                player_id=0,
                base_position=(-10.0, 0.0, 0.0),
                spacing=2.0
            )
            # Player 1 pieces (right side)
            player1_pieces = piece_factory.create_standard_set(
                player_id=1,
                base_position=(10.0, 0.0, 0.0),
                spacing=2.0
            )

            # Add all pieces to game state
            for piece in player0_pieces.values():
                self.add_piece(piece)
            for piece in player1_pieces.values():
                self.add_piece(piece)

            self.update_tracker.record_update(
                event_type="game_initialized",
                game_id=self.game_id,
                turn=self.current_turn,
                metadata={"initial_turn": self.current_turn}
            )

            self.logger.info("game_initialized", game_id=self.game_id)
            return True

        except Exception as e:
            self.logger.error(
                "game_initialization_failed",
                game_id=self.game_id,
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def start_turn(self) -> bool:
        """
        Start a new turn.

        Returns:
            bool: True if turn started successfully
        """
        if self.state != GameState.RUNNING:
            self.logger.warning(
                "cannot_start_turn",
                game_id=self.game_id,
                current_state=self.state.name
            )
            return False

        if self.current_turn >= self.max_turns:
            self.end_game()
            return False

        self.current_turn += 1
        self.turn_state = TurnState.PLAYER_SELECTING

        # Switch players
        self.current_player = 1 - self.current_player

        self.update_tracker.record_update(
            event_type="turn_started",
            game_id=self.game_id,
            turn=self.current_turn,
            metadata={
                "player": self.current_player
            }
        )

        self.logger.info(
            "turn_started",
            game_id=self.game_id,
            turn=self.current_turn,
            player=self.current_player
        )

        return True

    def end_turn(self) -> None:
        """End the current turn."""
        if self.turn_state == TurnState.TURN_ENDING:
            return

        self.turn_state = TurnState.TURN_ENDING
        self.stats.turns_completed += 1

        self.update_tracker.record_update(
            event_type="turn_ended",
            game_id=self.game_id,
            turn=self.current_turn,
            metadata={
                "player": self.current_player,
                "stats": {
                    "pieces_launched": self.stats.pieces_launched,
                    "collisions": self.stats.collisions_detected,
                    "damage": self.stats.damage_dealt
                }
            }
        )

        self.logger.info(
            "turn_ended",
            game_id=self.game_id,
            turn=self.current_turn,
            player=self.current_player
        )

        # Auto-start next turn if game is still running
        if self.state == GameState.RUNNING:
            self.start_turn()

    def end_game(self, winner: Optional[int] = None) -> None:
        """
        End the current game.

        Args:
            winner: Player ID of winner (None for draw/tie)
        """
        if self.state == GameState.GAME_OVER:
            return

        self.state = GameState.GAME_OVER

        self.update_tracker.record_update(
            event_type="game_over",
            game_id=self.game_id,
            turn=self.current_turn,
            metadata={
                "winner": winner,
                "final_turn": self.current_turn,
                "stats": {
                    "pieces_launched": self.stats.pieces_launched,
                    "collisions_detected": self.stats.collisions_detected,
                    "damage_dealt": self.stats.damage_dealt,
                    "pieces_destroyed": self.stats.pieces_destroyed,
                    "turns_completed": self.stats.turns_completed
                }
            }
        )

        self.logger.info(
            "game_over",
            game_id=self.game_id,
            winner=winner,
            final_turn=self.current_turn
        )

    def add_piece(self, piece: Piece) -> None:
        """
        Add a piece to the game.

        Args:
            piece: Piece to add
        """
        self.pieces[piece.id] = piece
        if piece.is_active:
            self.active_pieces[piece.id] = piece
            self.player_pieces[piece.player_id].append(piece.id)

        self.update_tracker.record_update(
            event_type="piece_created",
            game_id=self.game_id,
            turn=self.current_turn,
            entity_id=piece.id,
            old_value=None,
            new_value={
                "piece_type": piece.piece_type,
                "player_id": piece.player_id,
                "hp": piece.hp,
                "position": piece.position
            }
        )

        self.logger.debug(
            "piece_added",
            game_id=self.game_id,
            piece_id=piece.id,
            piece_type=piece.piece_type,
            player_id=piece.player_id
        )

    def remove_piece(self, piece_id: str) -> bool:
        """
        Remove a piece from the game.

        Args:
            piece_id: ID of piece to remove

        Returns:
            bool: True if piece was removed
        """
        if piece_id not in self.pieces:
            return False

        piece = self.pieces[piece_id]
        was_active = piece.is_active

        # Record update (using current piece)
        self.update_tracker.record_update(
            event_type="piece_removed",
            game_id=self.game_id,
            turn=self.current_turn,
            entity_id=piece_id,
            old_value={
                "piece_type": piece.piece_type,
                "player_id": piece.player_id,
                "is_active": True,
                "hp": piece.hp
            },
            new_value={
                "piece_type": piece.piece_type,
                "player_id": piece.player_id,
                "is_active": False,
                "hp": piece.hp
            }
        )

        # Mark as inactive
        piece.is_active = False
        # Remove from pieces dict
        del self.pieces[piece_id]
        if piece_id in self.active_pieces:
            del self.active_pieces[piece_id]

        # Remove from player tracking
        if piece.player_id in self.player_pieces:
            if piece_id in self.player_pieces[piece.player_id]:
                self.player_pieces[piece.player_id].remove(piece_id)

        self.logger.info(
            "piece_removed",
            game_id=self.game_id,
            piece_id=piece_id,
            piece_type=piece.piece_type
        )

        return True

    def get_piece(self, piece_id: str) -> Optional[Piece]:
        """Get a piece by ID."""
        return self.pieces.get(piece_id)

    def get_pieces(self) -> Dict[str, Piece]:
        """Get all pieces (active and inactive)."""
        return self.pieces.copy()

    def get_active_pieces(self) -> Dict[str, Piece]:
        """Get all active pieces."""
        return self.active_pieces.copy()

    def get_player_pieces(self, player_id: int) -> List[str]:
        """Get all piece IDs for a player."""
        return self.player_pieces.get(player_id, []).copy()

    def is_game_over(self) -> bool:
        """Check if the game is over."""
        return self.state == GameState.GAME_OVER

    def get_game_state(self) -> GameState:
        """Get current game state."""
        return self.state

    def get_turn_state(self) -> TurnState:
        """Get current turn state."""
        return self.turn_state

    def get_current_turn(self) -> int:
        """Get current turn number."""
        return self.current_turn

    def get_current_player(self) -> int:
        """Get current player ID."""
        return self.current_player

    def get_game_id(self) -> str:
        """Get current game ID."""
        return self.game_id

    def get_stats(self) -> GameStats:
        """Get game statistics."""
        return self.stats

    def get_update_tracker(self) -> UpdateTracker:
        """Get the update tracker."""
        return self.update_tracker