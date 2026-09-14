"""
ARCHESS - Commander Career Achievements & Badges Engine
Manages milestone badges, career progression, unlock conditions,
and live combat recognition.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from backend.database import get_connection

ACHIEVEMENT_CATALOG: Dict[str, Dict[str, Any]] = {
    "first_strike": {
        "id": "first_strike",
        "title": "First Strike",
        "description": "Secure your first tactical victory on the competitive ladder.",
        "icon": "⚔️",
        "tier": "bronze",
        "category": "combat"
    },
    "damage_centurion": {
        "id": "damage_centurion",
        "title": "Apex Striker",
        "description": "Inflict 500+ cumulative combat damage in your commander career.",
        "icon": "💥",
        "tier": "silver",
        "category": "damage",
        "target": 500
    },
    "sudden_death_victor": {
        "id": "sudden_death_victor",
        "title": "Iron Sovereign",
        "description": "Clinch victory during a high-stakes Sudden Death King Duel.",
        "icon": "👑",
        "tier": "gold",
        "category": "survival"
    },
    "grandmaster_conqueror": {
        "id": "grandmaster_conqueror",
        "title": "Grandmaster Slayer",
        "description": "Triumph over an elite adversary or Grandmaster Bot AI in battle.",
        "icon": "🤖",
        "tier": "platinum",
        "category": "mastery"
    },
    "tournament_champion": {
        "id": "tournament_champion",
        "title": "Golden Sovereign",
        "description": "Conquer the 8-commander Knockout Tournament Championship.",
        "icon": "🏆",
        "tier": "sovereign",
        "category": "championship"
    },
    "nexus_duelist": {
        "id": "nexus_duelist",
        "title": "Nexus Combatant",
        "description": "Complete a real-time multiplayer duel over the authoritative network.",
        "icon": "⚡",
        "tier": "silver",
        "category": "multiplayer"
    },
    "ricochet_master": {
        "id": "ricochet_master",
        "title": "Blitz Tactician",
        "description": "Deliver a decisive tactical checkmate in under 15 moves.",
        "icon": "🎯",
        "tier": "gold",
        "category": "finesse"
    }
}


def init_achievements_schema():
    """Ensure user_achievements table exists in the database."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, achievement_id)
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_achievements ON user_achievements (username);")
        conn.commit()
    except Exception:
        pass
    finally:
        if conn:
            conn.close()


# Initialize schema on module import
init_achievements_schema()


def get_all_achievements() -> List[Dict[str, Any]]:
    """Return all catalog achievements ordered by tier."""
    tier_order = {"bronze": 1, "silver": 2, "gold": 3, "platinum": 4, "sovereign": 5}
    achievements = list(ACHIEVEMENT_CATALOG.values())
    achievements.sort(key=lambda a: tier_order.get(a["tier"], 0))
    return achievements


def unlock_achievement(username: str, achievement_id: str) -> bool:
    """
    Unlock an achievement for a specific commander.
    Returns True if freshly unlocked, False if already owned or invalid.
    """
    if achievement_id not in ACHIEVEMENT_CATALOG:
        return False

    clean_user = str(username).strip()
    if not clean_user:
        return False

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO user_achievements (username, achievement_id) VALUES (?, ?)",
            (clean_user, achievement_id)
        )
        fresh = cursor.rowcount > 0
        conn.commit()
        return fresh
    except Exception:
        return False
    finally:
        if conn:
            conn.close()


def get_user_achievements(username: str) -> List[Dict[str, Any]]:
    """
    Return all achievements with commander's unlock status, timestamps,
    and progress calculations.
    """
    clean_user = str(username).strip()
    conn = None
    unlocked_map = {}
    total_damage = 0
    total_wins = 0

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Fetch unlocked badges
        cursor.execute(
            "SELECT achievement_id, unlocked_at FROM user_achievements WHERE username = ?",
            (clean_user,)
        )
        for r in cursor.fetchall():
            unlocked_map[r["achievement_id"]] = str(r["unlocked_at"])

        # Fetch total career damage and wins for progress calculation
        cursor.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN white_username = ? THEN white_damage ELSE black_damage END), 0) as total_dmg,
                COALESCE(COUNT(*), 0) as match_cnt
            FROM matches
            WHERE (white_username = ? OR black_username = ?)
        """, (clean_user, clean_user, clean_user))
        row = cursor.fetchone()
        if row:
            total_damage = row["total_dmg"]

        cursor.execute("SELECT wins FROM users WHERE username = ?", (clean_user,))
        urow = cursor.fetchone()
        if urow:
            total_wins = urow["wins"]
    except Exception:
        pass
    finally:
        if conn:
            conn.close()

    result = []
    for aid, ach in ACHIEVEMENT_CATALOG.items():
        is_unlocked = aid in unlocked_map
        progress = 0
        progress_max = 1
        pct = 100 if is_unlocked else 0

        if aid == "damage_centurion":
            progress_max = 500
            progress = min(500, total_damage)
            pct = 100 if is_unlocked else min(100, int((progress / progress_max) * 100))
        elif aid == "first_strike":
            progress_max = 1
            progress = min(1, total_wins)
            pct = 100 if (is_unlocked or total_wins >= 1) else 0

        result.append({
            **ach,
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_map.get(aid),
            "progress": progress,
            "progress_max": progress_max,
            "progress_percent": pct
        })

    tier_order = {"bronze": 1, "silver": 2, "gold": 3, "platinum": 4, "sovereign": 5}
    result.sort(key=lambda a: (not a["unlocked"], tier_order.get(a["tier"], 0)))
    return result


def evaluate_match_achievements(
    username: str,
    match_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Evaluate match outcomes to discover newly earned badges.
    Returns list of newly unlocked achievement dicts.
    """
    clean_user = str(username).strip()
    if not clean_user or clean_user in ("ArChess Bot", "Guest", "Anonymous"):
        return []

    newly_unlocked = []
    is_winner = match_data.get("is_winner", False)
    turns = int(match_data.get("turns", 0) or 0)
    sudden_death = bool(match_data.get("sudden_death", False))
    is_multiplayer = bool(match_data.get("is_multiplayer", False))
    opponent = str(match_data.get("opponent", ""))
    opponent_elo = int(match_data.get("opponent_elo", 0) or 0)

    # 1. First Strike
    if is_winner:
        if unlock_achievement(clean_user, "first_strike"):
            newly_unlocked.append(ACHIEVEMENT_CATALOG["first_strike"])

    # 2. Blitz Tactician (< 15 turns checkmate)
    if is_winner and 0 < turns <= 15:
        if unlock_achievement(clean_user, "ricochet_master"):
            newly_unlocked.append(ACHIEVEMENT_CATALOG["ricochet_master"])

    # 3. Sudden Death Victor
    if is_winner and sudden_death:
        if unlock_achievement(clean_user, "sudden_death_victor"):
            newly_unlocked.append(ACHIEVEMENT_CATALOG["sudden_death_victor"])

    # 4. Grandmaster Slayer
    if is_winner and (opponent_elo >= 2500 or "Grandmaster" in opponent):
        if unlock_achievement(clean_user, "grandmaster_conqueror"):
            newly_unlocked.append(ACHIEVEMENT_CATALOG["grandmaster_conqueror"])

    # 5. Nexus Combatant
    if is_multiplayer:
        if unlock_achievement(clean_user, "nexus_duelist"):
            newly_unlocked.append(ACHIEVEMENT_CATALOG["nexus_duelist"])

    # 6. Damage Centurion (Career 500+ damage)
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COALESCE(SUM(CASE WHEN white_username = ? THEN white_damage ELSE black_damage END), 0) as total_dmg
            FROM matches
            WHERE (white_username = ? OR black_username = ?)
        """, (clean_user, clean_user, clean_user))
        row = cursor.fetchone()
        if row and row["total_dmg"] >= 500:
            if unlock_achievement(clean_user, "damage_centurion"):
                newly_unlocked.append(ACHIEVEMENT_CATALOG["damage_centurion"])
    except Exception:
        pass
    finally:
        if conn:
            conn.close()

    return newly_unlocked
