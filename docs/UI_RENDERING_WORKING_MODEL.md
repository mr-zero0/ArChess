# ArChess Rendering Working Model

## Contract
The game/rules/physics state remains the source of truth. The presentation layer consumes `gameState` and renders it. No move validation, turn enforcement, physics, win condition, or variant rules are changed by this UI model.

## Rendering stack
- Three.js board, frame, tiles, pieces, lighting and shadows.
- Existing 2D canvas remains mounted as the input/event surface but is visually transparent in final presentation mode.
- Existing `main.js` continues to drive the authoritative game state and input.
- `final_ui.js` owns the product shell, navigation, profile/social drawers and player-facing presentation.

## Player-facing multiplayer
Rooms remain an internal server concept. The visible product flow is Play / Friends / Challenges / Leaderboard / Profile.

## Working-model acceptance
- Page loads without a JavaScript exception when WebGL is available.
- 3D board and pieces are visible.
- Existing pointer input still reaches the game canvas.
- Selecting and launching a piece updates the 3D scene from `gameState`.
- Captures/destruction animate in 3D.
- The legacy side panels and room controls are not visible in final presentation mode.
- Reduced-motion users get a static presentation.
- If WebGL is unavailable, the existing 2D renderer remains available as fallback.
