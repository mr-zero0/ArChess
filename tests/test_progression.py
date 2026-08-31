import pytest

from app import create_app
from config import TestingConfig
from extensions import db
from game.models import User
from game.progression import COSMETICS, award_match_xp, equip_cosmetic, progression_profile, xp_to_next_level


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


def _user():
    user = User(guest_id="progression-user")
    db.session.add(user)
    db.session.commit()
    return user


def test_default_progression_has_starter_cosmetic(app):
    with app.app_context():
        user = _user()
        profile = progression_profile(user)
        assert profile["level"] == 1
        assert "impact_classic" in profile["ownedCosmetics"]
        assert profile["equippedCosmetic"] == "impact_classic"


def test_win_xp_advances_progression_and_unlocks_by_level(app):
    with app.app_context():
        user = _user()
        user.xp = xp_to_next_level(1) - 1
        db.session.commit()
        result = award_match_xp(user, "win")
        assert result["levelUp"] is True
        assert user.level == 2
        assert "trail_ember" in result["ownedCosmetics"]


def test_loss_and_abandonment_have_lower_xp_rewards(app):
    with app.app_context():
        user = _user()
        loss = award_match_xp(user, "loss")
        abandonment = award_match_xp(user, "abandonment")
        assert loss["xpGained"] > 0
        assert abandonment["xpGained"] > 0
        assert loss["xpGained"] > abandonment["xpGained"]


def test_locked_cosmetic_cannot_be_equipped(app):
    with app.app_context():
        user = _user()
        with pytest.raises(ValueError, match="cosmetic_locked"):
            equip_cosmetic(user, "impact_arc")


def test_unlocked_cosmetic_can_be_equipped(app):
    with app.app_context():
        user = _user()
        user.level = COSMETICS["trail_ember"]["unlock_level"]
        db.session.commit()
        profile = equip_cosmetic(user, "trail_ember")
        db.session.commit()
        assert profile["equippedCosmetic"] == "trail_ember"
        assert "trail_ember" in profile["ownedCosmetics"]


def test_unknown_cosmetic_is_rejected(app):
    with app.app_context():
        user = _user()
        with pytest.raises(ValueError, match="unknown_cosmetic"):
            equip_cosmetic(user, "does-not-exist")
