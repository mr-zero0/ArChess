# ArChess

Physics-based chess battle: chess pieces become physics projectiles while the match remains server-authoritative for competitive play.

## Run locally

```powershell
python -m pip install -r requirements.txt
python game.py
```

Open `http://127.0.0.1:5000/`.

## Structure

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
├─ templates/              # Server-rendered HTML
├─ static/                 # Browser UI, 2D/3D rendering and assets
├─ tests/                  # Python, browser and JavaScript regression tests
├─ scripts/                # Maintenance/performance/operations scripts
├─ docs/                   # Detailed product, engineering and legal docs
├─ deployment/             # Docker/Gunicorn deployment configuration
└─ .github/                # CI and issue templates
```

## Verification

The release gate requires Python/API tests, browser/functional regression, 2D/3D rendering checks, positive/negative gameplay cases, responsive UI checks, and the JavaScript test suite to pass before the verification PR is merged.

See `ARCHESS_TRACKER.md` for the detailed roadmap and acceptance status.

## Open-source assets

ArChess uses documented open-source UI/rendering assets. See `THIRD_PARTY_NOTICES.md` and `docs/ASSET_LICENSES.md` for attribution and license details.
