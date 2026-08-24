"""Deterministic hashes for authoritative ArChess match state."""
from __future__ import annotations

import hashlib
import json
from typing import Any


_INTEGRITY_FIELDS = {"integrity"}


def _hash_payload(state: dict[str, Any]) -> dict[str, Any]:
    payload = dict(state)
    for field in _INTEGRITY_FIELDS:
        payload.pop(field, None)
    return payload


def canonical_state(state: dict[str, Any]) -> str:
    """Return a stable JSON representation excluding self-referential integrity metadata."""
    return json.dumps(_hash_payload(state), sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def state_hash(state: dict[str, Any]) -> str:
    """Return SHA-256 over the canonical match snapshot."""
    return hashlib.sha256(canonical_state(state).encode("utf-8")).hexdigest()


def shot_hash(pre_state: dict[str, Any], intent: dict[str, Any], post_state: dict[str, Any]) -> str:
    """Bind a launch intent to its canonical pre/post states."""
    payload = {"intent": intent, "post": _hash_payload(post_state), "pre": _hash_payload(pre_state)}
    return state_hash(payload)
