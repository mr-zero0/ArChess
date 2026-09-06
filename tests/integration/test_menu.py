#!/usr/bin/env python3
"""
Test script to verify menu functionality works by simulating mouse clicks.
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
from archess.app.audio.manager import AudioManager

def test_menu_functionality():
    """Test that menu buttons work correctly."""
    # Setup logging
    setup_logging()
    logger = get_logger()

    logger.info("menu_functionality_test_starting")

    # Initialize game state
    game_state = GameStateManager()
    if not game_state.initialize_game():
        logger.error("failed to initialize game state")
        return False

    # Verify initial state is MENU
    initial_state = game_state.get_game_state()
    logger.info(f"initial_game_state: {initial_state}")
    from archess.app.core.game_state import GameState
    if initial_state != GameState.MENU:
        logger.error(f"expected initial state to be MENU, got {initial_state}")
        return False

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

    logger.info("all_systems_initialized_for_menu_test")

    # Simulate a mouse click on the Start Game button
    # Calculate where the Start Game button should be
    button_width = 240
    button_height = 60
    button_spacing = 25

    start_x = (game_config.window_width - button_width) // 2
    start_y = (game_config.window_height - (3 * button_height + 2 * button_spacing)) // 2

    # Click position: center of the Start Game button (first button)
    click_x = start_x + button_width // 2
    click_y = start_y + button_height // 2

    logger.info(f"simulating mouse click at ({click_x}, {click_y}) - should be Start Game button")

    # Simulate mouse button press and release
    input_handler.simulate_mouse_button_press(1, click_x, click_y)  # Left button
    input_handler.simulate_mouse_button_release(1, click_x, click_y)  # Left button

    # Process input to see what actions are generated
    input_actions = input_handler.process_input(game_state)
    logger.info(f"input_actions_generated: {[action.value for action in input_actions]}")

    # Execute UI manager callbacks for actions
    ui_manager._process_ui_actions(input_actions)

    # Check if game state changed to RUNNING
    new_state = game_state.get_game_state()
    logger.info(f"game_state_after_click: {new_state}")

    from archess.app.core.game_state import GameState
    if new_state == GameState.RUNNING:
        logger.info("SUCCESS: Menu click correctly transitioned game from MENU to RUNNING")
        return True
    else:
        logger.error(f"FAILED: Expected RUNNING state, got {new_state}")
        return False

def main():
    """Run the menu functionality test."""
    try:
        success = test_menu_functionality()
        if success:
            print("\nPASS: Menu functionality test PASSED")
            return 0
        else:
            print("\nFAIL: Menu functionality test FAILED")
            return 1
    except Exception as e:
        print(f"\nERROR: Menu functionality test ERROR: {e}")
        return 1

if __name__ == "__main__":
    result = main()
    sys.exit(result)