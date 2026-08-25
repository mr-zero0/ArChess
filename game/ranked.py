import json
import math
from datetime import datetime, timezone

from core.extensions import db
from game.models import Room, User
from game.progression import award_match_xp
from game.telemetry import record_event

DEFAULT_MMR = 1200
BASE_K_FACTOR = 32
PLACEMENT_K_FACTOR = 64
PLACEMENT_MATCHES = 10
MIN_MMR = 100

TIERS = (
    (1000, "Bronze"),
    (1200, "Silver"),
    (1400, "Gold"),
    (1600, "Platinum"),
    (1800, "Diamond"),
    (2000, "Master"),
    (float("inf"), "Grandmaster"),
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _expected_score(winner_mmr, loser_mmr):
    return 1.0 / (1.0 + math.pow(10.0, (loser_mmr - winner_mmr) / 400.0))


def tier_for_mmr(mmr):
    rating = int(mmr or DEFAULT_MMR)
    for ceiling, tier in TIERS:
        if rating < ceiling:
            return tier
    return TIERS[-1][1]


def is_provisional(matches_played):
    return int(matches_played or 0) < PLACEMENT_MATCHES


def is_ranked_room(room):
    if not room.match_log:
        return False
    return any(
        line.strip().startswith('{"type":"ranked_match_start"')
        for line in room.match_log.splitlines()
    )


def _existing_result(room):
    if not room.match_log:
        return None
    for line in reversed(room.match_log.splitlines()):
        try:
            event = json.loads(line)
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if event.get("type") == "ranked_result":
            return event
    return None


def settle_ranked_result(room, winner_id, loser_id, reason, *, commit=True):
    existing = _existing_result(room)
    if existing is not None:
        return existing

    winner = db.session.get(User, winner_id)
    loser = db.session.get(User, loser_id)
    if winner is None or loser is None or winner.id == loser.id:
        raise ValueError("winner and loser must be distinct existing users")

    winner_mmr = int(winner.mmr or DEFAULT_MMR)
    loser_mmr = int(loser.mmr or DEFAULT_MMR)
    winner_provisional = is_provisional(winner.matches_played)
    loser_provisional = is_provisional(loser.matches_played)
    expected = _expected_score(winner_mmr, loser_mmr)
    winner_k = PLACEMENT_K_FACTOR if winner_provisional else BASE_K_FACTOR
    loser_k = PLACEMENT_K_FACTOR if loser_provisional else BASE_K_FACTOR
    winner_delta = max(1, round(winner_k * (1.0 - expected)))
    loser_delta = max(1, round(loser_k * expected))

    winner.mmr = winner_mmr + winner_delta
    loser.mmr = max(MIN_MMR, loser_mmr - loser_delta)
    winner.matches_played = int(winner.matches_played or 0) + 1
    loser.matches_played = int(loser.matches_played or 0) + 1
    winner.wins = int(winner.wins or 0) + 1
    loser.losses = int(loser.losses or 0) + 1

    winner_xp = award_match_xp(winner, "win")
    loser_xp = award_match_xp(loser, "abandonment" if reason == "abandonment" else "loss")

    result = {
        "type": "ranked_result",
        "reason": reason,
        "winnerId": winner.id,
        "loserId": loser.id,
        "winnerMmrBefore": winner_mmr,
        "winnerMmrAfter": winner.mmr,
        "winnerMmrDelta": winner_delta,
        "loserMmrBefore": loser_mmr,
        "loserMmrAfter": loser.mmr,
        "loserMmrDelta": -loser_delta,
        "winnerProvisionalBefore": winner_provisional,
        "loserProvisionalBefore": loser_provisional,
        "winnerProvisionalAfter": is_provisional(winner.matches_played),
        "loserProvisionalAfter": is_provisional(loser.matches_played),
        "winnerTier": tier_for_mmr(winner.mmr),
        "loserTier": tier_for_mmr(loser.mmr),
        "winnerProgression": winner_xp,
        "loserProgression": loser_xp,
        "recordedAt": _now(),
    }
    line = json.dumps(result, separators=(",", ":"), sort_keys=True)
    room.match_log = line if not room.match_log else room.match_log + "\n" + line
    room.status = "finished"
    room.last_gameover_event = json.dumps(
        {"winner": "white" if room.white_player_id == winner.id else "black", "reason": reason},
        separators=(",", ":"),
        sort_keys=True,
    )
    record_event("ranked_result", guest_id=winner.guest_id, room_id=room.id, payload={"winner": True, "reason": reason, "mmrDelta": winner_delta, "xpGained": winner_xp["xpGained"]})
    record_event("ranked_result", guest_id=loser.guest_id, room_id=room.id, payload={"winner": False, "reason": reason, "mmrDelta": -loser_delta, "xpGained": loser_xp["xpGained"]})
    if winner_xp["levelUp"]:
        record_event("progression_level_up", guest_id=winner.guest_id, room_id=room.id, payload={"level": winner_xp["levelAfter"]})
    if loser_xp["levelUp"]:
        record_event("progression_level_up", guest_id=loser.guest_id, room_id=room.id, payload={"level": loser_xp["levelAfter"]})
    if commit:
        db.session.commit()
    return result


def ranked_room_players(room):
    white_id = room.white_player_id
    black_id = room.black_player_id
    if not white_id or not black_id:
        raise ValueError("ranked room requires two assigned players")
    return white_id, black_id


def settle_for_team(room, losing_team, reason, *, commit=True):
    white_id, black_id = ranked_room_players(room)
    if losing_team == "white":
        return settle_ranked_result(room, black_id, white_id, reason, commit=commit)
    if losing_team == "black":
        return settle_ranked_result(room, white_id, black_id, reason, commit=commit)
    raise ValueError("losing_team must be white or black")
