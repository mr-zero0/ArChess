"""Small, dependency-light helpers for gameplay domain observability."""
from __future__ import annotations

import logging
from typing import Any

from core.logging_config import log_event

LOGGER = logging.getLogger("archess.game")


def game_event(event: str, *, message: str | None = None, level: int = logging.INFO, fields: dict[str, Any] | None = None) -> None:
    """Emit a structured gameplay event without changing gameplay behavior."""
    log_event(LOGGER, level, event, message, fields=fields)
