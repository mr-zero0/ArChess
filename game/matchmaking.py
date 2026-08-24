from datetime import datetime, timezone
from threading import Lock
import secrets
import string

from extensions import db
from game.models import MatchmakingQueue, Room, User
from game.matchmaking_next import allowed_mmr_gap, recover_queue_entry
from game.telemetry import record_event

_MATCH_LOCK = Lock()


def _now():
    return datetime.now(timezone.utc)


def _room_code():
    while True:
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if not Room.query.filter_by(room_code=code).first():
            return code


def _payload(entry):
    room = db.session.get(Room, entry.matched_room_id) if entry.matched_room_id else None
    return {
        "queueId": entry.id,
        "status": entry.status,
        "joinedAt": entry.joined_at.isoformat() if entry.joined_at else None,
        "mmrWindow": allowed_mmr_gap(entry.joined_at) if entry.status == "searching" else None,
        "room": room.to_dict() if room else None,
    }


def _available_user(user):
    if not user.room_id:
        return True
    room = db.session.get(Room, user.room_id)
    if room is None or room.status == "finished":
        user.room_id = None
        db.session.flush()
        return True
    return False


def _pair(entry):
    with _MATCH_LOCK:
        current = db.session.get(MatchmakingQueue, entry.id)
        if current is None or current.status != "searching":
            return current

        current_user = db.session.get(User, current.user_id)
        if current_user is None or not _available_user(current_user):
            current.status = "canceled"
            current.matched_room_id = None
            db.session.commit()
            return current

        current_gap = allowed_mmr_gap(current.joined_at)
        candidates = (
            MatchmakingQueue.query
            .filter(MatchmakingQueue.status == "searching", MatchmakingQueue.user_id != current.user_id)
            .order_by(MatchmakingQueue.joined_at.asc(), MatchmakingQueue.id.asc())
            .with_for_update()
            .all()
        )

        best = None
        best_delta = None
        for candidate in candidates:
            candidate_user = db.session.get(User, candidate.user_id)
            if candidate_user is None or not _available_user(candidate_user):
                continue
            delta = abs((current_user.mmr or 1200) - (candidate_user.mmr or 1200))
            candidate_gap = allowed_mmr_gap(candidate.joined_at)
            effective_gap = min(current_gap, candidate_gap)
            if delta > effective_gap:
                continue
            if best is None or delta < best_delta or (delta == best_delta and candidate.id < best.id):
                best = candidate
                best_delta = delta

        if best is None:
            db.session.commit()
            return current

        opponent = db.session.get(User, best.user_id)
        if opponent is None or not _available_user(opponent):
            db.session.commit()
            return current

        room = Room(
            room_code=_room_code(),
            status="waiting",
            current_turn="white",
            white_player_id=current_user.id,
            black_player_id=opponent.id,
            match_log='{"type":"ranked_match_start","mode":"ranked"}',
        )
        db.session.add(room)
        db.session.flush()

        current_user.room_id = room.id
        opponent.room_id = room.id
        current.status = "matched"
        current.matched_room_id = room.id
        best.status = "matched"
        best.matched_room_id = room.id
        record_event("match_found", guest_id=current_user.guest_id, room_id=room.id, payload={"opponentMmr": int(opponent.mmr or 1200)})
        record_event("match_found", guest_id=opponent.guest_id, room_id=room.id, payload={"opponentMmr": int(current_user.mmr or 1200)})
        db.session.commit()
        return current


def join_queue(guest_id):
    user = User.query.filter_by(guest_id=guest_id).first()
    if user is None:
        user = User(guest_id=guest_id)
        db.session.add(user)
        db.session.flush()

    if not _available_user(user):
        room = db.session.get(Room, user.room_id)
        return {
            "error": "already_in_room",
            "message": "Leave the current room before joining public matchmaking",
            "room": room.to_dict() if room else None,
        }, 409

    entry = MatchmakingQueue.query.filter_by(user_id=user.id).first()
    if entry is None:
        entry = MatchmakingQueue(user_id=user.id, status="searching", joined_at=_now())
        db.session.add(entry)
        record_event("queue_join", guest_id=user.guest_id, payload={"mmr": int(user.mmr or 1200)})
        db.session.commit()
    elif entry.status == "matched":
        if not recover_queue_entry(entry):
            return _payload(entry), 200
        entry.joined_at = _now()
        record_event("queue_join", guest_id=user.guest_id, payload={"recovered": True})
        db.session.commit()
    elif entry.status == "canceled":
        entry.status = "searching"
        entry.matched_room_id = None
        entry.joined_at = _now()
        record_event("queue_join", guest_id=user.guest_id, payload={"rejoined": True})
        db.session.commit()

    entry = _pair(entry)
    return _payload(entry), 200


def leave_queue(guest_id):
    user = User.query.filter_by(guest_id=guest_id).first()
    if user is None:
        return {"error": "user_not_found"}, 404
    entry = MatchmakingQueue.query.filter_by(user_id=user.id).first()
    if entry is None:
        return {"status": "not_queued"}, 200
    if entry.status == "matched":
        room = db.session.get(Room, entry.matched_room_id)
        return {
            "error": "match_already_found",
            "message": "The matchmaking result has already been assigned",
            "room": room.to_dict() if room else None,
        }, 409
    entry.status = "canceled"
    entry.matched_room_id = None
    record_event("queue_leave", guest_id=user.guest_id, payload={"status": "canceled"})
    db.session.commit()
    return _payload(entry), 200


def get_queue_status(guest_id):
    user = User.query.filter_by(guest_id=guest_id).first()
    if user is None:
        return {"error": "user_not_found"}, 404
    entry = MatchmakingQueue.query.filter_by(user_id=user.id).first()
    if entry is None:
        return {"status": "not_queued", "room": None}, 200
    if entry.status == "matched" and recover_queue_entry(entry):
        entry.joined_at = _now()
        db.session.commit()
    return _payload(entry), 200
