from __future__ import annotations

from core.extensions import db


XP_PER_WIN = 75
XP_PER_LOSS = 35
XP_PER_ABANDONMENT = 20
BASE_XP = 20

COSMETICS = {
    "impact_classic": {
        "name": "Classic Impact",
        "category": "impact",
        "unlock_level": 1,
        "description": "The default impact treatment.",
    },
    "trail_ember": {
        "name": "Ember Trail",
        "category": "trail",
        "unlock_level": 2,
        "description": "A warm launch trail cosmetic.",
    },
    "trail_cyan": {
        "name": "Cyan Trail",
        "category": "trail",
        "unlock_level": 4,
        "description": "A cool cyan launch trail cosmetic.",
    },
    "impact_arc": {
        "name": "Arc Impact",
        "category": "impact",
        "unlock_level": 6,
        "description": "A sharper impact visual treatment.",
    },
}


def xp_to_next_level(level: int) -> int:
    safe_level = max(1, int(level or 1))
    return 100 + (safe_level - 1) * 50


def _normalize_inventory(user):
    value = user.cosmetics_owned
    if isinstance(value, list):
        owned = [str(item) for item in value]
        equipped = owned[0] if owned else "impact_classic"
    elif isinstance(value, dict):
        owned = [str(item) for item in value.get("owned", [])]
        equipped = value.get("equipped")
    else:
        owned = []
        equipped = None

    if "impact_classic" not in owned:
        owned.append("impact_classic")
    if equipped not in owned:
        equipped = "impact_classic"

    normalized = {"owned": sorted(set(owned)), "equipped": equipped}
    user.cosmetics_owned = normalized
    return normalized


def _unlock_for_level(user):
    inventory = _normalize_inventory(user)
    owned = set(inventory["owned"])
    for cosmetic_id, cosmetic in COSMETICS.items():
        if int(user.level or 1) >= cosmetic["unlock_level"]:
            owned.add(cosmetic_id)
    inventory["owned"] = sorted(owned)
    user.cosmetics_owned = inventory
    return inventory


def award_match_xp(user, outcome: str) -> dict:
    outcome = str(outcome or "participation")
    if outcome == "win":
        gained = BASE_XP + XP_PER_WIN
    elif outcome == "loss":
        gained = BASE_XP + XP_PER_LOSS
    elif outcome == "abandonment":
        gained = BASE_XP + XP_PER_ABANDONMENT
    else:
        gained = BASE_XP

    old_level = int(user.level or 1)
    user.xp = max(0, int(user.xp or 0)) + gained
    level = max(1, old_level)
    while user.xp >= xp_to_next_level(level):
        user.xp -= xp_to_next_level(level)
        level += 1
    user.level = level
    inventory = _unlock_for_level(user)
    next_threshold = xp_to_next_level(level)
    return {
        "xpGained": gained,
        "levelBefore": old_level,
        "levelAfter": level,
        "levelUp": level > old_level,
        "xp": int(user.xp),
        "xpToNextLevel": next_threshold,
        "ownedCosmetics": inventory["owned"],
        "equippedCosmetic": inventory["equipped"],
    }


def progression_profile(user) -> dict:
    inventory = _unlock_for_level(user)
    return {
        "guestId": user.guest_id,
        "xp": int(user.xp or 0),
        "level": int(user.level or 1),
        "xpToNextLevel": xp_to_next_level(user.level),
        "ownedCosmetics": inventory["owned"],
        "equippedCosmetic": inventory["equipped"],
        "cosmetics": [
            {
                "id": cosmetic_id,
                **cosmetic,
                "owned": cosmetic_id in inventory["owned"],
                "equipped": cosmetic_id == inventory["equipped"],
            }
            for cosmetic_id, cosmetic in COSMETICS.items()
        ],
    }


def equip_cosmetic(user, cosmetic_id: str) -> dict:
    inventory = _unlock_for_level(user)
    if cosmetic_id not in COSMETICS:
        raise ValueError("unknown_cosmetic")
    if cosmetic_id not in inventory["owned"]:
        raise ValueError("cosmetic_locked")
    inventory["equipped"] = cosmetic_id
    user.cosmetics_owned = inventory
    return progression_profile(user)
