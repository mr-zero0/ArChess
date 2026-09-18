"""
ARCHESS - SQLite Database & Player Account Management Engine
Manages users, authentication, ELO ratings, match history, and telemetry persistence.
Data is persisted in: data/archess.db
"""

import os
import json
import sqlite3
import re
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.environ.get("ARCHESS_DB_PATH", os.path.join(DATA_DIR, "archess.db"))
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

# Thread-safe connection factory with extended busy timeout for concurrent Flask requests
def get_connection(custom_path=None):
    """Create a new SQLite connection with WAL mode and extended busy timeout for concurrency."""
    target_path = custom_path or os.environ.get("ARCHESS_DB_PATH", DB_PATH)
    conn = sqlite3.connect(target_path, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # 1. Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            elo_rating INTEGER DEFAULT 1200,
            matches_played INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            avatar TEXT DEFAULT 'knight',
            auth_provider TEXT DEFAULT 'local',
            google_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Matches Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            white_username TEXT NOT NULL,
            black_username TEXT NOT NULL,
            winner TEXT NOT NULL,
            white_damage INTEGER DEFAULT 0,
            black_damage INTEGER DEFAULT 0,
            turns INTEGER DEFAULT 0,
            duration_sec INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 3. Telemetry Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            correlation_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Indexes for fast querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo_rating DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_created ON matches (created_at DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_white_user ON matches (white_username, created_at DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_black_user ON matches (black_username, created_at DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_corr ON telemetry (correlation_id);")

        conn.commit()

        # Schema migration: ensure matches table has turns and duration_sec columns
        cursor.execute("PRAGMA table_info(matches);")
        existing_cols = [c[1] for c in cursor.fetchall()]
        if "turns" not in existing_cols:
            cursor.execute("ALTER TABLE matches ADD COLUMN turns INTEGER DEFAULT 0;")
        if "duration_sec" not in existing_cols:
            cursor.execute("ALTER TABLE matches ADD COLUMN duration_sec INTEGER DEFAULT 0;")
        
        # Schema migration: ensure users table has auth_provider and google_id
        cursor.execute("PRAGMA table_info(users);")
        user_cols = [c[1] for c in cursor.fetchall()]
        if "auth_provider" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';")
        if "google_id" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT;")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id);")
        conn.commit()

        # Seed Grandmasters if table is empty
        cursor.execute("SELECT COUNT(*) as count FROM users")
        if cursor.fetchone()["count"] == 0:
            seed_users = [
                ("Vanguard_Prime", "vanguard@archess.io", "password123", 2840, 142, 118, 24, "king"),
                ("Magnus_Kinetic", "magnus@archess.io", "password123", 2795, 98, 76, 22, "queen"),
                ("Hikaru_Impulse", "hikaru@archess.io", "password123", 2760, 110, 84, 26, "knight"),
                ("Basalt_Wall", "basalt@archess.io", "password123", 2650, 85, 62, 23, "rook"),
                ("Prism_Sniper", "prism@archess.io", "password123", 2580, 72, 51, 21, "bishop"),
                ("Tactical_Cadet", "cadet@archess.io", "password123", 1200, 0, 0, 0, "pawn"),
            ]
            for u in seed_users:
                cursor.execute("""
                INSERT OR IGNORE INTO users (username, email, password_hash, elo_rating, matches_played, wins, losses, avatar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (u[0], u[1], generate_password_hash(u[2]), u[3], u[4], u[5], u[6], u[7]))
            conn.commit()
    finally:
        conn.close()

def register_user(username, email, password):
    if not isinstance(username, str) or not isinstance(email, str) or not isinstance(password, str):
        return False, "Username, email, and password must be valid strings."

    username = username.strip()
    email = email.strip().lower()

    if len(username) < 3 or len(username) > 50:
        return False, "Username must be between 3 and 50 characters."
    if not re.match(r"^[\w\.\-]+$", username):
        return False, "Username contains invalid characters."
    if len(email) < 5 or len(email) > 100 or not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        return False, "A valid email address is required."
    if len(password) < 6 or len(password) > 128:
        return False, "Password must be between 6 and 128 characters."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, generate_password_hash(password))
        )
        conn.commit()
        user_id = cursor.lastrowid
        return True, {"id": user_id, "username": username, "email": email, "elo_rating": 1200}
    except sqlite3.IntegrityError:
        return False, "Username or email already exists."
    finally:
        conn.close()

def authenticate_user(username_or_email, password):
    if not isinstance(username_or_email, str) or not isinstance(password, str):
        return False, "Invalid credentials."

    query_param = username_or_email.strip()
    if not query_param or not password:
        return False, "Invalid credentials."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (query_param, query_param.lower())
        )
        user = cursor.fetchone()
        if user and check_password_hash(user["password_hash"], password):
            return True, {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "elo_rating": user["elo_rating"],
                "matches_played": user["matches_played"],
                "wins": user["wins"],
                "losses": user["losses"],
                "avatar": user["avatar"]
            }
        return False, "Invalid credentials."
    finally:
        conn.close()

def get_user_by_id(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, email, elo_rating, matches_played, wins, losses, avatar, auth_provider, google_id FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user:
            return dict(user)
        return None
    finally:
        conn.close()

def get_leaderboard(limit=50):
    try:
        clamped_limit = max(1, min(int(limit), 100))
    except (ValueError, TypeError):
        clamped_limit = 50

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        SELECT username, elo_rating, matches_played, wins, losses, avatar
        FROM users
        ORDER BY elo_rating DESC
        LIMIT ?
        """, (clamped_limit,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def calculate_elo_change(rating_a, rating_b, score_a, k=32):
    """
    Standard FIDE Elo calculation.
    score_a: 1.0 for win, 0.5 for draw, 0.0 for loss
    """
    expected_a = 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))
    change_a = round(k * (score_a - expected_a))
    return change_a

def record_match_result(white_username, black_username, winner, white_damage=0, black_damage=0, turns=0, duration_sec=0):
    white_username = str(white_username).strip() if white_username else "Player1"
    black_username = str(black_username).strip() if black_username else "Player2"
    winner = winner if winner in ["white", "black", "draw"] else "draw"

    try:
        white_damage = max(0, int(white_damage))
        black_damage = max(0, int(black_damage))
        turns = max(0, int(turns))
        duration_sec = max(0, int(duration_sec))
    except (ValueError, TypeError):
        white_damage, black_damage, turns, duration_sec = 0, 0, 0, 0

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO matches (white_username, black_username, winner, white_damage, black_damage, turns, duration_sec)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (white_username, black_username, winner, white_damage, black_damage, turns, duration_sec))
        match_id = cursor.lastrowid

        # Fetch existing player ratings
        cursor.execute("SELECT username, elo_rating FROM users WHERE username IN (?, ?)", (white_username, black_username))
        user_map = {row["username"]: row["elo_rating"] for row in cursor.fetchall()}

        white_rating = user_map.get(white_username, 1200)
        black_rating = user_map.get(black_username, 1200)

        if winner == "white":
            score_w, score_b = 1.0, 0.0
        elif winner == "black":
            score_w, score_b = 0.0, 1.0
        else:  # draw
            score_w, score_b = 0.5, 0.5

        delta_w = calculate_elo_change(white_rating, black_rating, score_w)
        delta_b = calculate_elo_change(black_rating, white_rating, score_b)

        # Handle same-user edge case (e.g. self-play)
        if white_username == black_username and white_username in user_map:
            # Self-play does not alter net ELO, but records match participation
            cursor.execute("""
            UPDATE users
            SET matches_played = matches_played + 1
            WHERE username = ?
            """, (white_username,))
        else:
            # Update White player if exists in database
            if white_username in user_map:
                new_w_elo = max(100, white_rating + delta_w)
                w_wins = 1 if winner == "white" else 0
                w_losses = 1 if winner == "black" else 0
                cursor.execute("""
                UPDATE users 
                SET elo_rating = ?, matches_played = matches_played + 1, wins = wins + ?, losses = losses + ?
                WHERE username = ?
                """, (new_w_elo, w_wins, w_losses, white_username))

            # Update Black player if exists in database
            if black_username in user_map:
                new_b_elo = max(100, black_rating + delta_b)
                b_wins = 1 if winner == "black" else 0
                b_losses = 1 if winner == "white" else 0
                cursor.execute("""
                UPDATE users 
                SET elo_rating = ?, matches_played = matches_played + 1, wins = wins + ?, losses = losses + ?
                WHERE username = ?
                """, (new_b_elo, b_wins, b_losses, black_username))

        conn.commit()
        return {
            "match_id": match_id,
            "white_delta": delta_w,
            "black_delta": delta_b,
            "winner": winner
        }
    finally:
        conn.close()

def log_telemetry_event(correlation_id, event_type, payload):
    correlation_id = str(correlation_id) if correlation_id else "unknown"
    event_type = str(event_type) if event_type else "tactical_event"
    try:
        payload_str = json.dumps(payload)
    except (TypeError, ValueError):
        payload_str = json.dumps({"raw": str(payload)})

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO telemetry (correlation_id, event_type, payload) VALUES (?, ?, ?)",
            (correlation_id, event_type, payload_str)
        )
        conn.commit()
    finally:
        conn.close()

def get_user_stats(username):
    username = str(username).strip()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, username, email, elo_rating, matches_played, wins, losses, avatar, created_at FROM users WHERE username = ?",
            (username,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        user = dict(row)
        total = user["matches_played"]
        wins = user["wins"]
        losses = user["losses"]
        draws = max(0, total - (wins + losses))
        win_rate = round((wins / total) * 100, 1) if total > 0 else 0.0

        cursor.execute("""
            SELECT id, white_username, black_username, winner, white_damage, black_damage, turns, duration_sec, created_at
            FROM matches
            WHERE white_username = ? OR black_username = ?
            ORDER BY created_at DESC
            LIMIT 10
        """, (username, username))
        recent_matches = [dict(m) for m in cursor.fetchall()]

        return {
            "user": user,
            "stats": {
                "elo_rating": user["elo_rating"],
                "matches_played": total,
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "win_rate": win_rate,
                "tier": "Grandmaster" if user["elo_rating"] >= 2700 else ("Master" if user["elo_rating"] >= 2400 else "Contender")
            },
            "recent_matches": recent_matches
        }
    finally:
        conn.close()

def get_match_by_id(match_id):
    try:
        m_id = int(match_id)
    except (ValueError, TypeError):
        return None
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM matches WHERE id = ?", (m_id,))
        row = cursor.fetchone()
        if not row:
            return None
        match = dict(row)
        cursor.execute("""
            SELECT event_type, payload, created_at 
            FROM telemetry 
            WHERE correlation_id = ? 
            ORDER BY created_at ASC
        """, (str(m_id),))
        telemetry_rows = cursor.fetchall()
        match["events"] = [dict(t) for t in telemetry_rows]
        return match
    finally:
        conn.close()

VALID_AVATARS = {"knight", "king", "queen", "rook", "bishop", "citadel", "phoenix", "sovereign", "pawn"}

def update_user_profile(user_id, username=None, avatar=None):
    if not user_id:
        return False, "Invalid user identifier."
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return False, "User not found."

        new_username = user["username"]
        if username is not None:
            if not isinstance(username, str):
                return False, "Username must be a valid string."
            username_clean = username.strip()
            if len(username_clean) < 3 or len(username_clean) > 50:
                return False, "Username must be between 3 and 50 characters."
            if not re.match(r"^[\w\.\-]+$", username_clean):
                return False, "Username contains invalid characters."
            new_username = username_clean

        new_avatar = user["avatar"]
        if avatar is not None:
            if not isinstance(avatar, str):
                return False, "Avatar must be a valid string."
            avatar_clean = avatar.strip().lower()
            if avatar_clean not in VALID_AVATARS:
                return False, f"Invalid avatar. Must be one of: {', '.join(sorted(VALID_AVATARS))}."
            new_avatar = avatar_clean

        cursor.execute(
            "UPDATE users SET username = ?, avatar = ? WHERE id = ?",
            (new_username, new_avatar, user_id)
        )
        conn.commit()
        return True, {
            "id": user_id,
            "username": new_username,
            "email": user["email"],
            "elo_rating": user["elo_rating"],
            "matches_played": user["matches_played"],
            "wins": user["wins"],
            "losses": user["losses"],
            "avatar": new_avatar,
            "auth_provider": user["auth_provider"] if "auth_provider" in user.keys() else "local"
        }
    except sqlite3.IntegrityError:
        return False, "Username already taken."
    finally:
        conn.close()

def update_user_password(user_id, current_password, new_password):
    if not user_id or not isinstance(current_password, str) or not isinstance(new_password, str):
        return False, "Invalid password format."
    if len(new_password) < 6 or len(new_password) > 128:
        return False, "New password must be between 6 and 128 characters."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return False, "User not found."

        if not check_password_hash(user["password_hash"], current_password):
            return False, "Current password is incorrect."

        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), user_id)
        )
        conn.commit()
        return True, "Password updated successfully."
    finally:
        conn.close()

def get_or_create_google_user(google_id, email, name=None, avatar=None):
    if not google_id or not email:
        return False, "Google ID and email are required."

    email = str(email).strip().lower()
    google_id = str(google_id).strip()

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if user exists by google_id
        cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        user = cursor.fetchone()
        if user:
            return True, dict(user)

        # Check if user exists by email (link Google ID)
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if user:
            cursor.execute("UPDATE users SET google_id = ?, auth_provider = 'google' WHERE id = ?", (google_id, user["id"]))
            conn.commit()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
            return True, dict(cursor.fetchone())

        # Derive clean unique username
        base_name = name or email.split("@")[0]
        base_username = re.sub(r"[^\w\.\-]", "_", str(base_name).strip())[:30] or "Commander"
        if len(base_username) < 3:
            base_username = f"Commander_{base_username}"

        candidate_username = base_username
        counter = 1
        while True:
            cursor.execute("SELECT id FROM users WHERE username = ?", (candidate_username,))
            if not cursor.fetchone():
                break
            candidate_username = f"{base_username}_{counter}"
            counter += 1

        chosen_avatar = avatar if avatar in VALID_AVATARS else "knight"
        dummy_password = generate_password_hash(f"google_auth_{google_id}_{os.urandom(8).hex()}")

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, elo_rating, matches_played, wins, losses, avatar, auth_provider, google_id)
            VALUES (?, ?, ?, 1200, 0, 0, 0, ?, 'google', ?)
        """, (candidate_username, email, dummy_password, chosen_avatar, google_id))
        conn.commit()
        user_id = cursor.lastrowid

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        return True, dict(cursor.fetchone())
    except sqlite3.IntegrityError as e:
        return False, f"Failed to register Google account: {str(e)}"
    finally:
        conn.close()

def delete_user_account(user_id):
    if not user_id:
        return False, "Invalid user identifier."
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return False, "User not found."

        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return True, f"Account '{user['username']}' deleted successfully."
    finally:
        conn.close()



