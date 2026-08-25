"""Compatibility application entrypoint for tests and local tooling."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("archess_app_entry", ROOT / "game.py")
if SPEC is None or SPEC.loader is None:
    raise ImportError("Unable to load game.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

create_app = MODULE.create_app
app = create_app()
db = MODULE.db
migrate = MODULE.migrate
limiter = MODULE.limiter
