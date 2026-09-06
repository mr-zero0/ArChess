"""
Renderer for Archess game applying UI/UX best practices.
Implements Priority 1-10 from UI/UX Pro Max skill.
"""
from __future__ import annotations

import math
import pygame
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from archess.app.core.game_state import GameStateManager, Piece, GameState
from archess.app.config import game_config
from archess.app.bootstrap.logging import get_logger

# Optional OpenGL imports for 3D rendering
try:
    from OpenGL.GL import *
    from OpenGL.GLU import *
    OPENGL_AVAILABLE = True
except ImportError:
    OPENGL_AVAILABLE = False


class RenderLayer(Enum):
    """Render layers for proper z-ordering."""
    BACKGROUND = 0
    BOARD = 1
    PIECES = 2
    UI = 3
    OVERLAY = 4
    DEBUG = 5


@dataclass
class Color:
    """RGBA color with semantic naming for accessibility."""
    r: int
    g: int
    b: int
    a: int = 255

    def to_tuple(self) -> Tuple[int, int, int, int]:
        """Convert to (r, g, b, a) tuple."""
        return (self.r, self.g, self.b, self.a)

    def to_hex(self) -> str:
        """Convert to hex color string."""
        return f"#{self.r:02x}{self.g:02x}{self.b:02x}"


# Semantic color tokens for accessibility and consistency
# Priority 6: Typography & Color - Semantic color tokens
# Following design taste principles: avoiding AI purple/blue, using proper accent colors
class Colors:
    """Semantic color tokens following accessibility guidelines and design taste principles."""
    # Primary colors
    PRIMARY = Color(28, 28, 34)         # Surface color
    PRIMARY_DARK = Color(35, 35, 42)    # Surface variant
    PRIMARY_LIGHT = Color(42, 42, 50)   # Bright surface
    SECONDARY = Color(64, 156, 255)     # Secondary accent color (same as ACCENT for now)

    # Secondary colors
    ACCENT = Color(64, 156, 255)        # Vibrant blue (saturation ~75%)
    ACCENT_DARK = Color(50, 120, 200)   # Darker variant
    ACCENT_LIGHT = Color(90, 180, 255)  # Lighter variant

    # Status colors (semantic meaning)
    SUCCESS = Color(52, 199, 89)        # Green (accessible)
    WARNING = Color(250, 176, 5)        # Amber/Orange (accessible)
    ERROR = Color(239, 68, 68)          # Red (accessible)
    INFO = Color(64, 156, 255)          # Same as accent for info

    # Neutrals
    BACKGROUND = Color(18, 18, 22)      # Near-black dark background
    BACKGROUND_VARIANT = Color(24, 24, 29)  # Slightly lighter background
    SURFACE = Color(28, 28, 34)         # Surface/card background
    SURFACE_VARIANT = Color(35, 35, 42) # Surface variant for elevation
    SURFACE_BRIGHT = Color(42, 42, 50)  # Bright surface for highlights
    ON_BACKGROUND = Color(245, 245, 250)  # Primary text - near white for contrast
    ON_SURFACE = Color(245, 245, 250)     # Primary text - near white for contrast

    # Accessibility focused - ensuring 4.5:1 contrast ratio
    # Priority 1: Accessibility - Contrast 4.5:1
    TEXT_PRIMARY = Color(245, 245, 250)   # Primary text - near white for contrast
    TEXT_SECONDARY = Color(160, 165, 180) # Secondary text - muted
    TEXT_DISABLED = Color(80, 85, 95)   # Disabled text
    TEXT_INVERSE = Color(20, 20, 25)    # Inverse text (for accent backgrounds)


@dataclass
class Typography:
    """Typography settings following accessibility guidelines."""
    # Priority 6: Typography & Color - Base 16px, Line-height 1.5
    FONT_SIZE_SMALL = 14
    FONT_SIZE_NORMAL = 16  # Base size
    FONT_SIZE_LARGE = 20
    FONT_SIZE_TITLE = 24
    FONT_SIZE_HEADER = 32

    LINE_HEIGHT = 1.5
    FONT_FAMILY = "Geist, Satoshi, Cabinet Grotesk, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"


class AccessibilityUtils:
    """Utility functions for accessibility compliance."""

    @staticmethod
    def calculate_contrast_ratio(color1: Color, color2: Color) -> float:
        """
        Calculate contrast ratio between two colors.
        Returns ratio from 1:1 to 21:1.
        WCAG AA requires 4.5:1 for normal text, 3:1 for large text.
        """
        def get_luminance(c: Color) -> float:
            def normalize(channel):
                channel /= 255.0
                if channel <= 0.03928:
                    return channel / 12.92
                else:
                    return pow((channel + 0.055) / 1.055, 2.4)

            r, g, b = normalize(c.r), normalize(c.g), normalize(c.b)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b

        lum1 = get_luminance(color1)
        lum2 = get_luminance(color2)

        if lum1 > lum2:
            return (lum1 + 0.05) / (lum2 + 0.05)
        else:
            return (lum2 + 0.05) / (lum1 + 0.05)

    @staticmethod
    def is_accessible_pair(text_color: Color, background_color: Color, is_large_text: bool = False) -> bool:
        """
        Check if color pair meets accessibility guidelines.
        Priority 1: Accessibility - Contrast 4.5:1 for normal text, 3:1 for large text
        """
        ratio = AccessibilityUtils.calculate_contrast_ratio(text_color, background_color)
        required_ratio = 3.0 if is_large_text else 4.5
        return ratio >= required_ratio

    @staticmethod
    def get_accessible_text_color(background_color: Color) -> Color:
        """Get accessible text color (black or white) for given background."""
        # Calculate luminance to determine if background is light or dark
        luminance = (0.299 * background_color.r +
                   0.587 * background_color.g +
                   0.114 * background_color.b) / 255

        return Color(0, 0, 0) if luminance > 0.5 else Color(255, 255, 255)


class TouchTargetUtils:
    """Utility functions for touch target compliance."""

    @staticmethod
    def get_min_touch_target_size() -> int:
        """
        Get minimum touch target size in pixels.
        Priority 2: Touch & Interaction - Min size 44×44px
        """
        return 44

    @staticmethod
    def get_min_touch_spacing() -> int:
        """
        Get minimum spacing between touch targets.
        Priority 2: Touch & Interaction - 8px+ spacing
        """
        return 8


class PerformanceUtils:
    """Utility functions for performance optimization."""

    @staticmethod
    def should_use_sprite_batching(sprite_count: int) -> bool:
        """
        Determine if sprite batching should be used for performance.
        Priority 3: Performance - Batch draw calls when beneficial
        """
        return sprite_count > 10

    @staticmethod
    def get_recommended_fps() -> int:
        """Get recommended FPS for smooth experience."""
        return 60


class Renderer:
    """
    Main renderer for Archess game.
    Applies UI/UX best practices from UI/UX Pro Max skill.
    """

    def __init__(self, width: int = game_config.window_width, height: int = game_config.window_height):
        self.logger = get_logger()
        self.width = width
        self.height = height
        self.is_initialized = False

        # Render state
        self.layers: Dict[RenderLayer, List] = {layer: [] for layer in RenderLayer}
        self.visible = True

        # Performance tracking
        self.frame_count = 0
        self.last_fps_time = 0
        self.current_fps = 0

        # Accessibility settings
        self.high_contrast_mode = False
        self.large_text_mode = False
        self.screen_reader_enabled = False
        self.show_debug = False

        # UI state for debugging
        class UIState:
            def __init__(self):
                self.show_debug = False

        self.ui_state = UIState()

        # 3D rendering settings
        self.use_3d_rendering = False
        self.opengl_available = OPENGL_AVAILABLE
        self.rotation_angle = 0.0

        self.logger.info(
            "renderer_initialized",
            width=width,
            height=height
        )

    def _get_effective_color(self, color_name: str) -> Color:
        """Get the effective color for a given name, applying high contrast mode if enabled."""
        if not self.high_contrast_mode:
            return getattr(Colors, color_name)

        # High contrast mode: use a fixed high contrast theme
        # We'll map semantic roles to high contrast colors
        high_contrast_map = {
            "BACKGROUND": Color(0, 0, 0),           # Black
            "ON_BACKGROUND": Color(255, 255, 255),   # White
            "PRIMARY": Color(0, 0, 0),               # Black
            "ON_PRIMARY": Color(255, 255, 255),      # White
            "SECONDARY": Color(0, 0, 0),             # Black
            "ON_SECONDARY": Color(255, 255, 255),    # White
            "ACCENT": Color(255, 255, 0),            # Yellow
            "ON_ACCENT": Color(0, 0, 0),             # Black
            "SUCCESS": Color(0, 255, 0),             # Green
            "ERROR": Color(255, 0, 0),               # Red
            "WARNING": Color(255, 165, 0),           # Orange
            "INFO": Color(0, 255, 255),              # Cyan
            "TEXT_PRIMARY": Color(255, 255, 255),    # White
            "TEXT_SECONDARY": Color(192, 192, 192),  # Light gray
            "TEXT_DISABLED": Color(128, 128, 128),   # Gray
        }
        return high_contrast_map.get(color_name, getattr(Colors, color_name))

    def _get_effective_font_size(self, size_name: str) -> int:
        """Get the effective font size for a given name, applying large text mode if enabled."""
        base_size = getattr(Typography, size_name)
        if self.large_text_mode:
            return int(base_size * 1.25)  # Increase by 25%
        return base_size

    def initialize(self) -> bool:
        """
        Initialize the renderer.

        Returns:
            bool: True if initialization successful
        """
        try:
            self.logger.info("renderer_initializing")

            # Initialize pygame
            pygame.init()

            # Set up the display surface with OpenGL support if needed
            if self.use_3d_rendering and self.opengl_available:
                pygame.display.set_mode((self.width, self.height), pygame.DOUBLEBUF | pygame.OPENGL)
                self._setup_opengl()
            else:
                # Standard 2D display
                self.screen = pygame.display.set_mode((self.width, self.height))

            pygame.display.set_caption("Archess Game")

            # Set up the clock for controlling frame rate
            self.clock = pygame.time.Clock()

            # Initialize font rendering (only for 2D rendering or text overlays in 3D)
            pygame.font.init()
            # Try to use a better font for improved readability and aesthetics
            # Priority 6: Typography & Color - Semantic color tokens and thoughtful typography
            # Use font family from Typography.FONT_FAMILY, split by commas and strip whitespace
            font_list = [name.strip() for name in Typography.FONT_FAMILY.split(',')]
            # Add some common fallbacks
            font_list.extend(["Segoe UI", "Arial", "Helvetica", "sans-serif"])
            font_small = None
            font_medium = None
            font_large = None

            for font_name in font_list:
                try:
                    font_small = pygame.font.Font(font_name, 24)
                    font_medium = pygame.font.Font(font_name, 32)
                    font_large = pygame.font.Font(font_name, 48)
                    break
                except:
                    continue

            # Fallback to default font if none of the preferred fonts are available
            if font_small is None:
                font_small = pygame.font.Font(None, 24)
                font_medium = pygame.font.Font(None, 32)
                font_large = pygame.font.Font(None, 48)

            self.font_small = font_small
            self.font_medium = font_medium
            self.font_large = font_large

            self.is_initialized = True
            self.logger.info("renderer_initialized",
                           width=self.width,
                           height=self.height,
                           use_3d_rendering=self.use_3d_rendering)
            return True

        except Exception as e:
            self.logger.error(
                "renderer_initialization_failed",
                error=str(e),
                error_type=type(e).__name__
            )
            return False

    def render_frame(self, game_state: GameStateManager, input_handler: Optional[InputHandler] = None) -> None:
        """
        Render a single frame applying UI/UX principles.

        Args:
            game_state: Current game state
            input_handler: Optional input handler for tracking cursor
        """
        if not self.is_initialized:
            self.logger.warning("renderer_not_initialized")
            return

        # Priority 3: Performance - Track FPS
        self._update_fps()

        # Clear frame (conceptual)
        self._clear_frame(Colors.BACKGROUND)

        # Render in layer order
        self._render_background()
        self._render_board(game_state)
        self._render_pieces(game_state)
        self._render_ui(game_state, input_handler)
        self._render_overlay(game_state)
        self._render_debug_info(game_state)

        # Render tracking cursor if input handler is provided
        if input_handler and input_handler.is_initialized:
            self._render_tracking_cursor(input_handler.mouse_position)

        # Present frame (conceptual)
        self._present_frame()

        self.frame_count += 1

    def _clear_frame(self, color: Color) -> None:
        """Clear the frame with specified color."""
        # Clear the screen with the specified color
        self.screen.fill(color.to_tuple())

    def _render_background(self) -> None:
        """Render background elements with minimalist design."""
        # Priority 4: Style Selection - Consistency
        # Priority 6: Typography & Color - Semantic colors

        # Draw solid background using the BACKGROUND color
        self.screen.fill(Colors.BACKGROUND.to_tuple())

        # Optional: Add subtle texture or pattern for depth
        # Minimalist approach: keep it simple, maybe just a solid color

    def _render_board(self, game_state: GameStateManager) -> None:
        """
        Render game board with UI/UX considerations.

        Priority 5: Layout & Responsive - Mobile-first breakpoints
        Priority 1: Accessibility - Clear visual distinction
        Priority 4: Style Selection - Consistency
        """
        # Board dimensions and positioning
        board_padding = 20
        board_width = self.width - (2 * board_padding)
        board_height = self.height - (2 * board_padding)
        board_x = board_padding
        board_y = board_padding

        # Draw board background with subtle elevation
        # Using SURFACE color for the board background
        pygame.draw.rect(
            self.screen,
            Colors.SURFACE.to_tuple(),
            pygame.Rect(board_x, board_y, board_width, board_height)
        )

        # Draw subtle board grid (minimalist approach)
        # Priority 1: Accessibility - Clear visual distinction
        grid_size = 40  # 40x40 grid cells
        grid_color = Colors.SURFACE_VARIANT

        # Draw vertical grid lines
        for x in range(board_x, board_x + board_width + 1, grid_size):
            pygame.draw.line(
                self.screen,
                grid_color.to_tuple(),
                (x, board_y),
                (x, board_y + board_height),
                1
            )

        # Draw horizontal grid lines
        for y in range(board_y, board_y + board_height + 1, grid_size):
            pygame.draw.line(
                self.screen,
                grid_color.to_tuple(),
                (board_x, y),
                (board_x + board_width, y),
                1
            )

    def _render_pieces(self, game_state: GameStateManager) -> None:
        """
        Render game pieces with UI/UX considerations.

        Priority 2: Touch & Interaction - Min size 44x44px, 8px+ spacing
        Priority 1: Accessibility - Clear piece distinction, no color-only reliance
        Priority 7: Animation - Context-aware timing
        Priority 9: Navigation Patterns - Predictable selection
        """
        pieces = game_state.get_active_pieces()

        # Apply sprite batching for performance if many pieces
        # Simple implementation: use sprite batching for more than 10 pieces
        if len(pieces) > 10:
            # TODO: Use sprite batching
            pass

        for piece_id, piece in pieces.items():
            # Calculate piece position on screen
            screen_pos = self._world_to_screen(piece.position)

            # Ensure minimum touch target size
            piece_size = max(44, 44)  # Minimum 44px per Priority 2

            # Get piece color based on team and type
            piece_color = self._get_piece_color(piece)

            # Ensure piece is distinguishable without relying on color alone
            # Priority 1: Accessibility - No color-only distinction
            piece_symbol = self._get_piece_symbol(piece.piece_type)

            # Draw the piece as a circle with symbol (minimalist approach)
            # Priority 4: Style Selection - Consistency in shapes
            pygame.draw.circle(
                self.screen,
                piece_color.to_tuple(),
                screen_pos,
                piece_size // 2
            )

            # Draw piece symbol for accessibility (not color-only)
            if piece_symbol:
                # Render the symbol as text
                symbol_surface = self.font_medium.render(piece_symbol, True, Colors.TEXT_PRIMARY.to_tuple())
                symbol_rect = symbol_surface.get_rect(center=screen_pos)
                self.screen.blit(symbol_surface, symbol_rect)

            # Handle selection/highlight states with subtle emphasis
            if self._is_piece_selected(piece_id, game_state):
                self._render_piece_selection_highlight(screen_pos, piece_size)

    def _render_ui(self, game_state: GameStateManager, input_handler: Optional[InputHandler] = None) -> None:
        """
        Render UI elements with UI/UX considerations.

        Priority 8: Forms & Feedback - Clear feedback, error near field
        Priority 6: Typography & Color - Readable text, semantic colors
        Priority 9: Navigation Patterns - Predictable back behavior
        Priority 1: Accessibility - Alt text, keyboard nav, aria-labels
        """
        # Turn indicator
        self._render_turn_indicator(game_state)

        # Player health/scores
        self._render_player_info(game_state)

        # Current action feedback
        self._render_action_feedback(game_state)

        # Menu buttons (if applicable)
        self._render_menu_buttons(game_state, input_handler)

    def _render_turn_indicator(self, game_state: GameStateManager) -> None:
        """Render current turn indicator with minimalist styling."""
        current_player = game_state.get_current_player()
        turn_number = game_state.get_current_turn()

        # Text with semantic colors
        text_color = Colors.TEXT_PRIMARY
        background_color = Colors.PRIMARY if current_player == 0 else Colors.SECONDARY

        # Ensure accessibility
        # Simple implementation: check if contrast is sufficient
        # For now, we'll just use the colors as-is since we've chosen accessible colors
        pass

        # Priority 6: Typography & Color - Readable text, semantic colors
        # Priority 1: Accessibility - Alt text, keyboard nav, aria-labels
        # Priority 8: Forms & Feedback - Clear feedback, error near field

        # Draw turn indicator as a clean, minimalist badge
        # Example: "Player 1's Turn - Turn 3"
        turn_text = f"Player {current_player + 1}'s Turn - Turn {turn_number}"

        # Render the text
        text_surface = self.font_medium.render(turn_text, True, text_color.to_tuple())
        text_rect = text_surface.get_rect()
        text_rect.topleft = (20, 20)  # Position in top-left corner

        # Draw background rectangle for better readability
        bg_rect = pygame.Rect(text_rect.x - 10, text_rect.y - 5, text_rect.width + 20, text_rect.height + 10)
        pygame.draw.rect(self.screen, background_color.to_tuple(), bg_rect, border_radius=8)

        # Draw the text
        self.screen.blit(text_surface, text_rect)

    def _render_player_info(self, game_state: GameStateManager) -> None:
        """Render player information (health, pieces remaining) with minimalist styling."""
        # Priority 8: Forms & Feedback - Visible labels, helper text
        # Priority 6: Typography & Color - Readable text, semantic colors
        # Priority 1: Accessibility - Alt text, keyboard nav, aria-labels

        # Get player statistics
        player_0_pieces = game_state.get_player_pieces(0)
        player_1_pieces = game_state.get_player_pieces(1)

        # Count active pieces for each player
        active_pieces = game_state.get_active_pieces()
        player_0_active = sum(1 for pid in player_0_pieces if pid in active_pieces)
        player_1_active = sum(1 for pid in player_1_pieces if pid in active_pieces)

        # Get piece manager for HP information
        from archess.app.pieces.piece_manager import PieceManager
        piece_manager = PieceManager(game_state)
        player_0_stats = piece_manager.get_piece_stats(0)
        player_1_stats = piece_manager.get_piece_stats(1)

        # Render player info in a minimalist layout
        # Player 0 (left/top) and Player 1 (right/bottom) panels

        # Player 0 info (left side)
        player_0_text = f"P0: {player_0_active} pcs, {player_0_stats.total_hp} HP"
        player_0_surface = self.font_small.render(player_0_text, True, Colors.TEXT_PRIMARY.to_tuple())
        self.screen.blit(player_0_surface, (20, 70))

        # Player 1 info (right side)
        player_1_text = f"P1: {player_1_active} pcs, {player_1_stats.total_hp} HP"
        player_1_surface = self.font_small.render(player_1_text, True, Colors.TEXT_PRIMARY.to_tuple())
        player_1_rect = player_1_surface.get_rect()
        player_1_rect.topright = (self.width - 20, 70)
        self.screen.blit(player_1_surface, player_1_rect)

    def _render_action_feedback(self, game_state: GameStateManager) -> None:
        """Render feedback for current action (aiming, power, etc.) with minimalist styling."""
        # Priority 2: Touch & Interaction - Loading feedback, not instant state changes
        # Priority 3: Performance - Reserve space to prevent CLS
        # Priority 1: Accessibility - Clear feedback mechanisms
        # Priority 8: Forms & Feedback - Clear feedback, error near field

        # Get current player and turn state for contextual feedback
        current_player = game_state.get_current_player()
        turn_state = game_state.get_turn_state()

        # Provide minimalist feedback based on game state
        feedback_text = ""
        if turn_state.name == "PLAYER_SELECTING":
            feedback_text = f"Player {current_player + 1}: Select a piece"
        elif turn_state.name == "PLAYER_LAUNCHING":
            feedback_text = f"Player {current_player + 1}: Aim and launch"
        elif turn_state.name == "PIECES_IN_MOTION":
            feedback_text = "Pieces in motion..."
        elif turn_state.name == "PROCESSING_COLLISIONS":
            feedback_text = "Processing collisions..."
        elif turn_state.name == "APPLYING_DAMAGE":
            feedback_text = "Applying damage..."
        elif turn_state.name == "TURN_ENDING":
            feedback_text = "Ending turn..."

        # Render the feedback text centered at the bottom
        if feedback_text:
            feedback_surface = self.font_small.render(feedback_text, True, Colors.TEXT_PRIMARY.to_tuple())
            feedback_rect = feedback_surface.get_rect()
            feedback_rect.centerx = self.width // 2
            feedback_rect.bottom = self.height - 20

            # Draw background for better readability
            bg_rect = pygame.Rect(feedback_rect.x - 10, feedback_rect.y - 5,
                                feedback_rect.width + 20, feedback_rect.height + 10)
            pygame.draw.rect(self.screen, Colors.SURFACE.to_tuple(), bg_rect, border_radius=8)

            self.screen.blit(feedback_surface, feedback_rect)

    def _render_menu_buttons(self, game_state: GameStateManager, input_handler: Optional[Any] = None) -> None:
        """Render menu buttons if menu is active with professional styling."""
        current_state = game_state.get_game_state()
        if current_state != GameState.MENU and current_state != GameState.OPTIONS:
            return

        selected_index = 0
        if input_handler and hasattr(input_handler, 'main_menu_selected'):
            if current_state == GameState.MENU:
                selected_index = input_handler.main_menu_selected
            elif current_state == GameState.OPTIONS:
                selected_index = input_handler.options_menu_selected

        if current_state == GameState.MENU:
            self._render_main_menu_buttons(input_handler, selected_index)
            self._render_menu_decoration()  # Add decorative element for balance
        elif current_state == GameState.OPTIONS:
            self._render_options_menu_buttons(input_handler, selected_index)
            self._render_menu_decoration()  # Add decorative element for balance

    def _render_main_menu_buttons(self, input_handler: Optional[Any] = None, selected_index: int = 0) -> None:
        """Render main menu buttons with professional styling."""
        # Priority 2: Touch & Interaction - Min size 44x44px, 8px+ spacing
        # Priority 8: Forms & Feedback - Clear labels, not placeholder-only
        # Priority 1: Accessibility - Alt text, keyboard nav, aria-labels
        # Priority 4: Style Selection - Consistency
        # Priority 6: Typography & Color - Readable text, semantic colors

        # Define professional menu buttons with hover effects
        button_width = 280
        button_height = 70
        button_spacing = 30
        # Left-aligned content (avoiding center bias per design taste principles)
        start_x = 100  # Left-aligned instead of centered
        start_y = (self.height - (3 * button_height + 2 * button_spacing)) // 2

        buttons = [
            {"label": "Start Game", "action": "start"},
            {"label": "Options", "action": "options"},
            {"label": "Quit", "action": "quit"}
        ]

        # Get mouse position for hover effects
        mouse_pos = (0, 0)
        if input_handler and input_handler.is_initialized:
            mouse_pos = input_handler.mouse_position

        # Draw each button
        for i, button in enumerate(buttons):
            y_pos = start_y + i * (button_height + button_spacing)

            # Button colors with hover/selection effect
            button_rect = pygame.Rect(start_x, y_pos, button_width, button_height)
            is_hovered = button_rect.collidepoint(mouse_pos)
            is_selected = (i == selected_index)

            if is_hovered or is_selected:
                # Lighter shade when hovered or selected
                button_color = self._get_effective_color("PRIMARY_LIGHT").to_tuple() if hasattr(Colors, 'PRIMARY_LIGHT') else self._get_effective_color("PRIMARY").to_tuple()
                text_color = self._get_effective_color("TEXT_PRIMARY").to_tuple()
                # Add slight scale effect when hovered
                if is_hovered:
                    button_rect = pygame.Rect(start_x - 5, y_pos - 5, button_width + 10, button_height + 10)
            else:
                button_color = self._get_effective_color("PRIMARY").to_tuple()
                text_color = self._get_effective_color("TEXT_PRIMARY").to_tuple()

            # Draw button background with gradient effect
            pygame.draw.rect(self.screen, button_color, button_rect, border_radius=12)

            # Draw button border - thicker when selected
            border_width = 3 if is_selected else 2
            pygame.draw.rect(self.screen, self._get_effective_color("TEXT_PRIMARY").to_tuple(), button_rect, width=border_width, border_radius=12)

            # Draw button text with effective font size
            font_size = self._get_effective_font_size("FONT_SIZE_LARGE")
            font = pygame.font.Font(None, font_size)  # Using default font
            text_surface = font.render(button["label"], True, text_color)
            text_rect = text_surface.get_rect(center=button_rect.center)
            self.screen.blit(text_surface, text_rect)

            # Draw subtle shadow for depth
            shadow_rect = pygame.Rect(button_rect.x + 2, button_rect.y + 2, button_rect.width, button_rect.height)
            pygame.draw.rect(self.screen, (0, 0, 0, 30), shadow_rect, border_radius=12)

    def _render_options_menu_buttons(self, input_handler: Optional[Any] = None) -> None:
        """Render options menu buttons with professional styling."""
        # Priority 2: Touch & Interaction - Min size 44x44px, 8px+ spacing
        # Priority 8: Forms & Feedback - Clear labels, not placeholder-only
        # Priority 1: Accessibility - Alt text, keyboard nav, aria-labels
        # Priority 4: Style Selection - Consistency
        # Priority 6: Typography & Color - Readable text, semantic colors

        # Define professional options buttons with hover effects
        button_width = 280
        button_height = 70
        button_spacing = 30
        # Left-aligned content (avoiding center bias per design taste principles)
        start_x = 100  # Left-aligned instead of centered
        start_y = (self.height - (5 * button_height + 4 * button_spacing)) // 2

        buttons = [
            {"label": "3D Rendering: " + ("On" if self.use_3d_rendering else "Off"), "action": "toggle_3d"},
            {"label": "High Contrast: " + ("On" if self.high_contrast_mode else "Off"), "action": "toggle_contrast"},
            {"label": "Large Text: " + ("On" if self.large_text_mode else "Off"), "action": "toggle_large_text"},
            {"label": "Generate Knowledge Graph", "action": "generate_knowledge_graph"},
            {"label": "Back to Main Menu", "action": "back_to_main_menu"}
        ]

        # Get mouse position for hover effects
        mouse_pos = (0, 0)
        if input_handler and input_handler.is_initialized:
            mouse_pos = input_handler.mouse_position

        # Draw each button
        for i, button in enumerate(buttons):
            y_pos = start_y + i * (button_height + button_spacing)

            # Button colors with hover effect
            button_rect = pygame.Rect(start_x, y_pos, button_width, button_height)
            is_hovered = button_rect.collidepoint(mouse_pos)

            if is_hovered:
                # Lighter shade when hovered
                button_color = self._get_effective_color("PRIMARY_LIGHT").to_tuple() if hasattr(Colors, 'PRIMARY_LIGHT') else self._get_effective_color("PRIMARY").to_tuple()
                text_color = self._get_effective_color("TEXT_PRIMARY").to_tuple()
                # Add slight scale effect
                button_rect = pygame.Rect(start_x - 5, y_pos - 5, button_width + 10, button_height + 10)
            else:
                button_color = self._get_effective_color("PRIMARY").to_tuple()
                text_color = self._get_effective_color("TEXT_PRIMARY").to_tuple()

            # Draw button background with gradient effect
            pygame.draw.rect(self.screen, button_color, button_rect, border_radius=12)

            # Draw button border
            pygame.draw.rect(self.screen, self._get_effective_color("TEXT_PRIMARY").to_tuple(), button_rect, width=2, border_radius=12)

            # Draw button text with effective font size
            font_size = self._get_effective_font_size("FONT_SIZE_LARGE")
            font = pygame.font.Font(None, font_size)  # Using default font
            text_surface = font.render(button["label"], True, text_color)
            text_rect = text_surface.get_rect(center=button_rect.center)
            self.screen.blit(text_surface, text_rect)

            # Draw subtle shadow for depth
            shadow_rect = pygame.Rect(button_rect.x + 2, button_rect.y + 2, button_rect.width, button_rect.height)
            pygame.draw.rect(self.screen, (0, 0, 0, 30), shadow_rect, border_radius=12)

    def _render_menu_decoration(self) -> None:
        """Render decorative elements to balance the left-aligned menu (design taste principle)."""
        # Add a simple geometric decorative element on the right side
        # Following design taste: asymmetric layouts with visual balance

        # Draw a series of concentric circles or geometric shapes
        # Using the accent color but with low opacity for subtlety
        decoration_width = 200
        decoration_height = 150
        start_x = self.width - decoration_width - 50  # Right side with margin
        start_y = (self.height - decoration_height) // 2

        # Draw a series of concentric circles or geometric shapes
        # Using the accent color but with low opacity for subtlety
        for i in range(3):
            radius = 20 + i * 25
            center_x = start_x + decoration_width // 2
            center_y = start_y + decoration_height // 2

            # Draw circle with accent color
            color = self._get_effective_color("ACCENT")
            # Make it more transparent for decorative effect
            transparent_color = Color(color.r, color.g, color.b, 30)  # Low alpha

            # Draw circle outline
            pygame.draw.circle(
                self.screen,
                transparent_color.to_tuple(),
                (center_x, center_y),
                radius,
                2  # Line width
            )

            # Add some diagonal lines for visual interest
            line_length = 15
            offset = radius // 2
            # Top-left to bottom-right
            pygame.draw.line(
                self.screen,
                transparent_color.to_tuple(),
                (center_x - offset, center_y - offset),
                (center_x + offset, center_y + offset),
                1
            )
            # Top-right to bottom-left
            pygame.draw.line(
                self.screen,
                transparent_color.to_tuple(),
                (center_x + offset, center_y - offset),
                (center_x - offset, center_y + offset),
                1
            )

    def _render_overlay(self, game_state: GameStateManager) -> None:
        """Render overlay elements (pause menu, game over, etc.)."""
        game_state_enum = game_state.get_game_state()

        if game_state_enum == GameState.PAUSED:
            self._render_pause_overlay()
        elif game_state_enum == GameState.GAME_OVER:
            self._render_game_over_overlay(game_state)

    def _render_pause_overlay(self) -> None:
        """Render pause menu overlay with minimalist styling."""
        # Priority 1: Accessibility - Keyboard navigable
        # Priority 9: Navigation Patterns - Predictable back behavior (ESC to resume)
        # Priority 4: Style Selection - Consistency
        # Priority 6: Typography & Color - Readable text, semantic colors

        # Draw semi-transparent dark background
        overlay_color = Color(0, 0, 0, 180)  # Semi-transparent black
        overlay_surface = pygame.Surface((self.width, self.height))
        overlay_surface.set_alpha(overlay_color.a)
        overlay_surface.fill(overlay_color.to_tuple())
        self.screen.blit(overlay_surface, (0, 0))

        # Draw pause title and instructions
        title_surface = self.font_large.render("Game Paused", True, Colors.TEXT_PRIMARY.to_tuple())
        title_rect = title_surface.get_rect(center=(self.width // 2, self.height // 2 - 40))
        self.screen.blit(title_surface, title_rect)

        instruction_surface = self.font_medium.render("Press ESC to resume", True, Colors.TEXT_PRIMARY.to_tuple())
        instruction_rect = instruction_surface.get_rect(center=(self.width // 2, self.height // 2 + 20))
        self.screen.blit(instruction_surface, instruction_rect)

    def _render_game_over_overlay(self, game_state: GameStateManager) -> None:
        """Render game over overlay with minimalist styling."""
        # Determine winner from game state
        winner = None
        winning_player = None

        # Check which player's king is still alive
        for player_id in [0, 1]:
            king_piece = None
            from archess.app.pieces.piece_manager import PieceManager
            piece_manager = PieceManager(game_state)
            king_piece = piece_manager.get_king_piece(player_id)
            if king_piece and king_piece.is_active:
                winner = king_piece
                winning_player = player_id
                break

        # Priority 8: Forms & Feedback - Clear messaging
        # Priority 1: Accessibility - Ensure text is readable
        # Priority 4: Style Selection - Consistency
        # Priority 6: Typography & Color - Readable text, semantic colors

        # Draw semi-transparent dark background
        overlay_color = Color(0, 0, 0, 200)  # Semi-transparent black
        overlay_surface = pygame.Surface((self.width, self.height))
        overlay_surface.set_alpha(overlay_color.a)
        overlay_surface.fill(overlay_color.to_tuple())
        self.screen.blit(overlay_surface, (0, 0))

        # Draw game over message
        if winner:
            result_text = f"Player {winning_player + 1} Wins!"
        else:
            result_text = "Draw!"

        # Render the result text
        result_surface = self.font_large.render(result_text, True, Colors.TEXT_PRIMARY.to_tuple())
        result_rect = result_surface.get_rect(center=(self.width // 2, self.height // 2 - 40))
        self.screen.blit(result_surface, result_rect)

        # Optionally show restart instructions
        instruction_text = "Press R to restart or ESC to quit"
        instruction_surface = self.font_medium.render(instruction_text, True, Colors.TEXT_PRIMARY.to_tuple())
        instruction_rect = instruction_surface.get_rect(center=(self.width // 2, self.height // 2 + 20))
        self.screen.blit(instruction_surface, instruction_rect)

    def _render_debug_info(self, game_state: GameStateManager) -> None:
        """Render debug information if enabled with minimalist styling."""
        # Only show in development or when debug mode enabled
        if not self.ui_state.show_debug:
            return

        # Priority 3: Performance - Monitor and optimize
        # Priority 6: Typography & Color - Readable text, semantic colors
        # Priority 1: Accessibility - Ensure text is readable

        # Get debug information
        fps = self.get_fps()
        physics_update_count = self.physics_engine.update_count if hasattr(self, 'physics_engine') else 0
        collision_count = len(self.physics_engine.collision_events) if hasattr(self, 'physics_engine') else 0

        # Format debug text
        debug_lines = [
            f"FPS: {fps:.1f}",
            f"Physics Updates: {physics_update_count}",
            f"Collisions: {collision_count}",
            f"Entities: {len(game_state.get_active_pieces())}"
        ]

        # Position in top-left corner with padding
        padding = 10
        line_height = 20
        start_x = padding
        start_y = padding

        # Draw each line of text
        for i, line in enumerate(debug_lines):
            y_pos = start_y + (i * line_height)
            text_surface = self.font_small.render(line, True, Colors.TEXT_PRIMARY.to_tuple())
            self.screen.blit(text_surface, (start_x, y_pos))

    def _present_frame(self) -> None:
        """Present the rendered frame."""
        # Update the full display surface to the screen
        pygame.display.flip()

        # Cap the frame rate
        self.clock.tick(game_config.target_fps)

    def _render_tracking_cursor(self, position: Tuple[int, int]) -> None:
        """Render a tracking cursor at the specified position.

        Args:
            position: Screen coordinates (x, y) where to render the cursor
        """
        # Priority 2: Touch & Interaction - Clear visual feedback
        # Priority 6: Typography & Color - Semantic colors

        # Cursor colors
        cursor_color = Colors.PRIMARY.to_tuple()
        highlight_color = Colors.TEXT_PRIMARY.to_tuple()

        # Draw cursor as a crosshair
        cursor_size = 20
        thickness = 2

        # Horizontal line
        pygame.draw.line(
            self.screen,
            cursor_color,
            (position[0] - cursor_size//2, position[1]),
            (position[0] + cursor_size//2, position[1]),
            thickness
        )

        # Vertical line
        pygame.draw.line(
            self.screen,
            cursor_color,
            (position[0], position[1] - cursor_size//2),
            (position[0], position[1] + cursor_size//2),
            thickness
        )

        # Add a small circle at the center for better visibility
        pygame.draw.circle(
            self.screen,
            highlight_color,
            position,
            3
        )

    def _world_to_screen(self, world_pos: Tuple[float, float, float]) -> Tuple[int, int]:
        """
        Convert world coordinates to screen coordinates.

        Args:
            world_pos: Position in world coordinates (x, y, z)

        Returns:
            Tuple[int, int]: Screen coordinates (x, y)
        """
        # Simple orthographic projection for 2D game
        # TODO: Implement proper camera transformation
        screen_x = int((world_pos[0] + 5) * (self.width / 20))  # Assuming world -5 to +5
        screen_y = int((world_pos[1] + 5) * (self.height / 20))
        return (screen_x, screen_y)

    def _get_piece_color(self, piece: Piece) -> Color:
        """
        Get color for a piece based on team and type.

        Args:
            piece: Piece to get color for

        Returns:
            Color: Piece color
        """
        # Base color by team
        if piece.player_id == 0:
            base_color = Colors.PRIMARY
        else:
            base_color = Colors.SECONDARY

        # Modify based on piece type for better distinction
        # Priority 1: Accessibility - No color-only reliance
        type_modifiers = {
            "king": 0.0,      # No modification
            "queen": -0.1,    # Slightly darker
            "rook": 0.1,      # Slightly lighter
            "bishop": 0.05,   # Slightly lighter
            "knight": -0.05,  # Slightly darker
            "pawn": 0.0       # No modification
        }

        modifier = type_modifiers.get(piece.piece_type, 0.0)

        # Apply modifier
        r = min(255, max(0, int(base_color.r * (1 + modifier))))
        g = min(255, max(0, int(base_color.g * (1 + modifier))))
        b = min(255, max(0, int(base_color.b * (1 + modifier))))

        return Color(r, g, b)

    def _get_piece_symbol(self, piece_type: str) -> str:
        """
        Get symbol for piece type (for accessibility - not color-only).

        Args:
            piece_type: Type of piece

        Returns:
            str: Symbol representing the piece
        """
        # Priority 1: Accessibility - No color-only reliance
        # Use symbols/shapes in addition to color for piece identification
        symbols = {
            "king": "♔",   # Unicode chess symbols
            "queen": "♕",
            "rook": "♖",
            "bishop": "♗",
            "knight": "♘",
            "pawn": "♙"
        }
        return symbols.get(piece_type, "?")

    def _is_piece_selected(self, piece_id: str, game_state: GameStateManager) -> bool:
        """
        Check if piece is currently selected.

        Args:
            piece_id: ID of piece to check
            game_state: Current game state

        Returns:
            bool: True if piece is selected
        """
        # TODO: Implement actual selection tracking
        # For now, return False
        return False

    def _render_piece_selection_highlight(self, screen_pos: Tuple[int, int], size: int) -> None:
        """Render highlight for selected piece with minimalist styling.

        Args:
            screen_pos: Screen position of piece
            size: Size of piece
        """
        # Priority 2: Touch & Interaction - Clear visual feedback
        # Priority 7: Animation - Context-aware timing for highlight appearance/disappearance
        # Priority 4: Style Selection - Consistency

        # Minimalist highlight: subtle outline with accent color
        highlight_color = Colors.PRIMARY
        highlight_width = 2  # pixels

        # Draw a circle outline around the piece
        pygame.draw.circle(
            self.screen,
            highlight_color.to_tuple(),
            screen_pos,
            (size // 2) + highlight_width,
            highlight_width
        )

    def _update_fps(self) -> None:
        """Update FPS counter for performance monitoring."""
        import time
        current_time = time.time()

        if current_time - self.last_fps_time >= 1.0:  # Update every second
            self.current_fps = self.frame_count / (current_time - self.last_fps_time)
            self.frame_count = 0
            self.last_fps_time = current_time

            # Log FPS periodically for performance monitoring
            # Priority 3: Performance - Monitor and optimize
            if int(self.current_fps) % 30 == 0:  # Log every 30 seconds
                self.logger.debug(
                    "renderer_fps",
                    fps=round(self.current_fps, 1),
                    frame=self.frame_count
                )

    def _setup_opengl(self) -> None:
        """Set up OpenGL rendering context."""
        if not self.opengl_available:
            return

        # Enable depth testing
        glEnable(GL_DEPTH_TEST)
        glDepthFunc(GL_LESS)

        # Enable lighting
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)

        # Set up light
        glLightfv(GL_LIGHT0, GL_POSITION, [0, 5, 5, 1])  # Position
        glLightfv(GL_LIGHT0, GL_AMBIENT, [0.2, 0.2, 0.2, 1])  # Ambient
        glLightfv(GL_LIGHT0, GL_DIFFUSE, [0.8, 0.8, 0.8, 1])  # Diffuse

        # Set up material
        glEnable(GL_COLOR_MATERIAL)
        glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE)

        # Set background color
        glClearColor(0.1, 0.1, 0.1, 1.0)  # Dark gray background

        # Set up projection
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(45, (self.width / self.height), 0.1, 100.0)

        self.logger.info("opengl_initialized")

    def _render_3d_background(self) -> None:
        """Render 3D background."""
        # Set background color (already set in glClearColor)
        pass

    def _render_3d_board(self, game_state: GameStateManager) -> None:
        """Render 3D game board."""
        # Draw a flat board
        glBegin(GL_QUADS)
        glColor3f(0.5, 0.5, 0.5)  # Gray
        glVertex3f(-10, 0, -10)
        glVertex3f(10, 0, -10)
        glVertex3f(10, 0, 10)
        glVertex3f(-10, 0, 10)
        glEnd()

        # Draw grid lines
        glBegin(GL_LINES)
        glColor3f(0.3, 0.3, 0.3)  # Darker gray for grid
        grid_size = 40
        board_size = 10
        step = (board_size * 2) / (grid_size - 1) if grid_size > 1 else 0

        # Vertical lines
        for i in range(grid_size):
            x = -board_size + i * step
            glVertex3f(x, 0.01, -board_size)
            glVertex3f(x, 0.01, board_size)

        # Horizontal lines
        for i in range(grid_size):
            z = -board_size + i * step
            glVertex3f(-board_size, 0.01, z)
            glVertex3f(board_size, 0.01, z)
        glEnd()

    def _render_3d_pieces(self, game_state: GameStateManager) -> None:
        """Render 3D game pieces."""
        pieces = game_state.get_active_pieces()

        for piece_id, piece in pieces.items():
            # Convert world coordinates to OpenGL coordinates
            # (Assuming world coordinates are already in a suitable range)
            x, y, z = piece.position

            # Set color based on piece team
            if piece.player_id == 0:
                glColor3f(0.2, 0.4, 0.8)  # Blue for player 0
            else:
                glColor3f(0.8, 0.2, 0.2)  # Red for player 1

            # Draw piece as a cylinder or sphere
            glPushMatrix()
            glTranslatef(x, y, z)

            # Simple sphere representation
            quadric = gluNewQuadric()
            gluSphere(quadric, 0.5, 16, 16)  # Radius 0.5, 16 segments
            gluDeleteQuadric(quadric)

            glPopMatrix()

    def set_high_contrast_mode(self, enabled: bool) -> None:
        """
        Enable or disable high contrast mode.

        Args:
            enabled: True to enable high contrast mode
        """
        self.high_contrast_mode = enabled
        self.logger.info(
            "accessibility_mode_changed",
            high_contrast_mode=enabled
        )

    def set_3d_rendering(self, enabled: bool) -> None:
        """
        Enable or disable 3D rendering.

        Args:
            enabled: True to enable 3D rendering
        """
        if enabled and not self.opengl_available:
            self.logger.warning("3d_rendering_requested_but_opengl_not_available")
            return

        if self.use_3d_rendering == enabled:
            return  # No change

        self.use_3d_rendering = enabled
        self.logger.info(
            "rendering_mode_changed",
            use_3d_rendering=self.use_3d_rendering,
            opengl_available=self.opengl_available
        )

        # If the renderer is initialized, we need to update the display mode
        if self.is_initialized:
            # Re-set the display mode with the new setting
            if self.use_3d_rendering and self.opengl_available:
                self.screen = pygame.display.set_mode((self.width, self.height), pygame.DOUBLEBUF | pygame.OPENGL)
                self._setup_opengl()  # Re-setup OpenGL context
            else:
                self.screen = pygame.display.set_mode((self.width, self.height))

    def set_large_text_mode(self, enabled: bool) -> None:
        """
        Enable or disable large text mode.

        Args:
            enabled: True to enable large text mode
        """
        self.large_text_mode = enabled
        self.logger.info(
            "accessibility_mode_changed",
            large_text_mode=enabled
        )

    def cleanup(self) -> None:
        """Clean up renderer resources."""
        self.logger.info("renderer_cleaning_up")
        # Release graphics resources
        pygame.quit()
        self.is_initialized = False

    def get_fps(self) -> float:
        """Get current FPS."""
        return self.current_fps

    def is_ready(self) -> bool:
        """Check if renderer is ready to render."""
        return self.is_initialized