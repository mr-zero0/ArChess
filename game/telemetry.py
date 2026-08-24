import hashlib
import os
from collections import Counter
from datetime import datetime, timedelta, timezone

from flask import current_app
from sqlalchemy import func

from extensions import db
from game.models.telemetry import TelemetryEvent

EVENT_TYPES = {
    "queue_join",
    "queue_leave",
    "match_found",
    "ranked_result",
    "progression_level_up",
    "cosmetic_equip",
    "room_started",
    "room_finished",
    "game_error",
}


def actor_hash(guest_id):
    if not guest_id:
        return None
    salt = current_app.config.get("TELEMETRY_SALT") or os.environ.get("TELEMETRY_SALT") or current_app.config.get("SECRET_KEY", "dev")
    return hashlib.sha256(f"{salt}:{guest_id}".encode("utf-8")).hexdigest()


def record_event(event_type, *, guest_id=None, room_id=None, payload=None, commit=False):
    if event_type not in EVENT_TYPES:
        raise ValueError("unsupported telemetry event type")
    event = TelemetryEvent(
        event_type=event_type,
        actor_hash=actor_hash(guest_id),
        room_id=room_id,
        payload=payload or {},
    )
    db.session.add(event)
    if commit:
        db.session.commit()
    return event


def summary(days=7):
    days = max(1, min(int(days), 90))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.session.query(TelemetryEvent.event_type, func.count(TelemetryEvent.id))
        .filter(TelemetryEvent.created_at >= since)
        .group_by(TelemetryEvent.event_type)
        .all()
    )
    counts = Counter({event_type: int(count) for event_type, count in rows})
    return {
        "days": days,
        "since": since.isoformat(),
        "events": dict(sorted(counts.items())),
        "totalEvents": sum(counts.values()),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
