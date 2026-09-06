#!/usr/bin/env python3
"""
Simple test for the AI Controller.
"""
import sys
import os
import time

# Add the src directory to the path so we can import archess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from archess.app.ai_controller import AIController, AIConfig
from archess.app.core.game_state import GameStateManager
from archess.app.bootstrap.logging import setup_logging, get_logger

def test_ai_controller_basic():
    """Test basic AI controller functionality."""
    # Setup logging
    setup_logging()
    logger = get_logger()

    logger.info("AI controller test starting")

    # Create game state
    game_state = GameStateManager()
    if not game_state.initialize_game():
        logger.error("Failed to initialize game state")
        return False

    # Create AI controller for player 1
    ai_config = AIConfig(
        difficulty="medium",
        reaction_time=0.1,  # Fast reaction for testing
        aggression=0.5,
        smart_launching=True
    )
    ai_controller = AIController(player_id=1, config=ai_config)

    if not ai_controller.initialize():
        logger.error("Failed to initialize AI controller")
        return False

    logger.info("AI controller initialized successfully")

    # Set game state to running and AI's turn
    game_state.state = game_state.get_game_state().RUNNING
    game_state.current_player = 1  # AI's turn
    game_state.turn_state = game_state.get_turn_state().PLAYER_SELECTING

    logger.info("Game state set to AI's turn")

    # Update AI controller several times to trigger a decision
    for i in range(20):
        ai_controller.update(game_state, 0.1)  # 0.1 seconds per update
        time.sleep(0.01)  # Small delay to allow thinking time to elapse

        # Check if AI has launched a piece
        if game_state.stats.pieces_launched > 0:
            logger.info(f"AI launched a piece after {i+1} updates!")
            break

    # Clean up
    ai_controller.cleanup()

    logger.info("AI controller test completed")
    return True

def main():
    """Run the test."""
    try:
        success = test_ai_controller_basic()
        if success:
            print("\nPASS: AI controller test PASSED")
            return 0
        else:
            print("\nFAIL: AI controller test FAILED")
            return 1
    except Exception as e:
        print(f"\nERROR: AI controller test ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    result = main()
    sys.exit(result)