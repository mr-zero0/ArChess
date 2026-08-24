from app import create_app
from config import TestingConfig
from extensions import db
from game.models import User


def test_ranked_leaderboard_api():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        db.session.add_all([
            User(guest_id="api-a", mmr=1500, matches_played=8, wins=6, losses=2),
            User(guest_id="api-b", mmr=1600, matches_played=12, wins=8, losses=4),
        ])
        db.session.commit()
        client = application.test_client()
        response = client.get("/api/ranked/leaderboard?limit=2")
        assert response.status_code == 200
        data = response.get_json()
        assert [item["guestId"] for item in data["items"]] == ["api-b", "api-a"]
        db.session.remove()
        db.drop_all()


def test_ranked_profile_api():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        db.session.add(User(guest_id="api-profile", mmr=1400, matches_played=4, wins=3, losses=1))
        db.session.commit()
        client = application.test_client()
        response = client.get("/api/ranked/profile/api-profile")
        assert response.status_code == 200
        assert response.get_json()["provisional"] is True
        assert response.get_json()["tier"] == "Platinum"
        db.session.remove()
        db.drop_all()


def test_ranked_tiers_api():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        client = application.test_client()
        response = client.get("/api/ranked/tiers")
        assert response.status_code == 200
        tiers = response.get_json()["tiers"]
        assert tiers[0]["name"] == "Bronze"
        assert tiers[-1]["name"] == "Grandmaster"
        db.drop_all()
