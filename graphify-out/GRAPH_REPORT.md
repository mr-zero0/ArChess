# Graph Report - Archess  (2026-09-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 638 nodes · 1064 edges · 47 communities (38 shown, 9 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- CombatSystem
- PhysicsEngine
- UIManager
- PieceManager
- GameLogger
- InputHandler
- ArchessApplication
- test_config.py
- GameStateManager
- PieceFactory
- get_logger
- Renderer
- InputAction
- manager.py
- test_game_state.py
- AccessibilityUtils
- .render_frame
- test_ui_ux.py
- ._render_ui
- Piece
- handler.py
- Color
- ._render_pieces
- game_state.py
- UpdateRecord
- GameState
- GameStats
- UpdateTracker
- renderer.py
- TurnState
- .start_turn
- PerformanceUtils
- TouchTargetUtils
- ._render_overlay
- InputType
- PieceSpawnData
- Colors
- .initialize
- Typography
- core/__init__.py
- app/__init__.py
- .unregister_action_callback
- input/__init__.py
- rendering/__init__.py
- ui/__init__.py
- archess/__init__.py
- unit/__init__.py

## God Nodes (most connected - your core abstractions)
1. `GameStateManager` - 75 edges
2. `Renderer` - 48 edges
3. `InputHandler` - 39 edges
4. `UIManager` - 38 edges
5. `Piece` - 35 edges
6. `CombatSystem` - 31 edges
7. `PhysicsEngine` - 31 edges
8. `PieceManager` - 26 edges
9. `ArchessApplication` - 26 edges
10. `get_logger()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `main()` --uses--> `CombatSystem`  [INFERRED]
  play_game.py → src/archess/app/combat/combat_system.py
- `test_collision_event_dataclass()` --uses--> `CollisionEvent`  [INFERRED]
  tests/unit/test_physics_engine.py → src/archess/app/physics/physics_engine.py
- `test_physics_engine_update_with_collision()` --uses--> `CollisionEvent`  [INFERRED]
  tests/unit/test_physics_engine.py → src/archess/app/physics/physics_engine.py
- `main()` --uses--> `PhysicsEngine`  [INFERRED]
  play_game.py → src/archess/app/physics/physics_engine.py
- `main()` --uses--> `Renderer`  [INFERRED]
  play_game.py → src/archess/app/rendering/renderer.py

## Import Cycles
- None detected.

## Communities (47 total, 9 thin omitted)

### Community 0 - "CombatSystem"
Cohesion: 0.06
Nodes (40): CombatSystem, DamageEvent, Combat system for Archess game. Handles damage calculation, combat resolution,…, Process a collision event to determine if damage should be applied. Args:…, Calculate damage for both pieces based on collision. Args: collision: Collision…, Represents a damage event applied to a piece., Apply damage to a piece. Args: target_piece_id: ID of piece receiving damage…, Check if game over conditions have been met. (+32 more)

### Community 1 - "PhysicsEngine"
Cohesion: 0.06
Nodes (34): Physics system for Archess game. Handles collision detection, response, and…, PhysicsEngine, Physics engine for Archess game. Handles collision detection, response, and…, Integrate forces and update positions and velocities. Args: dt: Time step, Detect collisions between pieces using broad and narrow phase., Check if two pieces' bounding spheres overlap. Args: piece_a: First piece…, Get the size/radius of a piece type. Args: piece_type: Type of piece Returns:…, Check for collision between two pieces and return collision event if they… (+26 more)

### Community 2 - "UIManager"
Cohesion: 0.05
Nodes (19): Set up input action callbacks., Update and render the UI for one frame. Args: delta_time: Time since last frame…, Process UI actions and update game state accordingly., Handle piece selection., Handle start of drag gesture., Handle end of drag gesture., Manages the UI system applying all UI/UX Pro Max priorities. Coordinates…, Handle high contrast toggle. (+11 more)

### Community 3 - "PieceManager"
Cohesion: 0.06
Nodes (32): PieceManager, PieceStats, Piece manager for Archess game. Handles piece lifecycle, grouping, and piece-…, Get statistics for pieces, optionally filtered by player. Args: player_id:…, Check if a piece is alive (has HP > 0 and is active). Args: piece_id: ID of the…, Get the count of living pieces, optionally filtered by player. Args: player_id:…, Statistics for a group of pieces., Clean up piece manager resources. (+24 more)

### Community 4 - "GameLogger"
Cohesion: 0.10
Nodes (17): LogRecord, GameLogger, Any, Structured logging setup for Archess game. Implements proper application…, Structured logger for Archess game with correlation ID support., Set up logging handlers with structured formatting., Set correlation ID for tracking game sessions., Get current correlation ID. (+9 more)

### Community 5 - "InputHandler"
Cohesion: 0.07
Nodes (15): InputHandler, Check if screen reader is available (platform-specific)., Initialize the input handler. Returns: bool: True if initialization successful, Check if touch input is available. Returns: bool: True if touch input available, Check if keyboard navigation should be preferred (accessibility). Returns:…, Get recommended touch target size. Returns: int: Touch target size in pixels…, Get recommended touch target spacing. Returns: int: Spacing in pixels (min 8px…, Clean up input handler resources. (+7 more)

### Community 6 - "ArchessApplication"
Cohesion: 0.10
Nodes (15): ArchessApplication, Request graceful shutdown of the application., Check if shutdown has been requested., Get current time in seconds., Process user input and update game state accordingly., Update game state (turns, timers, etc.)., Render a single frame., Update audio system (placeholder for future implementation). (+7 more)

### Community 7 - "test_config.py"
Cohesion: 0.08
Nodes (25): AudioConfig, CombatConfig, GameConfig, PhysicsConfig, PieceConfig, Game-wide configuration settings., Physics engine configuration., Combat system configuration. (+17 more)

### Community 8 - "GameStateManager"
Cohesion: 0.09
Nodes (12): Initialize the application and all subsystems. Returns: bool: True if…, GameStateManager, Manages the overall game state and coordinates between systems., Initialize a new game session. Returns: bool: True if initialization successful, Add a piece to the game. Args: piece: Piece to add, Remove a piece from the game. Args: piece_id: ID of piece to remove Returns:…, Get all pieces (active and inactive)., Get all active pieces. (+4 more)

### Community 9 - "PieceFactory"
Cohesion: 0.12
Nodes (20): PieceFactory, Piece factory for Archess game. Handles creation of pieces with proper…, Clean up piece factory resources., Unit tests for Archess piece factory., Test creating a standard set for player 1., Test that piece factory can be created., Test piece factory cleanup., Test creating a basic piece. (+12 more)

### Community 10 - "get_logger"
Cohesion: 0.12
Nodes (13): main(), Run the game simulation., main(), Application bootstrap for Archess game. Handles initialization, configuration,…, Entry point for the Archess application., get_logger(), Get the global game logger instance., Setup and configure logging for the application. (+5 more)

### Community 11 - "Renderer"
Cohesion: 0.10
Nodes (11): Render 3D game pieces., Enable or disable high contrast mode. Args: enabled: True to enable high…, Enable or disable 3D rendering. Note: Requires restarting the renderer to take…, Enable or disable large text mode. Args: enabled: True to enable large text mode, Clean up renderer resources., Check if renderer is ready to render., Main renderer for Archess game. Applies UI/UX best practices from UI/UX Pro Max…, Render debug information if enabled with minimalist styling. (+3 more)

### Community 12 - "InputAction"
Cohesion: 0.15
Nodes (9): InputAction, Process pending input and return actions to execute. Args: game_state: Current…, Process touch input for piece selection and dragging., Process keyboard input with accessibility considerations., Check if mouse click occurred on a UI element and return corresponding action.…, Check if mouse click occurred on a menu button. Returns: Optional[InputAction]:…, Semantic input actions for game., Register a callback for a specific input action. Args: action: The input action… (+1 more)

### Community 13 - "manager.py"
Cohesion: 0.15
Nodes (9): demo_input_to_game_state_flow(), Demonstrate how input flows through the system to change game state., UI Manager for Archess game. Coordinates rendering, input, and applies…, # TODO: Implement piece selection logic, # TODO: Implement drag start logic, Current state of the UI system., # TODO: Implement drag update logic, # TODO: Implement drag end logic (+1 more)

### Community 14 - "test_game_state.py"
Cohesion: 0.15
Nodes (12): Unit tests for Archess game state., Test adding and removing pieces., Test various get piece methods., Test piece take_damage method., Test Piece.is_alive method., Test starting a turn when not in RUNNING state., test_add_remove_piece(), test_end_turn() (+4 more)

### Community 15 - "AccessibilityUtils"
Cohesion: 0.23
Nodes (9): AccessibilityUtils, Utility functions for accessibility compliance., Calculate contrast ratio between two colors. Returns ratio from 1:1 to 21:1.…, Check if color pair meets accessibility guidelines. Priority 1: Accessibility -…, Get accessible text color (black or white) for given background., Test accessibility utility functions., Test that color combinations meet accessibility guidelines., test_accessibility_utils() (+1 more)

### Community 16 - ".render_frame"
Cohesion: 0.17
Nodes (6): Render a single frame applying UI/UX principles. Args: game_state: Current game…, Render background elements with minimalist design., Render game board with UI/UX considerations. Priority 5: Layout & Responsive -…, Present the rendered frame., Render a tracking cursor at the specified position. Args: position: Screen…, Update FPS counter for performance monitoring.

### Community 17 - "test_ui_ux.py"
Cohesion: 0.17
Nodes (11): Unit tests for UI/UX systems applying UI/UX Pro Max principles., Test that input actions are defined correctly., Test that touch target sizes meet UI/UX guidelines., Test that renderer initializes correctly., Test that input handler initializes correctly., Test that UI manager can be created., test_input_action_enum(), test_input_handler_initialization() (+3 more)

### Community 18 - "._render_ui"
Cohesion: 0.18
Nodes (6): Any, Render UI elements with UI/UX considerations. Priority 8: Forms & Feedback -…, Render current turn indicator with minimalist styling., Render player information (health, pieces remaining) with minimalist styling., Render feedback for current action (aiming, power, etc.) with minimalist…, Render menu buttons if menu is active with professional styling.

### Community 19 - "Piece"
Cohesion: 0.22
Nodes (6): Piece, Represents a game piece with basic properties., Apply damage to piece and return actual damage dealt. Args: damage: Amount of…, Check if piece is alive and active., Create a standard set of pieces for a player. Args: player_id: ID of the player…, Create a new piece with the specified parameters. Args: piece_type: Type of…

### Community 20 - "handler.py"
Cohesion: 0.20
Nodes (8): InputEvent, Input handler for Archess game applying UI/UX best practices. Implements…, # TODO: Implement actual platform detection, # TODO: Initialize actual input system (GLFW, SDL, etc.), # TODO: Process actual input events from OS/window system, # TODO: Implement actual touch availability check, # TODO: Release input resources, Input event with positional and semantic data.

### Community 21 - "Color"
Cohesion: 0.20
Nodes (6): Color, Clear the frame with specified color., RGBA color with semantic naming for accessibility., Convert to (r, g, b, a) tuple., Convert to hex color string., Get color for a piece based on team and type. Args: piece: Piece to get color…

### Community 22 - "._render_pieces"
Cohesion: 0.20
Nodes (5): Render game pieces with UI/UX considerations. Priority 2: Touch & Interaction -…, Convert world coordinates to screen coordinates. Args: world_pos: Position in…, Get symbol for piece type (for accessibility - not color-only). Args:…, Check if piece is currently selected. Args: piece_id: ID of piece to check…, Render highlight for selected piece with minimalist styling. Args: screen_pos:…

### Community 23 - "game_state.py"
Cohesion: 0.31
Nodes (4): Configuration module for Archess game. Centralizes all configurable values as…, Game state management for Archess. Implements state tracking, update tracking,…, Pieces system for Archess game. Handles piece creation, management, and piece-…, Unit tests for Archess piece manager.

### Community 24 - "UpdateRecord"
Cohesion: 0.22
Nodes (6): Any, Record a game state update. Args: event_type: Type of event that occurred…, Get recent updates for debugging., Get all updates of a specific event type., Record of a game state change for debugging and observability., UpdateRecord

### Community 25 - "GameState"
Cohesion: 0.25
Nodes (7): GameState, Possible states of the game., Get current game state., Test ending the game., Test initializing a new game., test_end_game(), test_initialize_game()

### Community 26 - "GameStats"
Cohesion: 0.25
Nodes (6): GameStats, Tracking of game statistics., Test that game state manager can be created., Test GameStats dataclass., test_game_state_manager_creation(), test_game_stats_dataclass()

### Community 27 - "UpdateTracker"
Cohesion: 0.25
Nodes (6): Tracks important game state changes for debugging and observability., Clear update history (useful for testing)., Get the update tracker., UpdateTracker, Test game state checking methods., test_game_state_checks()

### Community 28 - "renderer.py"
Cohesion: 0.29
Nodes (7): Enum, Renderer for Archess game applying UI/UX best practices. Implements Priority…, Render layers for proper z-ordering., # TODO: Use sprite batching, # TODO: Implement proper camera transformation, # TODO: Implement actual selection tracking, RenderLayer

### Community 29 - "TurnState"
Cohesion: 0.29
Nodes (6): Enum, States within a turn., Get current turn state., TurnState, Test starting a turn., test_start_turn()

### Community 30 - ".start_turn"
Cohesion: 0.33
Nodes (3): Start a new turn. Returns: bool: True if turn started successfully, End the current turn., End the current game. Args: winner: Player ID of winner (None for draw/tie)

### Community 31 - "PerformanceUtils"
Cohesion: 0.33
Nodes (4): PerformanceUtils, Utility functions for performance optimization., Determine if sprite batching should be used for performance. Priority 3:…, Get recommended FPS for smooth experience.

### Community 32 - "TouchTargetUtils"
Cohesion: 0.33
Nodes (4): Utility functions for touch target compliance., Get minimum touch target size in pixels. Priority 2: Touch & Interaction - Min…, Get minimum spacing between touch targets. Priority 2: Touch & Interaction -…, TouchTargetUtils

### Community 33 - "._render_overlay"
Cohesion: 0.33
Nodes (3): Render overlay elements (pause menu, game over, etc.)., Render pause menu overlay with minimalist styling., Render game over overlay with minimalist styling.

### Community 34 - "InputType"
Cohesion: 0.50
Nodes (4): InputType, Types of input events., Test that input types are defined correctly., test_input_type_enum()

### Community 35 - "PieceSpawnData"
Cohesion: 0.50
Nodes (4): PieceSpawnData, Data needed to spawn a piece., Test PieceSpawnData dataclass., test_piece_spawn_data_dataclass()

### Community 36 - "Colors"
Cohesion: 0.50
Nodes (4): Colors, Semantic color tokens following accessibility guidelines., Test that semantic colors are defined correctly., test_semantic_colors()

### Community 38 - "Typography"
Cohesion: 0.50
Nodes (4): Typography settings following accessibility guidelines., Typography, Test that typography meets accessibility guidelines., test_typography_accessibility()

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameStateManager` connect `GameStateManager` to `CombatSystem`, `PhysicsEngine`, `UIManager`, `PieceManager`, `InputHandler`, `ArchessApplication`, `PieceFactory`, `get_logger`, `Renderer`, `InputAction`, `manager.py`, `test_game_state.py`, `.render_frame`, `test_ui_ux.py`, `._render_ui`, `handler.py`, `._render_pieces`, `game_state.py`, `GameState`, `GameStats`, `UpdateTracker`, `renderer.py`, `TurnState`, `.start_turn`, `._render_overlay`?**
  _High betweenness centrality (0.297) - this node is a cross-community bridge._
- **Why does `Renderer` connect `Renderer` to `._render_overlay`, `UIManager`, `PieceManager`, `.initialize`, `ArchessApplication`, `GameStateManager`, `get_logger`, `manager.py`, `.render_frame`, `test_ui_ux.py`, `._render_ui`, `Piece`, `Color`, `._render_pieces`, `GameState`, `renderer.py`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `UIManager` connect `UIManager` to `InputHandler`, `ArchessApplication`, `GameStateManager`, `get_logger`, `Renderer`, `InputAction`, `manager.py`, `test_ui_ux.py`, `GameState`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `GameStateManager` (e.g. with `demo_input_to_game_state_flow()` and `main()`) actually correct?**
  _`GameStateManager` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `Renderer` (e.g. with `main()` and `ArchessApplication`) actually correct?**
  _`Renderer` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `InputHandler` (e.g. with `main()` and `ArchessApplication`) actually correct?**
  _`InputHandler` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `UIManager` (e.g. with `demo_input_to_game_state_flow()` and `main()`) actually correct?**
  _`UIManager` has 9 INFERRED edges - model-reasoned connections that need verification._