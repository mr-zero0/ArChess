from app import create_app
from config import TestingConfig
from extensions import db
from game.leaderboard import get_leaderboard, ranked_profile
from game.models import User


def test_ranked_profile_reports_tier_and_provisional_state():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        user = User(guest_id="leader-profile", mmr=1400, matches_played=3, wins=2, losses=1)
        db.session.add(user)
        db.session.commit()

        profile = ranked_profile(user)
        assert profile["mmr"] == 1400
        assert profile["tier"] == "Platinum"
        assert profile["provisional"] is True
        assert profile["wins"] == 2
        assert profile["losses"] == 1

        db.session.remove()
        db.drop_all()


def test_leaderboard_orders_mmr_then_wins():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        users = [
            User(guest_id="rank-a", mmr=1500, matches_played=20, wins=10, losses=10),
            User(guest_id="rank-b", mmr=1500, matches_played=20, wins=12, losses=8),
            User(guest_id="rank-c", mmr=1700, matches_played=5, wins=5, losses=0),
            User(guest_id="rank-unused", mmr=2200, matches_played=0, wins=0, losses=0),
        ]
        db.session.add_all(users)
        db.session.commit()

        board = get_leaderboard()
        assert [entry["guestId"] for entry in board] == ["rank-c", "rank-b", "rank-a"]
        assert [entry["rank"] for entry in board] == [1, 2, 3]

        db.session.remove()
        db.drop_all()


def test_leaderboard_limit_is_bounded():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        for index in range(5):
            db.session.add(User(guest_id=f"rank-{index}", mmr=1000 + index, matches_played=1, wins=1))
        db.session.commit()
        assert len(get_leaderboard(2)) == 2
        assert len(get_leaderboard(500)) == 5
        db.session.remove()
        db.drop_all()
