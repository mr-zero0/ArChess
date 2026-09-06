"""
Input handler for Archess game applying UI/UX best practices.
Implements Priority 1-2 from UI/UX Pro Max skill (Accessibility, Touch & Interaction).
"""
from __future__ import annotations

import enum
import os
import pygame
from typing import Dict, List, Optional, Callable, Tuple
from dataclasses import dataclass

from archess.app.core.game_state import GameStateManager, Piece, GameState
from archess.app.config import game_config
from archess.app.bootstrap.logging import get_logger


class InputType(enum.Enum):
    """Types of input events."""
    TOUCH_START = "touch_start"
    TOUCH_MOVE = "touch_move"
    TOUCH_END = "touch_end"
    KEY_DOWN = "key_down"
    KEY_UP = "key_up"
    MOUSE_DOWN = "mouse_down"
    MOUSE_MOVE = "mouse_move"
    MOUSE_UP = "mouse_up"
    WHEEL = "wheel"


class InputAction(enum.Enum):
    """Semantic input actions for game."""
    SELECT_PIECE = "select_piece"
    DESELECT_PIECE = "deselect_piece"
    START_DRAG = "start_drag"
    UPDATE_DRAG = "update_drag"
    END_DRAG = "end_drag"
    LAUNCH_PIECE = "launch_piece"
    OPEN_MENU = "open_menu"
    CLOSE_MENU = "close_menu"
    PAUSE_GAME = "pause_game"
    RESUME_GAME = "resume_game"
    RESTART_GAME = "restart_game"
    TOGGLE_HIGH_CONTRAST = "toggle_high_contrast"
    TOGGLE_LARGE_TEXT = "toggle_large_text"
    START_GAME = "start_game"
    OPTIONS = "options"
    QUIT = "quit"
    TOGGLE_3D = "toggle_3d"
    TOGGLE_CONTRAST = "toggle_contrast"
    TOGGLE_LARGE_TEXT_MENU = "toggle_large_text_menu"
    BACK_TO_MAIN_MENU = "back_to_main_menu"
    GENERATE_KNOWLEDGE_GRAPH = "generate_knowledge_graph"


@dataclass
class InputEvent:
    """Input event with positional and semantic data."""
    input_type: InputType
    action: Optional[InputAction] = None
    position: Optional[Tuple[int, int]] = None  # Screen coordinates
    delta: Optional[Tuple[float, float]] = None  # For movement/wheel
    key_code: Optional[int] = None
    modifiers: List[str] = None  # Shift, Ctrl, Alt, etc.
    timestamp: float = 0.0
    processed: bool = False

    def __post_init__(self):
        if self.modifiers is None:
            self.modifiers = []
        if self.timestamp == 0.0:
            import time
            self.timestamp = time.time()


class InputHandler:
    """
    Handles user input applying UI/UX best practices.
    Focus on Accessibility (Priority 1) and Touch & Interaction (Priority 2).
    """

    def __init__(self, width: int = game_config.window_width, height: int = game_config.window_height):
        self.logger = get_logger()
        self.width = width
        self.height = height
        self.is_initialized = False

        # Input state
        self.active_touches: Dict[int, Tuple[int, int]] = {}  # touch_id -> position
        self.keys_pressed: set = set()
        self.mouse_position: Tuple[int, int] = (0, 0)
        self.mouse_buttons: Dict[int, bool] = {}  # button_id -> pressed

        # Reference to game state (set by UIManager)
        self.game_state: Optional[GameStateManager] = None

        # Menu navigation state
        self.main_menu_selected = 0  # Index of selected item in main menu (0=Start Game, 1=Options, 2=Quit)
        self.options_menu_selected = 0  # Index of selected item in options menu (0=3D, 1=Contrast, 2=Large Text, 3=Back)

        # Action mappings
        self.action_callbacks: Dict[InputAction, List[Callable]] = {
            action: [] for action in InputAction
        }

        # UI/UX settings
        self.touch_target_size = 44  # Priority 2: Min size 44x44px
        self.touch_spacing = 8       # Priority 2: 8px+ spacing
        self.long_press_threshold = 0.5  # seconds
        self.drag_threshold = 10       # pixels

        # Accessibility features
        self.screen_reader_available = self._check_screen_reader_availability()
        self.keyboard_navigation_enabled = True

        self.logger.info(
            "input_handler_initialized",
            width=width,
            height=height
        )

    def _check_screen_reader_availability(self) -> bool:
        """Check if screen reader is available (platform-specific)."""
        # TODO: Implement actual platform detection
        # For now, return False as placeholder
        return False

    def initialize(self) -> bool:
        """
        Initialize the input handler.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("input_handler_initializing")

            # TODO: Initialize actual input system (GLFW, SDL, etc.)
            # For now, we'll simulate initialization

            self.is_initialized = True
            self.logger.info("input_handler_initialized")
            return True

        except Exception as e:
            self.logger.error(
                "input_handler_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def process_input(self, game_state: GameStateManager) -> List[InputAction]:
        """
        Process pending input and return actions to execute.

        Args:
            game_state: Current game state

        Returns:
            List[InputAction]: Actions triggered by input
        """
        if not self.is_initialized:
            self.logger.warning("input_handler_not_initialized")
            return []

        # TODO: Process actual input events from OS/window system
        # For now, we'll simulate some basic input processing for testing

        actions = []

        # Process keyboard input (using simulated keys for testing)
        keyboard_actions = self._process_keyboard_input(game_state)
        actions.extend(keyboard_actions)

        # Process touch input (using simulated touches for testing)
        touch_actions = self._process_touch_input(game_state)
        actions.extend(touch_actions)

        # Process mouse input (using simulated mouse for testing)
        mouse_actions = self._process_mouse_input(game_state)
        actions.extend(mouse_actions)

        # Remove duplicates while preserving order
        seen = set()
        unique_actions = []
        for action in actions:
            if action not in seen:
                seen.add(action)
                unique_actions.append(action)

        return unique_actions

    def _process_touch_input(self, game_state: GameStateManager) -> List[InputAction]:
        """Process touch input for piece selection and dragging."""
        actions = []

        # Process actual touch events
        # This interfaces with self.active_touches

        # For now, we'll simulate basic touch processing
        # In a full implementation, this would:
        # 1. Check for new touches in self.active_touches
        # 2. Determine what game object was touched
        # 3. Return appropriate actions (SELECT_PIECE, START_DRAG, etc.)

        # For testing purposes, we'll just return an empty list
        # Actual touch processing would be implemented here

        return actions

    def _process_keyboard_input(self, game_state: GameStateManager) -> List[InputAction]:
        """Process keyboard input with accessibility considerations."""
        actions = []

        # Process actual keyboard events
        # This interfaces with self.keys_pressed

        current_state = game_state.get_game_state()

        # Menu navigation
        if current_state == GameState.MENU:
            # Handle arrow keys for main menu navigation
            if 273 in self.keys_pressed:  # Up arrow
                self.main_menu_selected = (self.main_menu_selected - 1) % 3
                # Prevent duplicate actions by clearing the key after processing
                self.keys_pressed.discard(273)
            elif 274 in self.keys_pressed:  # Down arrow
                self.main_menu_selected = (self.main_menu_selected + 1) % 3
                self.keys_pressed.discard(274)
            elif 13 in self.keys_pressed:  # Enter key
                # Activate selected menu item
                if self.main_menu_selected == 0:  # Start Game
                    actions.append(InputAction.START_GAME)
                elif self.main_menu_selected == 1:  # Options
                    actions.append(InputAction.OPTIONS)
                elif self.main_menu_selected == 2:  # Quit
                    actions.append(InputAction.QUIT)
                self.keys_pressed.discard(13)
            elif 27 in self.keys_pressed:  # Escape key
                # In menu, escape could quit or do nothing
                # For now, we'll treat it as quit
                actions.append(InputAction.QUIT)
                self.keys_pressed.discard(27)

        elif current_state == GameState.OPTIONS:
            # Handle arrow keys for options menu navigation
            if 273 in self.keys_pressed:  # Up arrow
                self.options_menu_selected = (self.options_menu_selected - 1) % 4
                self.keys_pressed.discard(273)
            elif 274 in self.keys_pressed:  # Down arrow
                self.options_menu_selected = (self.options_menu_selected + 1) % 4
                self.keys_pressed.discard(274)
            elif 13 in self.keys_pressed:  # Enter key
                # Activate selected options item
                if self.options_menu_selected == 0:  # 3D Rendering
                    actions.append(InputAction.TOGGLE_3D)
                elif self.options_menu_selected == 1:  # High Contrast
                    actions.append(InputAction.TOGGLE_CONTRAST)
                elif self.options_menu_selected == 2:  # Large Text
                    actions.append(InputAction.TOGGLE_LARGE_TEXT_MENU)
                elif self.options_menu_selected == 3:  # Back to Main Menu
                    actions.append(InputAction.BACK_TO_MAIN_MENU)
                self.keys_pressed.discard(13)
            elif 27 in self.keys_pressed:  # Escape key
                # Escape goes back to main menu
                actions.append(InputAction.BACK_TO_MAIN_MENU)
                self.keys_pressed.discard(27)

        # Gameplay keyboard controls (when not in menu)
        if current_state == GameState.RUNNING:
            # Space bar to launch selected piece
            if 32 in self.keys_pressed:  # Space key
                actions.append(InputAction.LAUNCH_PIECE)

            # Enter to confirm selection
            if 13 in self.keys_pressed:  # Enter key
                actions.append(InputAction.SELECT_PIECE)

            # Escape to pause/cancel
            if 27 in self.keys_pressed:  # Esc key
                actions.append(InputAction.PAUSE_GAME)

        # C to toggle high contrast (accessibility feature) - works in any state
        if 67 in self.keys_pressed and any(k in self.keys_pressed for k in [16, 17, 18]):  # C + Ctrl/Alt
            actions.append(InputAction.TOGGLE_HIGH_CONTRAST)

        return actions

    def _process_mouse_input(self, game_state: GameStateManager) -> List[InputAction]:
        """Process mouse input."""
        actions = []

        # Process actual mouse events
        # This interfaces with self.mouse_position and self.mouse_buttons

        # Check for mouse button releases (clicks)
        for button in list(self.mouse_buttons):
            if not self.mouse_buttons[button]:  # Button was released
                # This is a mouse up event - check if it was a click
                if button == 1:  # Left mouse button
                    # Check if we clicked on a UI element
                    ui_action = self._check_ui_click(game_state)
                    if ui_action:
                        actions.append(ui_action)

                # Remove from tracking since we processed the release
                del self.mouse_buttons[button]

        # For now, we'll also handle continuous input for testing
        # In a full implementation, this would be handled by the event system above

        return actions

    def _check_ui_click(self, game_state: GameStateManager) -> Optional[InputAction]:
        """Check if mouse click occurred on a UI element and return corresponding action.

        Args:
            game_state: Current game state

        Returns:
            Optional[InputAction]: Action if click was on UI element, None otherwise
        """
        # Only check UI clicks in relevant game states
        current_state = game_state.get_game_state()

        if current_state == GameState.MENU:
            return self._check_menu_button_click()
        elif current_state == GameState.PAUSED:
            # Could add pause menu button handling here
            pass
        elif current_state == GameState.GAME_OVER:
            # Could add game over menu button handling here
            pass

        return None

    def _check_menu_button_click(self) -> Optional[InputAction]:
        """Check if mouse click occurred on a menu button.

        Returns:
            Optional[InputAction]: Action if menu button was clicked, None otherwise
        """
        # Only check UI clicks in relevant game states
        current_state = self.game_state.get_game_state() if hasattr(self, 'game_state') else None

        # These values must match the ones in renderer.py::_render_menu_buttons or _render_options_menu_buttons
        button_width = 240
        button_height = 60
        button_spacing = 25

        # Calculate button positions (same as in renderer)
        start_x = (self.width - button_width) // 2

        # Get current mouse position
        mouse_x, mouse_y = self.mouse_position

        # Check each button based on current state
        if current_state == GameState.MENU:
            start_y = (self.height - (3 * button_height + 2 * button_spacing)) // 2

            # Check each button
            buttons = [
                (start_y + 0 * (button_height + button_spacing), InputAction.START_GAME, "Start Game"),
                (start_y + 1 * (button_height + button_spacing), InputAction.OPTIONS, "Options"),
                (start_y + 2 * (button_height + button_spacing), InputAction.QUIT, "Quit")
            ]
        elif current_state == GameState.OPTIONS:
            start_y = (self.height - (4 * button_height + 3 * button_spacing)) // 2

            # Check each button
            buttons = [
                (start_y + 0 * (button_height + button_spacing), InputAction.TOGGLE_3D, "3D Rendering"),
                (start_y + 1 * (button_height + button_spacing), InputAction.TOGGLE_CONTRAST, "High Contrast"),
                (start_y + 2 * (button_height + button_spacing), InputAction.TOGGLE_LARGE_TEXT_MENU, "Large Text"),
                (start_y + 3 * (button_height + button_spacing), InputAction.GENERATE_KNOWLEDGE_GRAPH, "Generate Knowledge Graph"),
                (start_y + 4 * (button_height + button_spacing), InputAction.BACK_TO_MAIN_MENU, "Back to Main Menu")
            ]
        else:
            # Not in a menu state we handle
            return None

        for y_pos, action, label in buttons:
            # Create button rect
            button_rect = pygame.Rect(start_x, y_pos, button_width, button_height)

            # Check if click is inside button
            if button_rect.collidepoint(mouse_x, mouse_y):
                self.logger.info(
                    "menu_button_clicked",
                    button=label,
                    action=action.value,
                    mouse_x=mouse_x,
                    mouse_y=mouse_y
                )
                return action

        return None

    def register_action_callback(self, action: InputAction, callback: Callable) -> None:
        """
        Register a callback for a specific input action.

        Args:
            action: The input action
            callback: Function to call when action occurs
        """
        if action in self.action_callbacks:
            self.action_callbacks[action].append(callback)
            self.logger.debug(
                "input_callback_registered",
                action=action.value
            )

    def unregister_action_callback(self, action: InputAction, callback: Callable) -> None:
        """
        Unregister a callback for a specific input action.

        Args:
            action: The input action
            callback: Function to remove
        """
        if action in self.action_callbacks and callback in self.action_callbacks[action]:
            self.action_callbacks[action].remove(callback)
            self.logger.debug(
                "input_callback_unregistered",
                action=action.value
            )

    def execute_action_callbacks(self, action: InputAction, *args, **kwargs) -> None:
        """
        Execute all callbacks registered for an action.

        Args:
            action: The input action
            *args, **kwargs: Arguments to pass to callbacks
        """
        if action in self.action_callbacks:
            for callback in self.action_callbacks[action]:
                try:
                    callback(*args, **kwargs)
                except Exception as e:
                    self.logger.error(
                        "input_callback_error",
                        action=action.value,
                        error=str(e),
                        callback=callback.__name__ if hasattr(callback, '__name__') else str(callback)
                    )

    def is_touch_available(self) -> bool:
        """
        Check if touch input is available.

        Returns:
            bool: True if touch input available
        """
        # TODO: Implement actual touch availability check
        # For desktop simulations, we might treat mouse as touch
        return True  # Placeholder

    def is_keyboard_navigation_preferred(self) -> bool:
        """
        Check if keyboard navigation should be preferred (accessibility).

        Returns:
            bool: True if keyboard navigation preferred
        """
        return self.keyboard_navigation_enabled or self.screen_reader_available

    @staticmethod
    def get_touch_target_size() -> int:
        """
        Get recommended touch target size.

        Returns:
            int: Touch target size in pixels (min 44px per Priority 2)
        """
        return 44

    @staticmethod
    def get_touch_spacing() -> int:
        """
        Get recommended touch target spacing.

        Returns:
            int: Spacing in pixels (min 8px per Priority 2)
        """
        return 8

    def cleanup(self) -> None:
        """Clean up input handler resources."""
        self.logger.info("input_handler_cleaning_up")
        # TODO: Release input resources
        self.is_initialized = False

    def simulate_key_press(self, key_code: int) -> None:
        """
        Simulate a key press for testing purposes.

        Args:
            key_code: The key code to simulate
        """
        self.keys_pressed.add(key_code)
        self.logger.debug(
            "key_press_simulated",
            key_code=key_code
        )

    def simulate_key_release(self, key_code: int) -> None:
        """
        Simulate a key release for testing purposes.

        Args:
            key_code: The key code to simulate
        """
        self.keys_pressed.discard(key_code)
        self.logger.debug(
            "key_release_simulated",
            key_code=key_code
        )

    def simulate_touch_start(self, touch_id: int, x: int, y: int) -> None:
        """
        Simulate touch start for testing purposes.

        Args:
            touch_id: Unique identifier for the touch
            x: X coordinate
            y: Y coordinate
        """
        self.active_touches[touch_id] = (x, y)
        self.logger.debug(
            "touch_start_simulated",
            touch_id=touch_id,
            x=x,
            y=y
        )

    def simulate_touch_move(self, touch_id: int, x: int, y: int) -> None:
        """
        Simulate touch move for testing purposes.

        Args:
            touch_id: Unique identifier for the touch
            x: X coordinate
            y: Y coordinate
        """
        if touch_id in self.active_touches:
            self.active_touches[touch_id] = (x, y)
            self.logger.debug(
                "touch_move_simulated",
                touch_id=touch_id,
                x=x,
                y=y
            )

    def simulate_touch_end(self, touch_id: int) -> None:
        """
        Simulate touch end for testing purposes.

        Args:
            touch_id: Unique identifier for the touch
        """
        if touch_id in self.active_touches:
            del self.active_touches[touch_id]
            self.logger.debug(
                "touch_end_simulated",
                touch_id=touch_id
            )

    def simulate_mouse_button_press(self, button: int, x: int, y: int) -> None:
        """
        Simulate mouse button press for testing purposes.

        Args:
            button: Mouse button number (1=left, 2=middle, 3=right)
            x: X coordinate
            y: Y coordinate
        """
        self.mouse_buttons[button] = True
        self.mouse_position = (x, y)
        self.logger.debug(
            "mouse_button_press_simulated",
            button=button,
            x=x,
            y=y
        )

    def simulate_mouse_button_release(self, button: int, x: int, y: int) -> None:
        """
        Simulate mouse button release for testing purposes.

        Args:
            button: Mouse button number (1=left, 2=middle, 3=right)
            x: X coordinate
            y: Y coordinate
        """
        self.mouse_buttons[button] = False
        self.mouse_position = (x, y)
        self.logger.debug(
            "mouse_button_release_simulated",
            button=button,
            x=x,
            y=y
        )

    @staticmethod
    def is_ready() -> bool:
        """Check if input handler is ready."""
        # In a real implementation, this would check initialization
        # For now, we'll return True as a placeholder
        return True


if __name__ == "__main__":
    # For testing purposes
    handler = InputHandler()
    print("InputHandler created successfully")