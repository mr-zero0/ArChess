"""
Physics engine for Archess game.
Handles collision detection, response, and physics simulation applying production-grade standards.
"""
from __future__ import annotations

import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict

from archess.app.core.game_state import GameStateManager, Piece
from archess.app.config import game_config, physics_config, piece_config
from archess.app.audio.manager import AudioManager
from archess.app.bootstrap.logging import get_logger


@dataclass
class CollisionEvent:
    """Represents a collision event between two pieces."""
    piece_a_id: str
    piece_b_id: str
    position: Tuple[float, float, float]  # Collision position
    normal: Tuple[float, float, float]    # Collision normal vector
    penetration: float                    # Penetration depth
    relative_velocity: Tuple[float, float, float]  # Relative velocity at collision point
    timestamp: float = field(default_factory=lambda: __import__('time').time())


@dataclass
class PhysicsUpdateRecord:
    """Record of a physics update for debugging and observability."""
    sequence_id: int
    timestamp: str
    game_id: str
    turn: int
    event_type: str
    piece_id: Optional[str] = None
    collision_count: int = 0
    metadata: dict = field(default_factory=dict)


class PhysicsEngine:
    """
    Physics engine for Archess game.
    Handles collision detection, response, and physics simulation.
    """

    def __init__(self, game_state: GameStateManager, audio_manager: Optional[AudioManager] = None):
        self.logger = get_logger()
        self.game_state = game_state
        self.audio_manager = audio_manager
        self.is_initialized = False

        # Physics state
        self.time_step = 1.0 / game_config.target_fps  # Fixed time step for determinism
        self.position_iterations = 8
        self.velocity_iterations = 3

        # Collision tracking
        self.collision_events: List[CollisionEvent] = []
        self.broad_pairs: List[Tuple[str, str]] = []  # Pairs that might be colliding

        # Performance tracking
        self.update_count = 0
        self.last_update_time = 0.0

        self.logger.info(
            "physics_engine_created",
            time_step=self.time_step
        )

    def initialize(self) -> bool:
        """
        Initialize the physics engine.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("physics_engine_initializing")

            # Reset physics state
            self.collision_events.clear()
            self.broad_pairs.clear()
            self.update_count = 0

            self.is_initialized = True
            self.logger.info("physics_engine_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "physics_engine_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def update(self, delta_time: float) -> List[CollisionEvent]:
        """
        Update physics simulation for the given time step.

        Args:
            delta_time: Time since last update in seconds

        Returns:
            List[CollisionEvent]: Collision events that occurred during this update
        """
        if not self.is_initialized:
            self.logger.warning("physics_engine_not_initialized")
            return []

        # Use fixed time step for determinism
        # In a real implementation, we would accumulate time and run multiple fixed steps
        # For simplicity, we'll use the provided delta_time but clamp it
        dt = min(delta_time, 0.1)  # Clamp to prevent spiral of death
        if dt <= 0:
            return []

        self.update_count += 1
        self.last_update_time += dt

        # Clear previous collision events
        self.collision_events.clear()

        # Step 1: Integrate forces and update positions/velocities
        self._integrate_forces(dt)

        # Step 2: Detect collisions
        self._detect_collisions()

        # Step 3: Resolve collisions
        self._resolve_collisions()

        # Step 4: Update game state with new positions/velocities
        self._update_game_state()

        # Log collision events if any
        if self.collision_events:
            self.logger.debug(
                "physics_collisions_detected",
                count=len(self.collision_events),
                update_count=self.update_count
            )

            # Record each collision event in the game state update tracker
            for collision in self.collision_events:
                self.game_state.update_tracker.record_update(
                    event_type="collision_detected",
                    entity_id=f"{collision.piece_a_id}_{collision.piece_b_id}",
                    metadata={
                        "piece_a_id": collision.piece_a_id,
                        "piece_b_id": collision.piece_b_id,
                        "position": collision.position,
                        "normal": collision.normal,
                        "penetration": collision.penetration,
                        "relative_velocity": collision.relative_velocity
                    },
                    game_id=self.game_state.get_game_id(),
                    turn=self.game_state.get_current_turn()
                )

        return self.collision_events.copy()

    def _integrate_forces(self, dt: float) -> None:
        """
        Integrate forces and update positions and velocities.

        Args:
            dt: Time step
        """
        pieces = self.game_state.get_active_pieces()

        for piece_id, piece in pieces.items():
            # Apply gravity
            piece.velocity = (
                piece.velocity[0],
                piece.velocity[1] - physics_config.gravity * dt,
                piece.velocity[2]
            )

            # Apply damping
            piece.velocity = (
                piece.velocity[0] * physics_config.velocity_damping,
                piece.velocity[1] * physics_config.velocity_damping,
                piece.velocity[2] * physics_config.velocity_damping
            )

            # Update position
            piece.position = (
                piece.position[0] + piece.velocity[0] * dt,
                piece.position[1] + piece.velocity[1] * dt,
                piece.position[2] + piece.velocity[2] * dt
            )

    def _detect_collisions(self) -> None:
        """Detect collisions between pieces using broad and narrow phase."""
        pieces = self.game_state.get_active_pieces()
        piece_ids = list(pieces.keys())

        # Broad phase: spatial hashing or bounding volume hierarchies
        # For simplicity, we'll check all pairs (O(n^2)) but limit to active pieces
        self.broad_pairs.clear()

        for i in range(len(piece_ids)):
            for j in range(i + 1, len(piece_ids)):
                id_a = piece_ids[i]
                id_b = piece_ids[j]
                piece_a = pieces[id_a]
                piece_b = pieces[id_b]

                # Quick bounding sphere check
                if self._bounding_spheres_overlap(piece_a, piece_b):
                    self.broad_pairs.append((id_a, id_b))

        # Narrow phase: precise collision detection
        self.collision_events.clear()
        for id_a, id_b in self.broad_pairs:
            piece_a = pieces[id_a]
            piece_b = pieces[id_b]

            collision = self._check_piece_collision(piece_a, piece_b)
            if collision:
                self.collision_events.append(collision)

    def _bounding_spheres_overlap(self, piece_a: Piece, piece_b: Piece) -> bool:
        """
        Check if two pieces' bounding spheres overlap.

        Args:
            piece_a: First piece
            piece_b: Second piece

        Returns:
            bool: True if bounding spheres overlap
        """
        # Get piece sizes from config
        size_a = self._get_piece_size(piece_a.piece_type)
        size_b = self._get_piece_size(piece_b.piece_type)

        # Calculate distance between centers
        dx = piece_a.position[0] - piece_b.position[0]
        dy = piece_a.position[1] - piece_b.position[1]
        dz = piece_a.position[2] - piece_b.position[2]
        distance_squared = dx*dx + dy*dy + dz*dz

        # Check if distance is less than sum of radii
        radius_sum = size_a + size_b
        return distance_squared < (radius_sum * radius_sum)

    def _get_piece_size(self, piece_type: str) -> float:
        """
        Get the size/radius of a piece type.

        Args:
            piece_type: Type of piece

        Returns:
            float: Size of the piece
        """
        # Default size if piece type not found
        default_size = 0.5
        return piece_config.piece_types.get(piece_type, {}).get("size", default_size)

    def _check_piece_collision(self, piece_a: Piece, piece_b: Piece) -> Optional[CollisionEvent]:
        """
        Check for collision between two pieces and return collision event if they collide.

        Args:
            piece_a: First piece
            piece_b: Second piece

        Returns:
            Optional[CollisionEvent]: Collision event if pieces collide, None otherwise
        """
        # Calculate relative position
        dx = piece_b.position[0] - piece_a.position[0]
        dy = piece_b.position[1] - piece_a.position[1]
        dz = piece_b.position[2] - piece_a.position[2]

        # Calculate distance
        distance = math.sqrt(dx*dx + dy*dy + dz*dz)

        # Get piece sizes
        size_a = self._get_piece_size(piece_a.piece_type)
        size_b = self._get_piece_size(piece_b.piece_type)
        size_sum = size_a + size_b

        # Check if pieces are overlapping
        if distance >= size_sum:
            return None

        # Calculate collision normal (normalized direction from A to B)
        if distance > 0:
            nx = dx / distance
            ny = dy / distance
            nz = dz / distance
        else:
            # Pieces are exactly overlapping - choose arbitrary normal
            nx, ny, nz = 1.0, 0.0, 0.0

        # Calculate penetration depth
        penetration = size_sum - distance

        # Calculate relative velocity at collision point
        # For simplicity, we'll use center-of-mass relative velocity
        dvx = piece_b.velocity[0] - piece_a.velocity[0]
        dvy = piece_b.velocity[1] - piece_a.velocity[1]
        dvz = piece_b.velocity[2] - piece_a.velocity[2]

        # Only consider collisions where pieces are moving toward each other
        # (dot product of relative velocity and normal should be negative)
        velocity_along_normal = dvx*nx + dvy*ny + dvz*nz
        if velocity_along_normal > 0:  # Moving away from each other
            return None

        # Create collision event
        collision = CollisionEvent(
            piece_a_id=piece_a.id,
            piece_b_id=piece_b.id,
            position=(
                piece_a.position[0] + nx * size_a,
                piece_a.position[1] + ny * size_a,
                piece_a.position[2] + nz * size_a
            ),
            normal=(nx, ny, nz),
            penetration=penetration,
            relative_velocity=(dvx, dvy, dvz)
        )

        return collision

    def _resolve_collisions(self) -> None:
        """Resolve all detected collisions using impulse-based resolution."""
        for collision in self.collision_events:
            self._resolve_collision(collision)

    def _resolve_collision(self, collision: CollisionEvent) -> None:
        """
        Resolve a single collision using impulse-based resolution.

        Args:
            collision: Collision event to resolve
        """
        pieces = self.game_state.get_active_pieces()
        piece_a = pieces.get(collision.piece_a_id)
        piece_b = pieces.get(collision.piece_b_id)

        if not piece_a or not piece_b:
            return

        # Get masses
        mass_a = self._get_piece_mass(piece_a.piece_type)
        mass_b = self._get_piece_mass(piece_b.piece_type)

        # Calculate relative velocity
        rvx = collision.relative_velocity[0]
        rvy = collision.relative_velocity[1]
        rvz = collision.relative_velocity[2]

        # Calculate relative velocity in terms of the normal
        velocity_along_normal = (
            rvx * collision.normal[0] +
            rvy * collision.normal[1] +
            rvz * collision.normal[2]
        )

        # Do not resolve if velocities are separating
        if velocity_along_normal > 0:
            return

        # Calculate restitution (bounciness)
        restitution = min(
            self._get_piece_restitution(piece_a.piece_type),
            self._get_piece_restitution(piece_b.piece_type)
        )

        # Calculate impulse scalar
        impulse_magnitude = -(1 + restitution) * velocity_along_normal
        impulse_magnitude /= (1/mass_a + 1/mass_b)

        # Apply impulse
        impulse_x = impulse_magnitude * collision.normal[0]
        impulse_y = impulse_magnitude * collision.normal[1]
        impulse_z = impulse_magnitude * collision.normal[2]

        # Apply impulse to pieces
        piece_a.velocity = (
            piece_a.velocity[0] - impulse_x / mass_a,
            piece_a.velocity[1] - impulse_y / mass_a,
            piece_a.velocity[2] - impulse_z / mass_a
        )

        piece_b.velocity = (
            piece_b.velocity[0] + impulse_x / mass_b,
            piece_b.velocity[1] + impulse_y / mass_b,
            piece_b.velocity[2] + impulse_z / mass_b
        )

        # Apply positional correction to prevent sinking
        percent = 0.2  # Usually 20% to 80%
        slop = 0.01    # Usually 0.01 to 0.1
        correction_magnitude = max(collision.penetration - slop, 0.0) / (1/mass_a + 1/mass_b) * percent

        correction_x = correction_magnitude * collision.normal[0]
        correction_y = correction_magnitude * collision.normal[1]
        correction_z = correction_magnitude * collision.normal[2]

        piece_a.position = (
            piece_a.position[0] - correction_x * (1/mass_a),
            piece_a.position[1] - correction_y * (1/mass_a),
            piece_a.position[2] - correction_z * (1/mass_a)
        )

        piece_b.position = (
            piece_b.position[0] + correction_x * (1/mass_b),
            piece_b.position[1] + correction_y * (1/mass_b),
            piece_b.position[2] + correction_z * (1/mass_b)
        )

        # Play collision sound effect
        if self.audio_manager and self.audio_manager.is_initialized:
            self.audio_manager.play_sound_effect("collision")

    def _get_piece_mass(self, piece_type: str) -> float:
        """
        Get the mass of a piece type.

        Args:
            piece_type: Type of piece

        Returns:
            float: Mass of the piece
        """
        default_mass = physics_config.default_mass
        return piece_config.piece_types.get(piece_type, {}).get("mass", default_mass)

    def _get_piece_restitution(self, piece_type: str) -> float:
        """
        Get the restitution (bounciness) of a piece type.

        Args:
            piece_type: Type of piece

        Returns:
            float: Restitution of the piece (0.0 to 1.0)
        """
        default_restitution = physics_config.default_restitution
        return piece_config.piece_types.get(piece_type, {}).get("restitution", default_restitution)

    def _update_game_state(self) -> None:
        """Update the game state with new positions and velocities from physics simulation."""
        # The game state is already updated directly in _integrate_forces and _resolve_collision
        # since we're modifying the Piece objects directly
        pass

    def get_collision_events(self) -> List[CollisionEvent]:
        """
        Get the collision events from the last update.

        Returns:
            List[CollisionEvent]: Copy of collision events
        """
        return self.collision_events.copy()

    def cleanup(self) -> None:
        """Clean up physics engine resources."""
        self.logger.info("physics_engine_cleaning_up")
        self.is_initialized = False
        self.collision_events.clear()
        self.broad_pairs.clear()

    def is_ready(self) -> bool:
        """Check if physics engine is ready."""
        return self.is_initialized


if __name__ == "__main__":
    # For testing purposes
    print("PhysicsEngine module loaded successfully")