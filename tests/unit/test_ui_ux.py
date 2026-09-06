"""
Unit tests for UI/UX systems applying UI/UX Pro Max principles.
"""
import sys
import os
import time

# Add the archess package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from archess.app.ui.manager import UIManager
from archess.app.core.game_state import GameStateManager
from archess.app.rendering.renderer import Renderer, Colors, Color, AccessibilityUtils, Typography
from archess.app.input.handler import InputHandler, InputAction, InputType
from archess.app.config import game_config


def test_color_accessibility():
    """Test that color combinations meet accessibility guidelines."""
    # Test primary text on primary background (should be accessible)
    text_color = Colors.TEXT_PRIMARY
    bg_color = Colors.BACKGROUND
    is_accessible = AccessibilityUtils.is_accessible_pair(text_color, bg_color)
    # TEXT_PRIMARY on BACKGROUND should be accessible (near white on near black)

    # Test white text on dark blue (should be accessible)
    white = Colors.TEXT_PRIMARY  # White
    dark_blue = Colors.PRIMARY   # Dark blue
    is_accessible = AccessibilityUtils.is_accessible_pair(white, dark_blue)
    assert is_accessible == True, "White text on dark blue should be accessible"

    # Test black text on light background (should be accessible)
    black = Color(0, 0, 0)
    light_bg = Color(200, 200, 220)  # Light blue-gray
    is_accessible = AccessibilityUtils.is_accessible_pair(black, light_bg)
    assert is_accessible == True, "Black text on light background should be accessible"


def test_touch_target_sizes():
    """Test that touch target sizes meet UI/UX guidelines."""
    input_handler = InputHandler()

    # Priority 2: Touch & Interaction - Min size 44x44px
    min_size = input_handler.get_touch_target_size()
    assert min_size >= 44, f"Touch target size should be at least 44px, got {min_size}"

    # Priority 2: Touch & Interaction - 8px+ spacing
    min_spacing = input_handler.get_touch_spacing()
    assert min_spacing >= 8, f"Touch spacing should be at least 8px, got {min_spacing}"


def test_typography_accessibility():
    """Test that typography meets accessibility guidelines."""
    # Priority 6: Typography & Color - Base 16px, Line-height 1.5
    assert Typography.FONT_SIZE_NORMAL == 16, "Base font size should be 16px"
    assert Typography.LINE_HEIGHT == 1.5, "Line height should be 1.5"

    # Test that we have appropriate font sizes
    assert Typography.FONT_SIZE_SMALL < Typography.FONT_SIZE_NORMAL
    assert Typography.FONT_SIZE_LARGE > Typography.FONT_SIZE_NORMAL
    assert Typography.FONT_SIZE_TITLE > Typography.FONT_SIZE_LARGE
    assert Typography.FONT_SIZE_HEADER > Typography.FONT_SIZE_TITLE


def test_renderer_initialization():
    """Test that renderer initializes correctly."""
    renderer = Renderer(
        width=game_config.window_width,
        height=game_config.window_height
    )

    # Note: Actual initialization would require a graphics context
    # We're just testing that the object can be created
    assert renderer.width == game_config.window_width
    assert renderer.height == game_config.window_height
    assert renderer.is_initialized == False  # Not initialized yet


def test_input_handler_initialization():
    """Test that input handler initializes correctly."""
    input_handler = InputHandler(
        width=game_config.window_width,
        height=game_config.window_height
    )

    assert input_handler.width == game_config.window_width
    assert input_handler.height == game_config.window_height
    assert input_handler.is_initialized == False  # Not initialized yet

    # Test touch target sizes
    assert input_handler.get_touch_target_size() >= 44
    assert input_handler.get_touch_spacing() >= 8


def test_ui_manager_creation():
    """Test that UI manager can be created."""
    game_state = GameStateManager()
    ui_manager = UIManager(
        width=game_config.window_width,
        height=game_config.window_height
    )

    assert ui_manager.width == game_config.window_width
    assert ui_manager.height == game_config.window_height
    assert ui_manager.is_initialized == False
    assert ui_manager.game_state is None  # Not set yet


def test_semantic_colors():
    """Test that semantic colors are defined correctly."""
    # Test that we have semantic color definitions
    assert hasattr(Colors, 'PRIMARY')
    assert hasattr(Colors, 'SECONDARY')
    assert hasattr(Colors, 'SUCCESS')
    assert hasattr(Colors, 'WARNING')
    assert hasattr(Colors, 'ERROR')
    assert hasattr(Colors, 'INFO')

    # Test that we have neutral colors
    assert hasattr(Colors, 'BACKGROUND')
    assert hasattr(Colors, 'SURFACE')
    assert hasattr(Colors, 'ON_BACKGROUND')
    assert hasattr(Colors, 'ON_SURFACE')

    # Test that we have text colors
    assert hasattr(Colors, 'TEXT_PRIMARY')
    assert hasattr(Colors, 'TEXT_SECONDARY')
    assert hasattr(Colors, 'TEXT_DISABLED')


def test_accessibility_utils():
    """Test accessibility utility functions."""
    # Test contrast ratio calculation
    white = Color(255, 255, 255)
    black = Color(0, 0, 0)
    ratio = AccessibilityUtils.calculate_contrast_ratio(white, black)
    assert ratio == 21.0, f"Black-white contrast should be 21:1, got {ratio}"

    # Test accessible text color selection
    dark_bg = Color(0, 0, 0)
    light_text = AccessibilityUtils.get_accessible_text_color(dark_bg)
    assert light_text.r == 255 and light_text.g == 255 and light_text.b == 255

    light_bg = Color(255, 255, 255)
    dark_text = AccessibilityUtils.get_accessible_text_color(light_bg)
    assert dark_text.r == 0 and dark_text.g == 0 and dark_text.b == 0


def test_input_action_enum():
    """Test that input actions are defined correctly."""
    # Test that we have the expected actions
    assert hasattr(InputAction, 'SELECT_PIECE')
    assert hasattr(InputAction, 'LAUNCH_PIECE')
    assert hasattr(InputAction, 'OPEN_MENU')
    assert hasattr(InputAction, 'PAUSE_GAME')
    assert hasattr(InputAction, 'TOGGLE_HIGH_CONTRAST')

    # Test that we can access the values
    assert InputAction.SELECT_PIECE.value == "select_piece"
    assert InputAction.LAUNCH_PIECE.value == "launch_piece"


def test_input_type_enum():
    """Test that input types are defined correctly."""
    assert hasattr(InputType, 'TOUCH_START')
    assert hasattr(InputType, 'KEY_DOWN')
    assert hasattr(InputType, 'MOUSE_DOWN')

    assert InputType.TOUCH_START.value == "touch_start"
    assert InputType.KEY_DOWN.value == "key_down"


if __name__ == "__main__":
    # Run tests
    test_color_accessibility()
    test_touch_target_sizes()
    test_typography_accessibility()
    test_renderer_initialization()
    test_input_handler_initialization()
    test_ui_manager_creation()
    test_semantic_colors()
    test_accessibility_utils()
    test_input_action_enum()
    test_input_type_enum()

    print("All UI/UX tests passed!")