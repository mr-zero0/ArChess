#!/usr/bin/env python3
"""
Simple script to run the Archess game with simulated input to launch a piece.
"""
import time
import sys
import os

# Add the src directory to the path so we can import archess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from archess.app.config import game_config
from archess.app.bootstrap.logging import setup_logging, get_logger
from archess.app.core.game_state import GameStateManager
from archess.app.input.handler import InputHandler
from archess.app.rendering.renderer import Renderer
from archess.app.ui.manager import UIManager
from archess.app.physics.physics_engine import PhysicsEngine
from archess.app.combat.combat_system import CombatSystem
from archess.app.pieces.piece_factory import PieceFactory
from archess.app.audio.manager import AudioManager

def main():
    """Run the game simulation."""
    # Setup logging
    setup_logging()
    logger = get_logger()

    logger.info("game_simulation_starting")

    # Initialize game state
    game_state = GameStateManager()
    if not game_state.initialize_game():
        logger.error("failed to initialize game state")
        return 1

    # Initialize input handler
    input_handler = InputHandler(
        game_config.window_width, game_config.window_height
    )
    if not input_handler.initialize():
        logger.error("failed to initialize input handler")
        return 1

    # Initialize renderer
    renderer = Renderer(
        game_config.window_width, game_config.window_height
    )
    # Enable 3D rendering
    renderer.set_3d_rendering(True)
    if not renderer.initialize():
        logger.error("failed to initialize renderer")
        return 1

    # Initialize audio manager
    audio_manager = AudioManager()
    if not audio_manager.initialize():
        logger.error("failed to initialize audio manager")
        return 1

    # Initialize UI manager
    ui_manager = UIManager(
        game_config.window_width, game_config.window_height
    )
    if not ui_manager.initialize(game_state, audio_manager):
        logger.error("failed to initialize UI manager")
        return 1

    # Initialize physics engine
    physics_engine = PhysicsEngine(game_state, audio_manager)
    if not physics_engine.initialize():
        logger.error("failed to initialize physics engine")
        return 1

    # Initialize combat system
    combat_system = CombatSystem(game_state, audio_manager)
    if not combat_system.initialize():
        logger.error("failed to initialize combat system")
        return 1

    # Initialize piece factory (not needed but we'll keep it)
    piece_factory = PieceFactory()

    logger.info("all_systems_initialized")

    # Main loop variables
    last_time = time.time()
    running = True
    space_pressed_time = 2.0  # seconds after start to press space
    space_released_time = space_pressed_time + 0.1  # release after 0.1 seconds
    space_pressed = False

    try:
        while running:
            current_time = time.time()
            delta_time = current_time - last_time
            last_time = current_time

            # Cap delta time
            if delta_time > 0.1:
                delta_time = 0.1

            # Simulate space key press at the designated time
            if current_time >= space_pressed_time and not space_pressed:
                # Press space key (ASCII 32)
                input_handler.simulate_key_press(32)
                space_pressed = True
                logger.info("simulating space key press")

            if current_time >= space_released_time and space_pressed:
                # Release space key
                input_handler.simulate_key_release(32)
                space_pressed = False
                logger.info("simulating space key release")

            # Process input
            input_actions = input_handler.process_input(game_state)

            # Execute UI manager callbacks for actions
            ui_manager._process_ui_actions(input_actions)

            # Update physics
            collision_events = physics_engine.update(delta_time)

            # Update combat
            damage_events = combat_system.update(collision_events)

            # Update game state (turns, etc.)
            # We'll skip the game state update for simplicity, but we can call the app's method
            # For now, we'll just let the physics and combat update the pieces

            # Render frame
            ui_manager.update_and_render(delta_time, input_handler)

            # Log piece positions occasionally for debugging
            if int(current_time) % 2 == 0:  # Every 2 seconds
                active_pieces = game_state.get_active_pieces()
                logger.info(
                    "active_pieces_count",
                    count=len(active_pieces)
                )
                # Log the first piece's position if any
                if active_pieces:
                    first_piece = next(iter(active_pieces.values()))
                    logger.info(
                        "sample_piece_position",
                        piece_id=first_piece.id,
                        position=first_piece.position,
                        velocity=first_piece.velocity
                    )

            # Check for shutdown (we'll run for 10 seconds total)
            if current_time > 10.0:
                running = False

    except Exception as e:
        logger.error(
            "game_simulation_error",
            error=str(e),
            error_type=type(e).__name__
        )
        return 1
    finally:
        # Cleanup
        logger.info("cleaning up systems")
        piece_factory.cleanup()
        combat_system.cleanup()
        physics_engine.cleanup()
        ui_manager.cleanup()
        renderer.cleanup()
        input_handler.cleanup()
        # Game state manager doesn't have a cleanup method

    logger.info("game_simulation_finished")
    return 0

if __name__ == "__main__":
    sys.exit(main())