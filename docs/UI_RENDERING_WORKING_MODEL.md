# ArChess 2D Rendering Working Model

## Contract

The game state, rules, physics, damage, turn resolution and win conditions remain authoritative. The UI consumes `gameState`; it does not replace the simulation.

## Active rendering stack

1. Bootstrap 5.3.8 + Bootstrap Icons provide responsive application chrome, cards, controls, forms and dialogs.
2. `gchessboard` 1.4.0 provides the chessboard presentation surface and configurable square styling.
3. The ArChess 2D canvas is a transparent physics presentation/input layer positioned over the board.
4. `main.js` remains the authoritative game loop and owns selection, launch, physics resolution and turn transitions.

The library board is intentionally kept empty because ArChess pieces move continuously instead of from square to square. The physics renderer draws the live pieces at their actual simulated coordinates.

## Active interaction flow

`select → drag → aim → release → launch → physics → collision/damage → settle → next turn`

Pointer and touch input remain attached to the ArChess canvas. A library-load failure falls back to the built-in 2D board drawing without changing game rules.

## 2D themes

- Wood — warm tournament-inspired board and brass/amber presentation.
- Dark — graphite/blue competitive arena.
- Light — clean analysis-oriented appearance.

Theme state is shared with Bootstrap's color mode and gchessboard square variables.

## Deferred work

3D rendering, camera controls, WebGL assets, 3D piece geometry and 2D/3D switching are intentionally deferred. They must not be loaded by the current application entrypoint.

## Acceptance

- The page boots with one game loop.
- The board is visible before the first interaction.
- All 32 live pieces render in the initial position.
- Selection and drag remain responsive.
- Physics behavior is unchanged.
- Theme and resize changes do not reset game state.
- Browser errors are logged through ArChess observability.
- No legacy professional shell/runtime is loaded.
