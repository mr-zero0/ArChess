"""Test compatibility bootstrap for the single-entrypoint application layout.

The production repository intentionally keeps ``game.py`` as the only root
application entrypoint. Older tests imported former root-level compatibility
modules, so expose those names only during pytest collection.
"""

import importlib.util
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_game_module():
    existing = sys.modules.get("archess_app")
    if existing is not None:
        return existing

    spec = importlib.util.spec_from_file_location("archess_app", ROOT / "game.py")
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load game.py for tests")
    module = importlib.util.module_from_spec(spec)
    sys.modules["archess_app"] = module
    spec.loader.exec_module(module)
    return module


def _install_compatibility_modules():
    game_module = _load_game_module()

    if "app" not in sys.modules:
        app_module = types.ModuleType("app")
        app_module.create_app = game_module.create_app
        app_module.app = game_module.create_app()
        # Initialize database for the app
        with app_module.app.app_context():
            game_module.db.drop_all()
            game_module.db.create_all()
        app_module.db = game_module.db
        app_module.migrate = game_module.migrate
        app_module.limiter = game_module.limiter
        sys.modules["app"] = app_module

    if "extensions" not in sys.modules:
        extensions_module = types.ModuleType("extensions")
        extensions_module.db = game_module.db
        extensions_module.migrate = game_module.migrate
        extensions_module.limiter = game_module.limiter
        sys.modules["extensions"] = extensions_module

    if "logging_config" not in sys.modules:
        from core.logging_config import JsonFormatter, configure_logging

        logging_module = types.ModuleType("logging_config")
        logging_module.JsonFormatter = JsonFormatter
        logging_module.configure_logging = configure_logging
        sys.modules["logging_config"] = logging_module


_install_compatibility_modules()
