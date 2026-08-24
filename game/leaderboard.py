from game.models import User
from game.progression import progression_profile
from game.ranked import is_provisional, tier_for_mmr


def ranked_profile(user):
    return {
        "guestId": user.guest_id,
        "mmr": int(user.mmr or 0),
        "tier": tier_for_mmr(user.mmr),
        "provisional": is_provisional(user.matches_played),
        "matchesPlayed": int(user.matches_played or 0),
        "wins": int(user.wins or 0),
        "losses": int(user.losses or 0),
        "progression": progression_profile(user),
    }


def get_leaderboard(limit=50):
    safe_limit = max(1, min(int(limit), 100))
    users = (
        User.query
        .filter(User.matches_played > 0)
        .order_by(User.mmr.desc(), User.wins.desc(), User.matches_played.asc(), User.id.asc())
        .limit(safe_limit)
        .all()
    )
    return [
        {
            "rank": index,
            **ranked_profile(user),
        }
        for index, user in enumerate(users, start=1)
    ]
