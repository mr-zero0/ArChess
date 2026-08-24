import json

from flask import has_request_context, request
from sqlalchemy import event
from sqlalchemy.orm import Session


def _request_outcome():
    if not has_request_context():
        return None, None
    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason")
    guest_id = payload.get("guestId")
    if reason not in {"surrender", "timeout", "abandonment"}:
        return None, guest_id
    return reason, guest_id


def _winner_loser_for_finished_room(room):
    gameover = None
    if room.last_gameover_event:
        try:
            gameover = json.loads(room.last_gameover_event)
        except (TypeError, ValueError, json.JSONDecodeError):
            gameover = None
    if gameover and gameover.get("winner") in {"white", "black"}:
        winner_team = gameover["winner"]
        winner_id = room.white_player_id if winner_team == "white" else room.black_player_id
        loser_id = room.black_player_id if winner_team == "white" else room.white_player_id
        return winner_id, loser_id, gameover.get("reason", "king_destroyed")

    reason, guest_id = _request_outcome()
    if guest_id:
        from game.models import User
        loser = User.query.filter_by(guest_id=guest_id).first()
        if loser:
            loser_team = "white" if loser.id == room.white_player_id else "black" if loser.id == room.black_player_id else None
            if loser_team == "white":
                return room.black_player_id, room.white_player_id, reason or "abandonment"
            if loser_team == "black":
                return room.white_player_id, room.black_player_id, reason or "abandonment"
    return None, None, reason


def register_ranked_room_hooks(Room):
    @event.listens_for(Session, "before_flush")
    def settle_ranked_rooms(session, flush_context, instances):
        from game.ranked import is_ranked_room, settle_ranked_result

        for room in list(session.dirty):
            if not isinstance(room, Room) or room.status != "finished":
                continue
            if not is_ranked_room(room):
                continue
            winner_id, loser_id, reason = _winner_loser_for_finished_room(room)
            if not winner_id or not loser_id:
                continue
            settle_ranked_result(room, winner_id, loser_id, reason or "abandonment", commit=False)
