import json

from app import create_app
from config import TestingConfig
from extensions import db
from game.models import Room, User


def _app():
    return create_app(TestingConfig)


def _ranked_room(room_code="HOOK01"):
    white = User(guest_id=f"{room_code}-white", mmr=1200)
    black = User(guest_id=f"{room_code}-black", mmr=1200)
    db.session.add_all([white, black])
    db.session.flush()
    room = Room(
        room_code=room_code,
        status="active",
        white_player_id=white.id,
        black_player_id=black.id,
        current_turn="white",
        match_log='{"type":"ranked_match_start","mode":"ranked"}',
    )
    db.session.add(room)
    db.session.flush()
    white.room_id = room.id
    black.room_id = room.id
    db.session.commit()
    return room, white, black


def test_ranked_room_auto_settles_on_king_gameover():
    application = _app()
    with application.app_context():
        db.drop_all()
        db.create_all()
        room, white, black = _ranked_room()
        room.last_gameover_event = json.dumps({"winner": "white"})
        room.status = "finished"
        db.session.commit()

        assert white.wins == 1
        assert black.losses == 1
        assert white.mmr > 1200
        assert black.mmr < 1200
        assert '"type":"ranked_result"' in room.match_log
        db.session.remove()
        db.drop_all()


def test_surrender_reason_is_recorded_through_existing_disconnect_action():
    application = _app()
    client = application.test_client()
    with application.app_context():
        db.drop_all()
        db.create_all()
        room, white, black = _ranked_room("HOOK02")
        response = client.post(
            f"/api/rooms/{room.room_code}/disconnect",
            json={"guestId": black.guest_id, "reason": "surrender"},
        )
        assert response.status_code == 200
        db.session.refresh(white)
        db.session.refresh(black)
        assert white.wins == 1
        assert black.losses == 1
        assert black.room_id is None
        assert '"reason":"surrender"' in room.match_log
        db.session.remove()
        db.drop_all()


def test_timeout_reason_is_recorded_through_existing_disconnect_action():
    application = _app()
    client = application.test_client()
    with application.app_context():
        db.drop_all()
        db.create_all()
        room, white, black = _ranked_room("HOOK03")
        response = client.post(
            f"/api/rooms/{room.room_code}/disconnect",
            json={"guestId": white.guest_id, "reason": "timeout"},
        )
        assert response.status_code == 200
        db.session.refresh(white)
        db.session.refresh(black)
        assert black.wins == 1
        assert white.losses == 1
        assert '"reason":"timeout"' in room.match_log
        db.session.remove()
        db.drop_all()


def test_abandonment_is_recorded_when_reason_is_omitted():
    application = _app()
    client = application.test_client()
    with application.app_context():
        db.drop_all()
        db.create_all()
        room, white, black = _ranked_room("HOOK04")
        response = client.post(
            f"/api/rooms/{room.room_code}/disconnect",
            json={"guestId": white.guest_id},
        )
        assert response.status_code == 200
        db.session.refresh(white)
        db.session.refresh(black)
        assert black.wins == 1
        assert white.losses == 1
        assert '"reason":"abandonment"' in room.match_log
        db.session.remove()
        db.drop_all()
