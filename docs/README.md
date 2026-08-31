# ArChess — Engineering Reference

ArChess is a browser-based physics chess battle game. Chess pieces are physical projectiles: players select a living piece, drag backward, release, and let the 2D physics simulation resolve movement, collision, damage, destruction, and turn settlement.

## Current product scope

The active product is **2D only**. 3D rendering, WebGL, camera controls, 2D/3D switching, and related runtime assets are intentionally deferred until the 2D experience is stable.

The current local arena is playable without signing in. Authentication, profiles, private multiplayer, matchmaking, ranked play, persistence, and other account-dependent features remain part of the broader application and must not be confused with the local-game access path.

## Active browser architecture

```text
Flask
  -> templates/index.html
  -> Bootstrap application chrome
  -> gchessboard 1.4.0 board surface
  -> transparent ArChess 2D canvas
  -> existing game state / physics / combat
```

`gchessboard` is presentation-only. The ArChess canvas remains responsible for continuous piece positions, slingshot interaction, launch trajectories, physics, collisions, combat effects, and game-state presentation.

## Gameplay contract

```text
select -> drag -> aim -> release -> launch -> physics
       -> collision/damage -> destruction -> settle -> next turn
```

Traditional chess movement rules are not used after launch. Victory is based on the opposing King reaching 0 HP.

The authoritative implementation remains in the existing game-state and physics modules. UI code must not become a second source of truth for collision, damage, turn resolution, or win state.

## Current UI stack

- Bootstrap 5.3.8 for responsive application composition.
- Bootstrap Icons 1.13.1 for iconography.
- gchessboard 1.4.0 for the chessboard presentation surface.
- Existing ArChess 2D canvas renderer for live physics pieces and effects.
- Local Cburnett-derived SVG artwork for piece presentation.

The project direction is informed by the open-source Python-Easy-Chess-GUI project for board-first UX, board sizing, themes, and game-information presentation. Its desktop application code is not bundled.

## Local development

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Run the development server:

```powershell
python game.py
```

Open:

```text
http://127.0.0.1:5000/
```

The direct launcher disables Flask's debug reloader so local verification uses one deterministic server process.

## Testing

The repository maintains separate Python, JavaScript, browser, positive, negative, function-level, responsive, and static runtime checks.

Python baseline currently includes the existing backend/API/authoritative simulation suites. Browser tests are opt-in through `RUN_BROWSER_MATRIX=1`. Set `PLAYWRIGHT_HEADLESS=0` for visible local browser diagnosis.

GitHub Actions are intentionally disabled. Verification is run locally and recorded in `ARCHESS_TRACKER.md`.

## Required gameplay checks

The minimum browser verification path is:

1. White can select and drag a living piece.
2. A meaningful release enters physics.
3. Collision applies the existing damage/collision rules without freezing the runtime.
4. Physics settles cleanly.
5. Control changes to Black.
6. Black can select and launch.
7. A second settled turn returns control to White.

Negative coverage must also verify wrong-team selection, zero/invalid releases, input during physics, dead pieces, out-of-bounds input, storage failures, renderer errors, API failures, and clean shutdown.

## Documentation sources of truth

- `ARCHESS_TRACKER.md` — consolidated product, engineering, QA, security, accessibility, licensing, and promotion tracker.
- `PLANNING_ARCHESS_REMEDIATION.md` — migration/cleanup plan and staged execution record.
- `docs/UI_RENDERING_WORKING_MODEL.md` — active 2D rendering and interaction contract.
- `THIRD_PARTY_NOTICES.md` — open-source dependency attribution.
- `docs/ASSET_LICENSES.md` — bundled artwork/license inventory.
- `docs/SECURITY.md`, `docs/SECURITY_RELEASE_CHECKLIST.md` — security requirements and release checks.
- `docs/PRIVACY.md`, `docs/TERMS.md`, `docs/ACCOUNT_MODEL.md` — account, privacy, and terms documentation.

Historical 3D verification documents were removed from the active product branch because 3D is deferred for this milestone.

## Repository hygiene

Do not reintroduce deleted professional-shell, duplicate-input, 3D renderer, WebGL, or release-boot layers merely to satisfy old tests. New tests and documentation must describe the active 2D architecture. Preserve useful original requirements by moving them into the tracker or appropriate current documentation rather than carrying contradictory stale files.
