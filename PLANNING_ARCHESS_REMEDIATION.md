# ArChess 2D UI / Runtime Migration Plan

## Goal
Move ArChess from the failed overlapping shell/runtime approach to a clean, professional 2D chess UI while preserving the existing physics game core.

## Principles

1. Do not replace the authoritative physics/game-state system.
2. Use mature open-source UI components instead of building a component system from scratch.
3. Keep one browser boot path and remove obsolete runtime shims.
4. Keep 3D completely deferred until the 2D product is stable.
5. Maintain positive, negative, function-level and regression coverage.
6. Do not promote to `main` until the verification gate is satisfied.
7. GitHub Actions remain disabled.

## Chosen stack

- Bootstrap 5.3.8 + Bootstrap Icons for responsive application chrome.
- gchessboard 1.4.0 for the responsive chessboard surface.
- Existing ArChess canvas for continuous physics piece motion, trajectory, collisions and effects.
- Existing Flask/backend and authoritative physics modules remain in place.

## Execution stages

### Stage 1 — Inventory and freeze
- Classify UI/runtime files as keep, modify, replace, delete or defer.
- Freeze the game rules/physics contract.

### Stage 2 — Remove broken runtime layers
- Remove professional shell/runtime, render routing, 3D renderer/camera and duplicate input/bootstrap shims.
- Remove obsolete 3D tests and UI tests that encode removed architecture.

### Stage 3 — Build 2D foundation
- Add Bootstrap-based page composition.
- Add gchessboard board presentation.
- Keep physics canvas transparent and layered above the board.
- Use local Cburnett-derived piece art for live physics pieces.

### Stage 4 — Interaction
- Preserve select → drag → launch → physics → collision → damage → settle → next turn flow.
- Add/retain clear aim and power feedback.
- Harden coordinate conversion, resize and input rejection.

### Stage 5 — UX polish
- Board-first layout.
- Professional player cards, HP/status, battle log and armory.
- Themes: Wood, Dark, Light.
- Responsive desktop/tablet/mobile layout.

### Stage 6 — Verification
- Python/API regression.
- Browser positive/negative cases.
- Multi-browser responsive matrix where locally available.
- Function-level tests and JavaScript tests.
- Static forbidden-runtime/3D checks.
- License/asset audit.
- Final tracker update.

### Stage 7 — Promotion
Only after all required checks are passing:
- update tracker with exact verified commit;
- compare development branch to `main`;
- promote the verified commit to `main`;
- verify `main` has no Actions workflow reintroduced.

## Current status

Stage 1–5 implementation is in progress on `ui-rebuild-2d-v2`. The browser test gate is intentionally still open because this environment cannot drive the user's local Flask browser. No claim of full browser verification has been made yet.
