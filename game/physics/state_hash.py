"""Deterministic hashes for authoritative ArChess match state."""
from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_state(state: dict[str, Any]) -> str:
    """Return a stable JSON representation suitable for hashing."""
    return json.dumps(state, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def state_hash(state: dict[str, Any]) -> str:
    """Return SHA-256 over the canonical match snapshot."""
    return hashlib.sha256(canonical_state(state).encode("utf-8")).hexdigest()


def shot_hash(pre_state: dict[str, Any], intent: dict[str, Any], post_state: dict[str, Any]) -> str:
    """Bind a launch intent to its canonical pre/post states."""
    payload = {"intent": intent, "post": post_state, "pre": pre_state}
    return state_hash(payload)
