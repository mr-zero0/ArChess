# ArChess

Physics-based chess battle: chess pieces become physics projectiles while the match remains server-authoritative for competitive play.

## Run locally

```powershell
python -m pip install -r requirements.txt
python game.py
```

Open `http://127.0.0.1:5000/`.

## Current UI

ArChess currently runs in **2D mode only**. The application chrome uses Bootstrap, the board surface uses the open-source `gchessboard` component, and the existing ArChess physics renderer remains responsible for continuous piece motion, launch trajectories, collisions and combat effects.

The product/UX direction is informed by the open-source Python-Easy-Chess-GUI project, especially its board-first layout, real piece presentation, board sizing, themes and clear game information panels. ArChess does not bundle that desktop application's code.

## Architecture

```text
Flask
  -> index template
  -> Bootstrap application chrome
  -> gchessboard 2D board surface
  -> ArChess transparent physics layer
  -> existing game state / physics engine
```

The UI is presentation-only. The physics/game state remains authoritative and is not replaced by conventional square-to-square chess movement.

## Repository structure

```text
ArChess/
├─ game.py                 # Flask application entrypoint
├─ ARCHESS_TRACKER.md      # Product, engineering and verification tracker
├─ README.md               # Project overview and local setup
├─ config/                 # Environment/configuration
├─ core/                   # Shared Flask extensions and platform helpers
├─ game/                   # Gameplay, auth, matchmaking, physics and models
├─ match_sessions/         # Match session lifecycle
├─ migrations/             # Database migrations
├─ templates/              # Server-rendered HTML shell
├─ static/                 # Browser UI, 2D renderer and assets
├─ tests/                  # Python, browser and JavaScript regression tests
├─ scripts/                # Maintenance/performance/operations scripts
├─ docs/                   # Detailed product, engineering and legal docs
└─ deployment/             # Docker/Gunicorn deployment configuration
```

## Verification

The release gate requires Python/API tests, browser/functional regression, 2D rendering checks, positive/negative gameplay cases, responsive UI checks, function-level logging checks, and the JavaScript test suite to pass before the work is promoted to `main`.

GitHub Actions are intentionally disabled for this project. Verification is tracked in `ARCHESS_TRACKER.md` and performed without automatically triggered CI runs.

## Open-source UI and assets

ArChess uses documented open-source UI libraries and artwork. See `THIRD_PARTY_NOTICES.md` and `docs/ASSET_LICENSES.md` for attribution and license details.

3D rendering is explicitly deferred and is not loaded, bundled or tested by the current 2D application.
