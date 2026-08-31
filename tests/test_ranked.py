import json

import pytest

from app import create_app
from config import TestingConfig
from extensions import db
from game.models import Room, User
from game.ranked import is_provisional, settle_for_team, settle_ranked_result, tier_for_mmr


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


def _room():
    white = User(guest_id="ranked-white", mmr=1200)
    black = User(guest_id="ranked-black", mmr=1200)
    db.session.add_all([white, black])
    db.session.flush()
    room = Room(
        room_code="RANK01",
        status="active",
        white_player_id=white.id,
        black_player_id=black.id,
        current_turn="white",
    )
    db.session.add(room)
    db.session.flush()
    white.room_id = room.id
    black.room_id = room.id
    db.session.commit()
    return room, white, black


def test_surrender_result_updates_mmr_and_record(app):
    with app.app_context():
        room, white, black = _room()
        result = settle_for_team(room, "white", "surrender")
        assert result["reason"] == "surrender"
        assert result["winnerId"] == black.id
        assert result["loserId"] == white.id
        assert white.mmr < 1200
        assert black.mmr > 1200
        assert white.losses == 1
        assert black.wins == 1
        assert room.status == "finished"


def test_timeout_result_uses_same_rating_engine(app):
    with app.app_context():
        room, white, black = _room()
        result = settle_for_team(room, "black", "timeout")
        assert result["reason"] == "timeout"
        assert result["winnerId"] == white.id
        assert result["loserId"] == black.id
        assert white.wins == 1
        assert black.losses == 1


def test_result_is_idempotent(app):
    with app.app_context():
        room, white, black = _room()
        first = settle_ranked_result(room, black.id, white.id, "abandonment")
        mmr_after = (white.mmr, black.mmr)
        second = settle_ranked_result(room, black.id, white.id, "abandonment")
        assert second == first
        assert (white.mmr, black.mmr) == mmr_after
        assert room.match_log.count('"type":"ranked_result"') == 1


def test_placement_uses_higher_k_factor(app):
    with app.app_context():
        room, white, black = _room()
        result = settle_ranked_result(room, black.id, white.id, "king_destroyed")
        assert result["winnerMmrDelta"] >= 32
        assert result["loserMmrDelta"] <= -32


def test_non_placement_uses_base_k_factor(app):
    with app.app_context():
        room, white, black = _room()
        white.matches_played = 10
        black.matches_played = 10
        db.session.commit()
        result = settle_ranked_result(room, black.id, white.id, "king_destroyed")
        assert result["winnerMmrDelta"] == 16
        assert result["loserMmrDelta"] == -16


def test_tier_boundaries():
    assert tier_for_mmr(999) == "Bronze"
    assert tier_for_mmr(1000) == "Silver"
    assert tier_for_mmr(1200) == "Gold"
    assert tier_for_mmr(1400) == "Platinum"
    assert tier_for_mmr(1600) == "Diamond"
    assert tier_for_mmr(1800) == "Master"
    assert tier_for_mmr(2000) == "Grandmaster"


def test_provisional_window():
    assert is_provisional(0)
    assert is_provisional(9)
    assert not is_provisional(10)


def test_result_is_serializable(app):
    with app.app_context():
        room, white, black = _room()
        result = settle_ranked_result(room, black.id, white.id, "king_destroyed")
        json.dumps(result)


def test_missing_players_are_rejected(app):
    with app.app_context():
        room = Room(room_code="RANK02", status="active")
        db.session.add(room)
        db.session.commit()
        with pytest.raises(ValueError, match="requires two assigned players"):
            settle_for_team(room, "white", "timeout")
