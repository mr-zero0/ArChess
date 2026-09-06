"""
Combat system for Archess game.
Handles damage calculation, combat resolution, and game outcome determination
applying production-grade standards.
"""
from __future__ import annotations

import math
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
from collections import defaultdict

from archess.app.core.game_state import GameStateManager, Piece, GameState
from archess.app.config import combat_config, piece_config
from archess.app.audio.manager import AudioManager
from archess.app.bootstrap.logging import get_logger


@dataclass
class DamageEvent:
    """Represents a damage event applied to a piece."""
    target_piece_id: str
    attacker_piece_id: Optional[str]  # None for environmental damage
    damage_amount: float
    damage_type: str  # "impact", "explosion", etc.
    position: Tuple[float, float, float]
    timestamp: float = field(default_factory=lambda: __import__('time').time())


@dataclass
class CombatUpdateRecord:
    """Record of a combat update for debugging and observability."""
    sequence_id: int
    timestamp: str
    game_id: str
    turn: int
    event_type: str
    piece_id: Optional[str] = None
    damage_dealt: float = 0.0
    metadata: dict = field(default_factory=dict)


class CombatSystem:
    """
    Combat system for Archess game.
    Handles damage calculation, combat resolution, and game outcome determination.
    """

    def __init__(self, game_state: GameStateManager, audio_manager: Optional[AudioManager] = None):
        self.logger = get_logger()
        self.game_state = game_state
        self.audio_manager = audio_manager
        self.is_initialized = False

        # Combat state
        self.damage_events: List[DamageEvent] = []
        self.pieces_destroyed_this_turn: Set[str] = set()
        self.kings_hit_this_turn: Set[int] = set()  # Player IDs whose kings were hit

        # Performance tracking
        self.update_count = 0

        self.logger.info("combat_system_created")

    def initialize(self) -> bool:
        """
        Initialize the combat system.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("combat_system_initializing")

            # Reset combat state
            self.damage_events.clear()
            self.pieces_destroyed_this_turn.clear()
            self.kings_hit_this_turn.clear()
            self.update_count = 0

            self.is_initialized = True
            self.logger.info("combat_system_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "combat_system_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def update(self, physics_collisions: List) -> List[DamageEvent]:
        """
        Update combat system based on physics collisions.

        Args:
            physics_collisions: List of collision events from physics engine

        Returns:
            List[DamageEvent]: Damage events that occurred during this update
        """
        if not self.is_initialized:
            self.logger.warning("combat_system_not_initialized")
            return []

        # Reset for this update
        self.damage_events.clear()
        self.pieces_destroyed_this_turn.clear()
        self.kings_hit_this_turn.clear()

        self.update_count += 1

        # Process each collision for potential damage
        for collision in physics_collisions:
            self._process_collision_for_damage(collision)

        # Check for game over conditions
        self._check_game_over_conditions()

        # Log damage events if any
        if self.damage_events:
            self.logger.debug(
                "combat_damage_events",
                count=len(self.damage_events),
                update_count=self.update_count
            )

        return self.damage_events.copy()

    def _process_collision_for_damage(self, collision) -> None:
        """
        Process a collision event to determine if damage should be applied.

        Args:
            collision: Collision event from physics engine
        """
        # Get the pieces involved in the collision
        piece_a = self.game_state.get_piece(collision.piece_a_id)
        piece_b = self.game_state.get_piece(collision.piece_b_id)

        if not piece_a or not piece_b:
            return

        # Calculate damage based on impact velocity and mass
        damage_to_a, damage_to_b = self._calculate_collision_damage(collision, piece_a, piece_b)

        # Apply damage to piece A
        if damage_to_a > 0:
            self._apply_damage(
                target_piece_id=piece_a.id,
                attacker_piece_id=piece_b.id,
                damage_amount=damage_to_a,
                damage_type="impact",
                position=collision.position
            )

        # Apply damage to piece B
        if damage_to_b > 0:
            self._apply_damage(
                target_piece_id=piece_b.id,
                attacker_piece_id=piece_a.id,
                damage_amount=damage_to_b,
                damage_type="impact",
                position=collision.position
            )

    def _calculate_collision_damage(self, collision, piece_a: Piece, piece_b: Piece) -> Tuple[float, float]:
        """
        Calculate damage for both pieces based on collision.

        Args:
            collision: Collision event
            piece_a: First piece
            piece_b: Second piece

        Returns:
            Tuple[float, float]: (damage_to_a, damage_to_b)
        """
        # Calculate relative velocity at impact
        rvx = collision.relative_velocity[0]
        rvy = collision.relative_velocity[1]
        rvz = collision.relative_velocity[2]
        impact_speed = math.sqrt(rvx*rvx + rvy*rvy + rvz*rvz)

        # Get piece masses
        mass_a = self._get_piece_mass(piece_a.piece_type)
        mass_b = self._get_piece_mass(piece_b.piece_type)

        # Calculate kinetic energy involved in collision
        # KE = 0.5 * m * v^2
        # For collision damage, we consider the reduced mass system
        if mass_a + mass_b > 0:
            reduced_mass = (mass_a * mass_b) / (mass_a + mass_b)
            kinetic_energy = 0.5 * reduced_mass * (impact_speed * impact_speed)
        else:
            kinetic_energy = 0

        # Convert kinetic energy to damage
        base_damage = kinetic_energy * combat_config.velocity_damage_factor

        # Apply minimum impact threshold
        if impact_speed < combat_config.min_impact_for_damage:
            base_damage = 0

        # Get piece-specific damage modifiers
        damage_modifier_a = self._get_piece_damage_modifier(piece_a.piece_type)
        damage_modifier_b = self._get_piece_damage_modifier(piece_b.piece_type)

        # Calculate final damage
        damage_to_a = base_damage * damage_modifier_b  # B's modifier affects A
        damage_to_b = base_damage * damage_modifier_a  # A's modifier affects B

        # Ensure damage is not negative
        damage_to_a = max(0, damage_to_a)
        damage_to_b = max(0, damage_to_b)

        return damage_to_a, damage_to_b

    def _apply_damage(self, target_piece_id: str, attacker_piece_id: Optional[str],
                     damage_amount: float, damage_type: str, position: Tuple[float, float, float]) -> None:
        """
        Apply damage to a piece.

        Args:
            target_piece_id: ID of piece receiving damage
            attacker_piece_id: ID of piece causing damage (None for environmental)
            damage_amount: Amount of damage to apply
            damage_type: Type of damage
            position: Position where damage occurred
        """
        piece = self.game_state.get_piece(target_piece_id)
        if not piece or not piece.is_active:
            return

        # Apply damage using the piece's take_damage method
        actual_damage = piece.take_damage(int(damage_amount))

        # Create damage event
        damage_event = DamageEvent(
            target_piece_id=target_piece_id,
            attacker_piece_id=attacker_piece_id,
            damage_amount=actual_damage,
            damage_type=damage_type,
            position=position
        )
        self.damage_events.append(damage_event)

        # Record damage event in update tracker
        self.game_state.update_tracker.record_update(
            event_type="damage_applied",
            entity_id=target_piece_id,
            old_value={"hp": piece.hp + actual_damage},  # HP before damage
            new_value={"hp": piece.hp},  # HP after damage
            metadata={
                "attacker_piece_id": attacker_piece_id,
                "damage_amount": actual_damage,
                "damage_type": damage_type,
                "position": position
            },
            game_id=self.game_state.get_game_id(),
            turn=self.game_state.get_current_turn()
        )

        # Play hit sound effect
        if self.audio_manager and self.audio_manager.is_initialized:
            self.audio_manager.play_sound_effect("hit")

        # Track destroyed pieces
        if not piece.is_active and piece.id not in self.pieces_destroyed_this_turn:
            self.pieces_destroyed_this_turn.add(piece.id)
            self.logger.info(
                "piece_destroyed",
                piece_id=target_piece_id,
                attacker_id=attacker_piece_id,
                damage=actual_damage
            )

            # Record piece destroyed event in update tracker
            self.game_state.update_tracker.record_update(
                event_type="piece_destroyed",
                entity_id=target_piece_id,
                old_value={
                    "piece_type": piece.piece_type,
                    "player_id": piece.player_id,
                    "is_active": True,
                    "hp": piece.hp + actual_damage  # HP before damage
                },
                new_value={
                    "piece_type": piece.piece_type,
                    "player_id": piece.player_id,
                    "is_active": False,
                    "hp": piece.hp
                },
                metadata={
                    "attacker_piece_id": attacker_piece_id,
                    "damage_amount": actual_damage,
                    "damage_type": damage_type,
                    "position": position
                },
                game_id=self.game_state.get_game_id(),
                turn=self.game_state.get_current_turn()
            )

            # Check if this was a king
            if piece.piece_type == "king":
                player_id = piece.player_id
                self.kings_hit_this_turn.add(player_id)
                self.logger.warning(
                    "king_hit",
                    king_id=target_piece_id,
                    player_id=player_id,
                    attacker_id=attacker_piece_id
                )

                # Record king hit event in update tracker
                self.game_state.update_tracker.record_update(
                    event_type="king_hit",
                    entity_id=target_piece_id,
                    old_value={
                        "piece_type": "king",
                        "player_id": player_id,
                        "is_active": True,
                        "hp": piece.hp + actual_damage  # HP before damage
                    },
                    new_value={
                        "piece_type": "king",
                        "player_id": player_id,
                        "is_active": False,
                        "hp": piece.hp
                    },
                    metadata={
                        "attacker_piece_id": attacker_piece_id,
                        "damage_amount": actual_damage,
                        "damage_type": damage_type,
                        "position": position
                    },
                    game_id=self.game_state.get_game_id(),
                    turn=self.game_state.get_current_turn()
                )

                # Play king hit sound effect
                if self.audio_manager and self.audio_manager.is_initialized:
                    self.audio_manager.play_sound_effect("king_hit")

    def _check_game_over_conditions(self) -> None:
        """Check if game over conditions have been met."""
        # Check if any king has been destroyed
        for player_id in [0, 1]:
            king_pieces = [
                piece for piece in self.game_state.get_active_pieces().values()
                if piece.player_id == player_id and piece.piece_type == "king"
            ]

            if not king_pieces:  # No king found for this player
                # King has been destroyed
                winner = 1 - player_id  # Other player wins
                self.logger.info(
                    "king_destroyed",
                    losing_player=player_id,
                    winning_player=winner
                )

                # Find the destroyed king piece to get its ID
                destroyed_king_id = None
                for piece_id, piece in self.game_state.get_pieces().items():
                    if piece.player_id == player_id and piece.piece_type == "king" and not piece.is_active:
                        destroyed_king_id = piece_id
                        break

                # Record king destroyed event in update tracker
                if destroyed_king_id:
                    self.game_state.update_tracker.record_update(
                        event_type="king_destroyed",
                        entity_id=destroyed_king_id,
                        old_value={
                            "piece_type": "king",
                            "player_id": player_id,
                            "is_active": True,  # Was active before destruction
                            "hp": 0  # Assuming it had 0 HP when destroyed
                        },
                        new_value={
                            "piece_type": "king",
                            "player_id": player_id,
                            "is_active": False,
                            "hp": 0
                        },
                        metadata={
                            "winning_player": winner,
                            "losing_player": player_id
                        },
                        game_id=self.game_state.get_game_id(),
                        turn=self.game_state.get_current_turn()
                    )
                )
                # The game state update will be handled by the UI manager or main game loop

    def _get_piece_mass(self, piece_type: str) -> float:
        """
        Get the mass of a piece type.

        Args:
            piece_type: Type of piece

        Returns:
            float: Mass of the piece
        """
        default_mass = piece_config.piece_mass
        return piece_config.piece_types.get(piece_type, {}).get("mass", default_mass)

    def _get_piece_damage_modifier(self, piece_type: str) -> float:
        """
        Get the damage modifier for a piece type.
        Higher values mean the piece deals more damage.

        Args:
            piece_type: Type of piece

        Returns:
            float: Damage modifier
        """
        # Default modifier
        default_modifier = 1.0
        return piece_config.piece_types.get(piece_type, {}).get("damage_modifier", default_modifier)

    def get_damage_events(self) -> List[DamageEvent]:
        """
        Get the damage events from the last update.

        Returns:
            List[DamageEvent]: Copy of damage events
        """
        return self.damage_events.copy()

    def get_pieces_destroyed_this_turn(self) -> Set[str]:
        """
        Get pieces destroyed during the current turn.

        Returns:
            Set[str]: Set of piece IDs destroyed this turn
        """
        return self.pieces_destroyed_this_turn.copy()

    def get_kings_hit_this_turn(self) -> Set[int]:
        """
        Get players whose kings were hit during the current turn.

        Returns:
            Set[int]: Set of player IDs whose kings were hit this turn
        """
        return self.kings_hit_this_turn.copy()

    def cleanup(self) -> None:
        """Clean up combat system resources."""
        self.logger.info("combat_system_cleaning_up")
        self.is_initialized = False
        self.damage_events.clear()
        self.pieces_destroyed_this_turn.clear()
        self.kings_hit_this_turn.clear()

    def is_ready(self) -> bool:
        """Check if combat system is ready."""
        return self.is_initialized


if __name__ == "__main__":
    # For testing purposes
    print("CombatSystem module loaded successfully")