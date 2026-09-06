"""
AI Controller for Archess game.
Handles computer player decision making for single-player gameplay.
"""
from __future__ import annotations

import random
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from archess.app.core.game_state import GameStateManager, Piece, GameState, TurnState
from archess.app.config import game_config, piece_config
from archess.app.bootstrap.logging import get_logger


@dataclass
class AIConfig:
    """Configuration for AI behavior."""
    difficulty: str = "medium"  # easy, medium, hard
    reaction_time: float = 1.0  # seconds to "think" before making a move
    aggression: float = 0.7     # 0.0 (passive) to 1.0 (aggressive)
    smart_launching: bool = True # Whether to use strategy or random launching


class AIController:
    """
    Controls AI player behavior for single-player gameplay.
    """

    def __init__(self, player_id: int, config: Optional[AIConfig] = None):
        self.logger = get_logger()
        self.player_id = player_id
        self.config = config or AIConfig()
        self.is_initialized = False
        self.last_action_time = 0.0
        self.thinking = False

        # AI state
        self.selected_piece_id: Optional[str] = None
        self.aim_position: Tuple[float, float, float] = (0.0, 0.0, 0.0)

        self.logger.info(
            "ai_controller_created",
            player_id=player_id,
            difficulty=self.config.difficulty
        )

    def initialize(self) -> bool:
        """
        Initialize the AI controller.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("ai_controller_initializing")

            # Reset AI state
            self.selected_piece_id = None
            self.aim_position = (0.0, 0.0, 0.0)
            self.last_action_time = 0.0
            self.thinking = False

            self.is_initialized = True
            self.logger.info("ai_controller_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "ai_controller_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def update(self, game_state: GameStateManager, delta_time: float) -> None:
        """
        Update AI controller - make decisions and take actions.

        Args:
            game_state: Current game state
            delta_time: Time since last update in seconds
        """
        if not self.is_initialized:
            return

        # Only act if it's AI's turn and game is running
        if (game_state.get_current_player() != self.player_id or
            game_state.get_game_state() != GameState.RUNNING):
            self.thinking = False
            return

        # Only act if we're in piece selection phase
        if game_state.get_turn_state() != TurnState.PLAYER_SELECTING:
            self.thinking = False
            return

        # Handle thinking delay
        current_time = time.time()
        if not self.thinking:
            # Start thinking
            self.thinking = True
            self.last_action_time = current_time + self.config.reaction_time
            self.logger.debug("ai_started_thinking")
            return

        # Check if thinking time is complete
        if current_time < self.last_action_time:
            return  # Still thinking

        # Time to make a decision
        self.thinking = False
        self._make_ai_decision(game_state)

    def _make_ai_decision(self, game_state: GameStateManager) -> None:
        """
        Make a decision about what piece to launch and where to aim.

        Args:
            game_state: Current game state
        """
        # Get active pieces for this AI player
        all_active = game_state.get_active_pieces()
        player_pieces = {
            pid: piece for pid, piece in all_active.items()
            if piece.player_id == self.player_id
        }

        if not player_pieces:
            self.logger.warning("ai_no_pieces_available", player_id=self.player_id)
            return

        # Select a piece to launch
        if self.config.smart_launching:
            piece_id, piece = self._select_best_piece(player_pieces, game_state)
        else:
            # Random selection
            piece_id, piece = random.choice(list(player_pieces.items()))

        # Determine launch parameters
        velocity = self._calculate_launch_velocity(piece, game_state)

        # Apply the launch
        self._execute_launch(game_state, piece_id, velocity)

        self.logger.info(
            "ai_launched_piece",
            piece_id=piece_id,
            piece_type=piece.piece_type,
            velocity=velocity
        )

    def _select_best_piece(self, pieces: Dict[str, Piece], game_state: GameStateManager) -> Tuple[str, Piece]:
        """
        Select the best piece to launch based on AI strategy.

        Args:
            pieces: Dictionary of available pieces
            game_state: Current game state

        Returns:
            Tuple of (piece_id, piece)
        """
        # For now, use a simple heuristic: prefer pieces that are closer to center
        # or have higher value (based on type)

        best_piece_id = None
        best_piece = None
        best_score = -1

        for piece_id, piece in pieces.items():
            score = self._evaluate_piece(piece, game_state)
            if score > best_score:
                best_score = score
                best_piece_id = piece_id
                best_piece = piece

        # Fallback to random if evaluation failed
        if best_piece_id is None:
            return random.choice(list(pieces.items()))

        return best_piece_id, best_piece

    def _evaluate_piece(self, piece: Piece, game_state: GameStateManager) -> float:
        """
        Evaluate how good a piece is for launching.

        Args:
            piece: Piece to evaluate
            game_state: Current game state

        Returns:
            float: Score (higher is better)
        """
        score = 0.0

        # Prefer pieces with higher HP (more valuable to keep alive?)
        # Actually, we might want to launch weaker pieces first
        hp_factor = piece.hp / piece.max_hp
        score += (1.0 - hp_factor) * 0.3  # Prefer lower HP pieces

        # Prefer certain piece types based on difficulty
        type_scores = {
            "pawn": 0.8,
            "knight": 0.6,
            "archer": 0.7,
            "giant": 0.9,
            "king": 0.2  # Don't launch king unless desperate
        }
        type_score = type_scores.get(piece.piece_type, 0.5)
        score += type_score * 0.4

        # Add some randomness for variety
        score += random.uniform(0, 0.3)

        return score

    def _calculate_launch_velocity(self, piece: Piece, game_state: GameStateManager) -> Tuple[float, float, float]:
        """
        Calculate launch velocity for a piece.

        Args:
            piece: Piece to launch
            game_state: Current game state

        Returns:
            Tuple of (vx, vy, vz) velocity
        """
        launch_speed = 8.0 + (random.uniform(-1.0, 1.0) * 2.0)  # Base speed with variation

        if self.player_id == 0:
            # Player 0 (left side) launches towards positive X
            vx = launch_speed
        else:
            # Player 1 (right side) launches towards negative X
            vx = -launch_speed

        # Add some vertical variation based on aggression and difficulty
        vy = random.uniform(-2.0, 2.0) * self.config.aggression
        vz = random.uniform(-0.5, 0.5)  # Minimal Z variation

        return (vx, vy, vz)

    def _execute_launch(self, game_state: GameStateManager, piece_id: str, velocity: Tuple[float, float, float]) -> None:
        """
        Execute the launch of a piece.

        Args:
            game_state: Current game state
            piece_id: ID of piece to launch
            velocity: Velocity to apply
        """
        piece = game_state.get_piece(piece_id)
        if not piece or not piece.is_active:
            self.logger.warning("ai_tried_to_launch_inactive_piece", piece_id=piece_id)
            return

        # Apply velocity to the piece
        piece.velocity = velocity

        # Update game state statistics
        game_state.stats.pieces_launched += 1

        # Record the launch event
        game_state.update_tracker.record_update(
            event_type="piece_launched",
            game_id=game_state.get_game_id(),
            turn=game_state.get_current_turn(),
            entity_id=piece_id,
            old_value={"velocity": (0.0, 0.0, 0.0)},
            new_value={"velocity": velocity},
            metadata={"launcher_player": self.player_id, "is_ai": True}
        )

    def cleanup(self) -> None:
        """Clean up AI controller resources."""
        self.logger.info("ai_controller_cleaning_up")
        self.is_initialized = False
        self.selected_piece_id = None
        self.thinking = False

    def is_ready(self) -> bool:
        """Check if AI controller is ready."""
        return self.is_initialized