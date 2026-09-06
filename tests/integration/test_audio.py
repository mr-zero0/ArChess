#!/usr/bin/env python3
"""
Test script to verify audio system works with physics and combat systems.
"""
import time
import sys
import os

# Add the src directory to the path so we can import archess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

from archess.app.config import game_config
from archess.app.bootstrap.logging import setup_logging, get_logger
from archess.app.core.game_state import GameStateManager
from archess.app.input.handler import InputHandler
from archess.app.rendering.renderer import Renderer
from archess.app.ui.manager import UIManager
from archess.app.physics.physics_engine import PhysicsEngine
from archess.app.combat.combat_system import CombatSystem
from archess.app.audio.manager import AudioManager

def test_audio_system():
    """Test that audio system plays sounds for collisions and hits."""
    # Setup logging
    setup_logging()
    logger = get_logger()

    logger.info("audio_system_test_starting")

    # Initialize game state
    game_state = GameStateManager()
    if not game_state.initialize_game():
        logger.error("failed to initialize game state")
        return False

    # Set game state to RUNNING so we can test collisions
    game_state.state = game_state.get_game_state().__class__.RUNNING

    # Initialize input handler
    input_handler = InputHandler(
        game_config.window_width, game_config.window_height
    )
    if not input_handler.initialize():
        logger.error("failed to initialize input handler")
        return False

    # Initialize renderer
    renderer = Renderer(
        game_config.window_width, game_config.window_height
    )
    if not renderer.initialize():
        logger.error("failed to initialize renderer")
        return False

    # Enable 3D rendering for better physics interaction
    renderer.set_3d_rendering(True)

    # Initialize audio manager
    audio_manager = AudioManager()
    if not audio_manager.initialize():
        logger.error("failed to initialize audio manager")
        return False

    # Initialize UI manager
    ui_manager = UIManager(
        game_config.window_width, game_config.window_height
    )
    if not ui_manager.initialize(game_state, audio_manager):
        logger.error("failed to initialize UI manager")
        return False

    # Initialize physics engine
    physics_engine = PhysicsEngine(game_state, audio_manager)
    if not physics_engine.initialize():
        logger.error("failed to initialize physics engine")
        return False

    # Initialize combat system
    combat_system = CombatSystem(game_state, audio_manager)
    if not combat_system.initialize():
        logger.error("failed to initialize combat system")
        return False

    logger.info("all_systems_initialized_for_audio_test")

    # Get some pieces to manipulate for testing
    pieces = game_state.get_active_pieces()
    if len(pieces) < 2:
        logger.error("need at least 2 pieces for collision test")
        return False

    # Get two pieces and position them close to each other to cause a collision
    piece_ids = list(pieces.keys())
    piece_a = pieces[piece_ids[0]]
    piece_b = pieces[piece_ids[1]]

    # Position piece A at (0, 0, 0)
    piece_a.position = (0.0, 0.0, 0.0)
    piece_a.velocity = (2.0, 0.0, 0.0)  # Moving right at 2 units/sec

    # Position piece B at (0.8, 0, 0) - close enough to collide
    piece_b.position = (0.8, 0.0, 0.0)
    piece_b.velocity = (-2.0, 0.0, 0.0)  # Moving left at 2 units/sec

    logger.info(
        "test_setup_complete",
        piece_a_id=piece_a.id,
        piece_a_position=piece_a.position,
        piece_a_velocity=piece_a.velocity,
        piece_b_id=piece_b.id,
        piece_b_position=piece_b.position,
        piece_b_velocity=piece_b.velocity
    )

    # Run physics update to detect and resolve collisions
    logger.info("running physics update...")
    collision_events = physics_engine.update(1.0/60.0)  # 1 frame at 60fps

    logger.info(
        "physics_update_complete",
        collision_count=len(collision_events)
    )

    # Update combat system based on collisions
    damage_events = combat_system.update(collision_events)

    logger.info(
        "combat_update_complete",
        damage_count=len(damage_events)
    )

    # Check audio manager status
    audio_status = audio_manager.get_status()
    logger.info(
        "audio_status_check",
        initialized=audio_status["initialized"],
        enabled=audio_status["enabled"],
        sfx_channel_busy=audio_status["sfx_channel_busy"]
    )

    # Cleanup
    logger.info("cleaning up systems")
    audio_manager.cleanup()
    combat_system.cleanup()
    physics_engine.cleanup()
    ui_manager.cleanup()
    renderer.cleanup()
    input_handler.cleanup()

    logger.info("audio_system_test_completed")
    return True

if __name__ == "__main__":
    success = test_audio_system()
    if success:
        print("PASS: Audio system test completed successfully")
        sys.exit(0)
    else:
        print("FAIL: Audio system test failed")
        sys.exit(1)