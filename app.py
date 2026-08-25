"""Compatibility entrypoint for the legacy test suite and local tooling."""

import importlib.util
from pathlib import Path


_ROOT = Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("archess_app_entry", _ROOT / "game.py")
if _SPEC is None or _SPEC.loader is None:
    raise ImportError("Unable to load ArChess application entrypoint")

_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)

create_app = _MODULE.create_app
app = create_app()
db = _MODULE.db
migrate = _MODULE.migrate
limiter = _MODULE.limiter
