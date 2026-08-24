from datetime import datetime, timezone

from extensions import db
from game.models import MatchmakingQueue, Room


INITIAL_MMR_GAP = 200
MMR_GAP_STEP = 100
MMR_EXPANSION_SECONDS = 15
MAX_MMR_GAP = 800


def now_utc():
    return datetime.now(timezone.utc)


def _as_utc(value):
    if value is None:
        return now_utc()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def allowed_mmr_gap(joined_at):
    age_seconds = max(0, (now_utc() - _as_utc(joined_at)).total_seconds())
    expansions = int(age_seconds // MMR_EXPANSION_SECONDS)
    return min(MAX_MMR_GAP, INITIAL_MMR_GAP + expansions * MMR_GAP_STEP)


def recover_queue_entry(entry):
    if entry.status != "matched":
        return False
    room = db.session.get(Room, entry.matched_room_id) if entry.matched_room_id else None
    if room is not None and room.status != "finished":
        return False
    entry.status = "searching"
    entry.matched_room_id = None
    entry.joined_at = now_utc()
    db.session.commit()
    return True
