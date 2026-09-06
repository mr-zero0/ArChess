"""
Application bootstrap for Archess game.
Handles initialization, configuration, and graceful shutdown.
"""
import sys
import signal
import asyncio
from typing import Optional

from archess.app.config import (
    game_config, physics_config, combat_config,
    piece_config, audio_config
)
from archess.app.bootstrap.logging import get_logger, setup_logging

# Subsystem imports
from archess.app.core.game_state import GameStateManager, GameState
from archess.app.input.handler import InputHandler
from archess.app.rendering.renderer import Renderer
from archess.app.ui.manager import UIManager
from archess.app.physics.physics_engine import PhysicsEngine
from archess.app.combat.combat_system import CombatSystem
from archess.app.pieces.piece_factory import PieceFactory
from archess.app.audio.manager import AudioManager
from archess.app.ai_controller import AIController, AIConfig


class ArchessApplication:
    """Main application class for Archess game."""

    def __init__(self):
        self.logger = get_logger()
        self.is_running = False
        self.shutdown_requested = False
        self._setup_signal_handlers()

    def _setup_signal_handlers(self) -> None:
        """Setup signal handlers for graceful shutdown."""
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        self.logger.info(
            "shutdown_signal_received",
            signal=signum,
            signal_name=signal.Signals(signum).name
        )
        self.request_shutdown()

    def initialize(self) -> bool:
        """
        Initialize the application and all subsystems.

        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            self.logger.info("application_initializing")
            # Test if game_config is accessible
            test_width = game_config.window_width
            test_height = game_config.window_height
            self.logger.info("game_config_access_test_passed", width=test_width, height=test_height)

            # Setup logging
            setup_logging()

            # Initialize game state manager (core systems)
            self.game_state = GameStateManager()
            if not self.game_state.initialize_game():
                self.logger.error("game_state_initialization_failed")
                return False

            # Initialize input system
            self.input_handler = InputHandler(
                game_config.window_width, game_config.window_height
            )
            if not self.input_handler.initialize():
                self.logger.error("input_handler_initialization_failed")
                return False

            # Initialize rendering system
            self.renderer = Renderer(
                game_config.window_width, game_config.window_height
            )
            if not self.renderer.initialize():
                self.logger.error("renderer_initialization_failed")
                return False

            # Initialize audio system
            self.audio_manager = AudioManager()
            if not self.audio_manager.initialize():
                self.logger.error("audio_manager_initialization_failed")
                return False

            # Initialize AI controller (Player 1 is AI in single-player mode)
            self.ai_controller = AIController(
                player_id=1,  # AI is player 1
                config=AIConfig(
                    difficulty="medium",
                    reaction_time=1.5,  # 1.5 seconds to think
                    aggression=0.6,
                    smart_launching=True
                )
            )
            if not self.ai_controller.initialize():
                self.logger.error("ai_controller_initialization_failed")
                return False

            # Initialize UI manager
            self.ui_manager = UIManager(
                game_config.window_width, game_config.window_height
            )
            if not self.ui_manager.initialize(self.game_state, self.audio_manager):
                self.logger.error("ui_manager_initialization_failed")
                return False

            # Initialize physics engine
            self.physics_engine = PhysicsEngine(self.game_state, self.audio_manager)
            if not self.physics_engine.initialize():
                self.logger.error("physics_engine_initialization_failed")
                return False

            # Initialize combat system
            self.combat_system = CombatSystem(self.game_state, self.audio_manager)
            if not self.combat_system.initialize():
                self.logger.error("combat_system_initialization_failed")
                return False

            # Initialize piece factory
            self.piece_factory = PieceFactory()
            # Piece factory doesn't need initialization

            self.logger.info("application_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "application_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def request_shutdown(self) -> None:
        """Request graceful shutdown of the application."""
        if not self.shutdown_requested:
            self.shutdown_requested = True
            self.logger.info("shutdown_requested")

    def is_shutdown_requested(self) -> bool:
        """Check if shutdown has been requested."""
        return self.shutdown_requested

    def _get_current_time(self) -> float:
        """Get current time in seconds."""
        import time
        return time.time()

    def _process_input(self, delta_time: float) -> None:
        """Process user input and update game state accordingly."""
        # Process input through the input handler
        input_actions = self.input_handler.process_input(self.game_state)

        # Execute corresponding UI manager callbacks
        self.ui_manager._process_ui_actions(input_actions)

    def _update_game_state(self, delta_time: float) -> None:
        """Update game state (turns, timers, etc.)."""
        # Update game timers and handle turn progression
        # Check if we should auto-advance turns based on game state
        if self.game_state.get_game_state() == GameState.RUNNING:
            # Check if all pieces have been launched or it's time to end turn
            # This is a simplified version - in a full game you'd have more sophisticated logic
            pass

    def _render_frame(self, delta_time: float) -> None:
        """Render a single frame."""
        # Delegate to UI manager which handles rendering
        self.ui_manager.update_and_render(delta_time)

    def _update_audio(self, delta_time: float) -> None:
        """Update audio system (placeholder for future implementation)."""
        # Audio system would go here
        # For now, it's a placeholder
        pass

    async def run(self) -> int:
        """
        Main application run loop.

        Returns:
            int: Exit code (0 for success)
        """
        if not self.initialize():
            self.logger.critical("application_initialization_failed")
            return 1

        self.logger.info("application_started")
        self.is_running = True

        try:
            # Main game loop
            last_time = self._get_current_time()
            while self.is_running and not self.is_shutdown_requested():
                # Calculate delta time
                current_time = self._get_current_time()
                delta_time = current_time - last_time
                last_time = current_time

                # Cap delta time to prevent spiral of death
                delta_time = min(delta_time, 0.1)

                # Process input
                self._process_input(delta_time)

                # Update physics engine
                collision_events = self.physics_engine.update(delta_time)

                # Update combat system based on physics collisions
                damage_events = self.combat_system.update(collision_events)

                # Update AI controller
                self.ai_controller.update(self.game_state, delta_time)

                # Update game state (turns, etc.)
                self._update_game_state(delta_time)

                # Render frame
                self._render_frame(delta_time)

                # Update audio system
                self.audio_manager.update(delta_time)

        except Exception as e:
            self.logger.error(
                "application_runtime_error",
                error=str(e),
                error_type=type(e).__name__
            )
            return 1
        finally:
            await self.shutdown()

        self.logger.info("application_shutdown_complete")
        return 0

    async def shutdown(self) -> None:
        """Perform graceful shutdown of all subsystems."""
        if not self.is_running:
            return

        self.logger.info("application_shutdown_started")
        self.is_running = False

        # Shutdown subsystems in reverse order of initialization
        if hasattr(self, 'audio_manager'):
            self.audio_manager.cleanup()

        if hasattr(self, 'ai_controller'):
            self.ai_controller.cleanup()

        if hasattr(self, 'piece_factory'):
            self.piece_factory.cleanup()

        if hasattr(self, 'combat_system'):
            self.combat_system.cleanup()

        if hasattr(self, 'physics_engine'):
            self.physics_engine.cleanup()

        if hasattr(self, 'ui_manager'):
            self.ui_manager.cleanup()

        if hasattr(self, 'renderer'):
            self.renderer.cleanup()

        if hasattr(self, 'input_handler'):
            self.input_handler.cleanup()

        if hasattr(self, 'game_state'):
            # Game state manager doesn't have a cleanup method yet, but we could add one
            pass

        self.logger.info("application_shutdown_finished")


def main() -> int:
    """Entry point for the Archess application."""
    app = ArchessApplication()

    # Run the application
    try:
        return asyncio.run(app.run())
    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        app.request_shutdown()
        return 0
    except Exception as e:
        # Log unexpected errors
        logger = get_logger()
        logger.error(
            "unexpected_application_error",
            error=str(e),
            error_type=type(e).__name__
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())