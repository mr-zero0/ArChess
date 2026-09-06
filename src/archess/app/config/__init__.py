"""
Configuration module for Archess game.
Centralizes all configurable values as per production standards.
"""
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class GameConfig:
    """Game-wide configuration settings."""
    # Window settings
    window_width: int = 1280
    window_height: int = 720
    window_title: str = "Archess"
    target_fps: int = 60

    # Game settings
    max_turns: int = 100
    pieces_per_player: int = 16


@dataclass
class PhysicsConfig:
    """Physics engine configuration."""
    # Basic physics
    gravity: float = 9.81
    velocity_damping: float = 0.98
    angular_damping: float = 0.95

    # Collision settings
    collision_threshold: float = 0.01
    max_collision_iterations: int = 8

    # Piece properties
    default_mass: float = 1.0
    default_restitution: float = 0.3
    default_friction: float = 0.5


@dataclass
class CombatConfig:
    """Combat system configuration."""
    # Damage settings
    base_damage_multiplier: float = 1.0
    velocity_damage_factor: float = 0.1
    min_impact_for_damage: float = 2.0

    # Knockback settings
    knockback_multiplier: float = 0.5
    max_knockback_velocity: float = 20.0


@dataclass
class PieceConfig:
    """Piece-specific configuration."""
    # King piece settings
    king_hp: int = 100
    king_mass: float = 2.0

    # Regular piece settings
    piece_hp: int = 50
    piece_mass: float = 1.0

    # Piece types and their properties
    piece_types: ClassVar[dict] = {
        "king": {"hp": 100, "mass": 2.0, "size": 1.5},
        "queen": {"hp": 75, "mass": 1.8, "size": 1.3},
        "rook": {"hp": 60, "mass": 1.6, "size": 1.2},
        "bishop": {"hp": 50, "mass": 1.4, "size": 1.1},
        "knight": {"hp": 50, "mass": 1.2, "size": 1.0},
        "pawn": {"hp": 30, "mass": 1.0, "size": 0.9}
    }


@dataclass
class AudioConfig:
    """Audio system configuration."""
    master_volume: float = 0.8
    sfx_volume: float = 0.7
    music_volume: float = 0.5
    enable_audio: bool = True


# Global configuration instances
game_config = GameConfig()
physics_config = PhysicsConfig()
combat_config = CombatConfig()
piece_config = PieceConfig()
audio_config = AudioConfig()