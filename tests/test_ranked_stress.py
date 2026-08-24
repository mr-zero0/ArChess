from extensions import db
from game.matchmaking import join_queue, leave_queue
from game.models import MatchmakingQueue, Room, User
from app import create_app
from config import TestingConfig


def test_ranked_queue_churn_is_bounded():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()

        for index in range(80):
            guest_id = f"stress-{index:03d}"
            result, status = join_queue(guest_id)
            assert status == 200
            assert result["status"] in {"searching", "matched"}

        assert User.query.count() == 80
        assert MatchmakingQueue.query.count() == 80
        assert Room.query.count() == 40
        assert all(room.white_player_id and room.black_player_id for room in Room.query.all())

        for index in range(0, 40):
            guest_id = f"stress-{index:03d}"
            result, status = leave_queue(guest_id)
            assert status == 409
            assert result["error"] == "match_already_found"

        for index in range(40, 80):
            guest_id = f"stress-{index:03d}"
            result, status = leave_queue(guest_id)
            assert status == 409
            assert result["error"] == "match_already_found"

        db.session.remove()
        db.drop_all()
