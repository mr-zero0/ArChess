"""
Unit tests for Archess configuration system.
"""
import sys
import os

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.config import (
    GameConfig,
    PhysicsConfig,
    CombatConfig,
    PieceConfig,
    AudioConfig,
    game_config,
    physics_config,
    combat_config,
    piece_config,
    audio_config
)


def test_game_config_defaults():
    """Test that GameConfig has correct default values."""
    config = GameConfig()

    assert config.window_width == 1280
    assert config.window_height == 720
    assert config.window_title == "Archess"
    assert config.target_fps == 60
    assert config.max_turns == 100
    assert config.pieces_per_player == 16


def test_physics_config_defaults():
    """Test that PhysicsConfig has correct default values."""
    config = PhysicsConfig()

    assert config.gravity == 9.81
    assert config.velocity_damping == 0.98
    assert config.angular_damping == 0.95
    assert config.collision_threshold == 0.01
    assert config.max_collision_iterations == 8
    assert config.default_mass == 1.0
    assert config.default_restitution == 0.3
    assert config.default_friction == 0.5


def test_combat_config_defaults():
    """Test that CombatConfig has correct default values."""
    config = CombatConfig()

    assert config.base_damage_multiplier == 1.0
    assert config.velocity_damage_factor == 0.1
    assert config.min_impact_for_damage == 2.0
    assert config.knockback_multiplier == 0.5
    assert config.max_knockback_velocity == 20.0


def test_piece_config_defaults():
    """Test that PieceConfig has correct default values."""
    config = PieceConfig()

    assert config.king_hp == 100
    assert config.king_mass == 2.0
    assert config.piece_hp == 50
    assert config.piece_mass == 1.0

    # Check piece types
    assert "king" in config.piece_types
    assert "queen" in config.piece_types
    assert "rook" in config.piece_types
    assert "bishop" in config.piece_types
    assert "knight" in config.piece_types
    assert "pawn" in config.piece_types

    # Check king piece type config
    king_config = config.piece_types["king"]
    assert king_config["hp"] == 100
    assert king_config["mass"] == 2.0
    assert king_config["size"] == 1.5


def test_audio_config_defaults():
    """Test that AudioConfig has correct default values."""
    config = AudioConfig()

    assert config.master_volume == 0.8
    assert config.sfx_volume == 0.7
    assert config.music_volume == 0.5
    assert config.enable_audio == True


def test_global_config_instances():
    """Test that global config instances are properly created."""
    # Test that we can access the global instances
    assert isinstance(game_config, GameConfig)
    assert isinstance(physics_config, PhysicsConfig)
    assert isinstance(combat_config, CombatConfig)
    assert isinstance(piece_config, PieceConfig)
    assert isinstance(audio_config, AudioConfig)

    # Test that they have the expected default values
    assert game_config.window_width == 1280
    assert physics_config.gravity == 9.81
    assert combat_config.base_damage_multiplier == 1.0
    assert piece_config.king_hp == 100
    assert audio_config.enable_audio == True


def test_config_modification():
    """Test that configuration values can be modified."""
    config = GameConfig()

    # Modify values
    config.window_width = 1920
    config.window_height = 1080
    config.target_fps = 144

    # Check that modifications took effect
    assert config.window_width == 1920
    assert config.window_height == 1080
    assert config.target_fps == 144

    # Ensure other values are unchanged
    assert config.window_title == "Archess"
    assert config.max_turns == 100


if __name__ == "__main__":
    # Run tests
    test_game_config_defaults()
    test_physics_config_defaults()
    test_combat_config_defaults()
    test_piece_config_defaults()
    test_audio_config_defaults()
    test_global_config_instances()
    test_config_modification()

    print("All configuration tests passed!")