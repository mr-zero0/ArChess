# Contributing to ArChess

## Development setup

1. Create a Python virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Run the Flask app with `python app.py`.

## Checks before submitting

- Run `python -m pytest -q`.
- Run `node --test tests/physics.test.js`.
- Keep gameplay physics deterministic and preserve the documented game rules.
- Update `ARCHESS_PRODUCT_DESIGN_TRACKER.md` when a tracked acceptance item changes.

## Pull requests

Describe the player-facing behavior, tests run, and any browser or device coverage. Keep commits focused and do not include secrets or generated files.
