"""
UI Manager for Archess game.
Coordinates rendering, input, and applies comprehensive UI/UX best practices.
Implements all 10 priorities from UI/UX Pro Max skill.
"""
from __future__ import annotations

import time
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from archess.app.core.game_state import GameStateManager, GameState
from archess.app.rendering.renderer import Renderer, Colors, Typography, AccessibilityUtils
from archess.app.input.handler import InputHandler, InputAction, InputType
from archess.app.bootstrap.logging import get_logger
from archess.app.config import game_config
from archess.app.audio.manager import AudioManager
import subprocess
import os


@dataclass
class UIState:
    """Current state of the UI system."""
    last_update: float = 0.0
    needs_redraw: bool = True
    show_debug: bool = False
    paused: bool = False


class UIManager:
    """
    Manages the UI system applying all UI/UX Pro Max priorities.
    Coordinates rendering and input systems.
    """

    def __init__(self, width: int = game_config.window_width, height: int = game_config.window_height):
        self.logger = get_logger()
        self.width = width
        self.height = height
        self.is_initialized = False

        # Initialize subsystems
        self.renderer = Renderer(width, height)
        self.input_handler = InputHandler(width, height)
        self.game_state: Optional[GameStateManager] = None
        self.audio_manager: Optional[AudioManager] = None

        # UI state
        self.ui_state = UIState()

        # Performance tracking
        self.frame_times: List[float] = []
        self.max_frame_history = 60  # Keep last 60 frames (~1 second at 60fps)

        # Accessibility state
        self.accessibility_menu_open = False

        self.logger.info(
            "ui_manager_initialized",
            width=width,
            height=height
        )

    def initialize(self, game_state: GameStateManager, audio_manager: AudioManager) -> bool:
        """
        Initialize the UI manager.

        Args:
            game_state: Game state manager to coordinate with
            audio_manager: Audio manager for sound effects

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("ui_manager_initializing")

            self.game_state = game_state
            self.audio_manager = audio_manager

            # Initialize subsystems
            if not self.renderer.initialize():
                return False

            if not self.input_handler.initialize():
                return False

            # Set up input callbacks
            self._setup_input_callbacks()

            self.is_initialized = True
            self.ui_state.last_update = time.time()
            self.logger.info("ui_manager_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "ui_manager_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def _setup_input_callbacks(self) -> None:
        """Set up input action callbacks."""
        # Game actions
        self.input_handler.register_action_callback(
            InputAction.SELECT_PIECE, self._on_select_piece
        )
        self.input_handler.register_action_callback(
            InputAction.START_DRAG, self._on_start_drag
        )
        self.input_handler.register_action_callback(
            InputAction.UPDATE_DRAG, self._on_update_drag
        )
        self.input_handler.register_action_callback(
            InputAction.END_DRAG, self._on_end_drag
        )
        self.input_handler.register_action_callback(
            InputAction.LAUNCH_PIECE, self._on_launch_piece
        )

        # Menu actions
        self.input_handler.register_action_callback(
            InputAction.OPEN_MENU, self._on_open_menu
        )
        self.input_handler.register_action_callback(
            InputAction.CLOSE_MENU, self._on_close_menu
        )
        self.input_handler.register_action_callback(
            InputAction.PAUSE_GAME, self._on_pause_game
        )
        self.input_handler.register_action_callback(
            InputAction.RESUME_GAME, self._on_resume_game
        )
        self.input_handler.register_action_callback(
            InputAction.RESTART_GAME, self._on_restart_game
        )

        # Menu actions
        self.input_handler.register_action_callback(
            InputAction.START_GAME, self._on_start_game
        )
        self.input_handler.register_action_callback(
            InputAction.OPTIONS, self._on_options
        )
        self.input_handler.register_action_callback(
            InputAction.QUIT, self._on_quit
        )

        # Accessibility actions
        self.input_handler.register_action_callback(
            InputAction.TOGGLE_HIGH_CONTRAST, self._on_toggle_high_contrast
        )
        self.input_handler.register_action_callback(
            InputAction.TOGGLE_LARGE_TEXT, self._on_toggle_large_text
        )
        # Knowledge graph action
        self.input_handler.register_action_callback(
            InputAction.GENERATE_KNOWLEDGE_GRAPH, self._on_generate_knowledge_graph
        )

    def update_and_render(self, delta_time: float, input_handler: Optional[InputHandler] = None) -> None:
        """
        Update and render the UI for one frame.

        Args:
            delta_time: Time since last frame in seconds
            input_handler: Optional input handler for tracking cursor
        """
        if not self.is_initialized or self.game_state is None:
            self.logger.warning("ui_not_initialized")
            return

        # Update UI state
        self.ui_state.last_update += delta_time
        self.ui_state.needs_redraw = True

        # Process input using the provided input handler (or fall back to our own)
        effective_input_handler = input_handler if input_handler is not None else self.input_handler
        actions = effective_input_handler.process_input(self.game_state)
        self._process_ui_actions(actions)

        # Render frame
        self.renderer.render_frame(self.game_state, effective_input_handler)

        # Track performance
        self._track_frame_performance(delta_time)

    def _process_ui_actions(self, actions: List[InputAction]) -> None:
        """Process UI actions and update game state accordingly."""
        for action in actions:
            self.logger.debug(
                "ui_action_processed",
                action=action.value
            )
            # Execute the callback for this action if it exists
            if action in self.input_handler.action_callbacks:
                for callback in self.input_handler.action_callbacks[action]:
                    try:
                        callback()
                    except Exception as e:
                        self.logger.error(
                            "ui_action_callback_error",
                            action=action.value,
                            error=str(e),
                            callback=callback.__name__ if hasattr(callback, '__name__') else str(callback)
                        )

    # Input action callbacks
    def _on_select_piece(self) -> None:
        """Handle piece selection."""
        # TODO: Implement piece selection logic
        self.logger.debug("piece_selected")

    def _on_start_drag(self) -> None:
        """Handle start of drag gesture."""
        # TODO: Implement drag start logic
        self.logger.debug("drag_started")

    def _on_update_drag(self) -> None:
        """Handle drag update."""
        # TODO: Implement drag update logic
        self.logger.debug("drag_updated")

    def _on_end_drag(self) -> None:
        """Handle end of drag gesture."""
        # TODO: Implement drag end logic
        self.logger.debug("drag_ended")

    def _on_launch_piece(self) -> None:
        """Handle piece launch."""
        if not self.game_state:
            return

        # Only allow launching if game is running
        if self.game_state.get_game_state() != GameState.RUNNING:
            return

        # Get current player
        current_player = self.game_state.get_current_player()
        # Get all active pieces and filter by player
        all_active = self.game_state.get_active_pieces()
        player_pieces = {
            pid: piece for pid, piece in all_active.items()
            if piece.player_id == current_player
        }

        if not player_pieces:
            self.logger.warning("no_active_pieces_to_launch", player_id=current_player)
            return

        # Select the first piece to launch (could be improved to select based on UI)
        piece_id, piece = next(iter(player_pieces.items()))

        # Determine launch direction based on player
        # Player 0 (left) launches towards positive X
        # Player 1 (right) launches towards negative X
        launch_speed = 10.0  # units per second
        if current_player == 0:
            velocity = (launch_speed, 0.0, 0.0)
        else:
            velocity = (-launch_speed, 0.0, 0.0)

        # Apply velocity to the piece
        piece.velocity = velocity

        # Update game state statistics
        self.game_state.stats.pieces_launched += 1

        # Record the launch event
        self.game_state.update_tracker.record_update(
            event_type="piece_launched",
            game_id=self.game_state.get_game_id(),
            turn=self.game_state.get_current_turn(),
            entity_id=piece_id,
            old_value={"velocity": (0.0, 0.0, 0.0)},
            new_value={"velocity": velocity},
            metadata={"launcher_player": current_player}
        )

        self.logger.info(
            "piece_launched_via_input",
            piece_id=piece_id,
            piece_type=piece.piece_type,
            player_id=current_player,
            velocity=velocity
        )

    def _on_open_menu(self) -> None:
        """Handle menu open."""
        if self.game_state:
            # Only change to menu if not already in menu or game over
            current_state = self.game_state.get_game_state()
            if current_state not in [
                GameState.MENU,
                GameState.GAME_OVER
            ]:
                # Actually change game state to menu
                self.game_state.state = GameState.MENU
                self.logger.debug("menu_opened")

    def _on_close_menu(self) -> None:
        """Handle menu close."""
        # When closing menu, go back to running state
        if self.game_state:
            self.game_state.state = GameState.RUNNING
        self.logger.debug("menu_closed")

    def _on_pause_game(self) -> None:
        """Handle game pause."""
        if self.game_state:
            current_state = self.game_state.get_game_state()
            if current_state == GameState.RUNNING:
                # Actually change game state to paused
                self.game_state.state = GameState.PAUSED
                self.ui_state.paused = True
                self.logger.debug("game_paused")

    def _on_resume_game(self) -> None:
        """Handle game resume."""
        if self.game_state and self.ui_state.paused:
            # Actually change game state to running
            self.game_state.state = GameState.RUNNING
            self.ui_state.paused = False
            self.logger.debug("game_resumed")

    def _on_restart_game(self) -> None:
        """Handle game restart."""
        if self.game_state:
            # Reset the game to initial state and then start running
            self.game_state.initialize_game()
        self.logger.debug("game_restarted")

    def _on_toggle_high_contrast(self) -> None:
        """Handle high contrast toggle."""
        new_mode = not self.renderer.high_contrast_mode
        self.renderer.set_high_contrast_mode(new_mode)
        self.logger.info(
            "accessibility_toggled",
            high_contrast_mode=new_mode
        )

    def _on_toggle_large_text(self) -> None:
        """Handle large text toggle."""
        new_mode = not self.renderer.large_text_mode
        self.renderer.set_large_text_mode(new_mode)
        self.logger.info(
            "accessibility_toggled",
            large_text_mode=new_mode
        )

    def _track_frame_performance(self, delta_time: float) -> None:
        """Track frame timing for performance analysis."""
        self.frame_times.append(delta_time)
        if len(self.frame_times) > self.max_frame_history:
            self.frame_times.pop(0)

        # Log average FPS periodically
        if len(self.frame_times) >= self.max_frame_history:
            avg_frame_time = sum(self.frame_times) / len(self.frame_times)
            avg_fps = 1.0 / avg_frame_time if avg_frame_time > 0 else 0
            if int(avg_fps) % 30 == 0:  # Log every 30 seconds
                self.logger.debug(
                    "ui_performance",
                    avg_fps=round(avg_fps, 1),
                    frame_count=len(self.frame_times)
                )

    # Input action callbacks for menu buttons
    def _on_start_game(self) -> None:
        """Handle start game button click."""
        if self.game_state:
            # Change state from MENU to RUNNING to start the game
            if self.game_state.get_game_state() == GameState.MENU:
                self.game_state.state = GameState.RUNNING
                # Play menu click sound
                if self.audio_manager:
                    self.audio_manager.play_sound_effect("menu_click")
                self.logger.info("game_started_via_menu_button")
            else:
                self.logger.debug("start_game_ignored", current_state=self.game_state.get_game_state().name)

    def _on_options(self) -> None:
        """Handle options button click - switch to options menu."""
        if self.game_state:
            # Change state from MENU to OPTIONS
            if self.game_state.get_game_state() == GameState.MENU:
                self.game_state.state = GameState.OPTIONS
                # Play menu click sound
                if self.audio_manager:
                    self.audio_manager.play_sound_effect("menu_click")
                self.logger.info("options_menu_opened")
            else:
                self.logger.debug("options_button_ignored", current_state=self.game_state.get_game_state().name)

    def _on_toggle_3d(self) -> None:
        """Handle toggle 3D rendering option."""
        if self.game_state and self.game_state.get_game_state() == GameState.OPTIONS:
            if self.renderer:
                new_3d_setting = not self.renderer.use_3d_rendering
                self.renderer.set_3d_rendering(new_3d_setting)
                # Play menu click sound
                if self.audio_manager:
                    self.audio_manager.play_sound_effect("menu_click")
                self.logger.info(
                    "options_toggled_3d_rendering",
                    use_3d_rendering=new_3d_setting
                )
            else:
                self.logger.warning("options_toggle_3d_but_no_renderer")

    def _on_toggle_contrast(self) -> None:
        """Handle toggle high contrast option."""
        if self.game_state and self.game_state.get_game_state() == GameState.OPTIONS:
            new_mode = not self.renderer.high_contrast_mode
            self.renderer.set_high_contrast_mode(new_mode)
            # Play menu click sound
            if self.audio_manager:
                self.audio_manager.play_sound_effect("menu_click")
            self.logger.info(
                "options_toggled_high_contrast",
                high_contrast_mode=new_mode
            )

    def _on_toggle_large_text(self) -> None:
        """Handle toggle large text option."""
        if self.game_state and self.game_state.get_game_state() == GameState.OPTIONS:
            new_mode = not self.renderer.large_text_mode
            self.renderer.set_large_text_mode(new_mode)
            # Play menu click sound
            if self.audio_manager:
                self.audio_manager.play_sound_effect("menu_click")
            self.logger.info(
                "options_toggled_large_text",
                large_text_mode=new_mode
            )

    def _on_back_to_main_menu(self) -> None:
        """Handle back to main menu option."""
        if self.game_state:
            # Change state from OPTIONS to MENU
            if self.game_state.get_game_state() == GameState.OPTIONS:
                self.game_state.state = GameState.MENU
                # Play menu click sound
                if self.audio_manager:
                    self.audio_manager.play_sound_effect("menu_click")
                self.logger.info("back_to_main_menu")
            else:
                self.logger.debug("back_button_ignored", current_state=self.game_state.get_game_state().name)

    def _on_quit(self) -> None:
        """Handle quit button click."""
        # Play menu click sound
        if self.audio_manager:
            self.audio_manager.play_sound_effect("menu_click")

        self.logger.info("quit_button_clicked")
        # In a real game, this would quit the application
        # For now, we'll just log it

    def _on_generate_knowledge_graph(self) -> None:
        """Handle generate knowledge graph button click."""
        if not self.game_state:
            return

        self.logger.info("knowledge_generation_started")
        project_root = "C:\\Users\\mohda\\Archess"

        # Check if graphify-out exists and has graph.json
        graphify_out = os.path.join(project_root, "graphify-out")
        graph_json = os.path.join(graphify_out, "graph.json")

        if os.path.exists(graph_json):
            self.logger.info("knowledge_graph_already_exists", path=graph_json)
        else:
            self.logger.info("generating_knowledge_graph")
            # Run graphify in the background
            try:
                subprocess.Popen(
                    ["graphify", project_root, "--no-viz", "--update"],
                    cwd=project_root,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                self.logger.info("knowledge_graph_generation_started")
            except Exception as e:
                self.logger.error("knowledge_graph_generation_failed", error=str(e))

    def set_debug_visible(self, visible: bool) -> None:
        """
        Set whether debug information should be visible.

        Args:
            visible: True to show debug info
        """
        self.ui_state.show_debug = visible
        self.logger.debug(
            "ui_debug_visibility_changed",
            visible=visible
        )

    def get_accessibility_status(self) -> Dict[str, bool]:
        """
        Get current accessibility settings status.

        Returns:
            Dict: Status of accessibility features
        """
        return {
            "high_contrast_mode": self.renderer.high_contrast_mode,
            "large_text_mode": self.renderer.large_text_mode,
            "screen_reader_available": self.input_handler.screen_reader_available,
            "keyboard_navigation_enabled": self.input_handler.keyboard_navigation_enabled
        }

    def cleanup(self) -> None:
        """Clean up UI manager resources."""
        self.logger.info("ui_manager_cleaning_up")
        if self.renderer:
            self.renderer.cleanup()
        if self.input_handler:
            self.input_handler.cleanup()
        self.is_initialized = False

    def is_ready(self) -> bool:
        """Check if UI manager is ready."""
        return (self.is_initialized and
                self.renderer.is_ready() and
                self.input_handler.is_ready() and
                self.game_state is not None)