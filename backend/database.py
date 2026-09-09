"""
ARCHESS - SQLite Database & Player Account Management Engine
Manages users, authentication, ELO ratings, match history, and telemetry persistence.
Data is persisted in: data/archess.db
"""

import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "archess.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

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

    conn.commit()

    # Schema migration: ensure matches table has turns and duration_sec columns
    cursor.execute("PRAGMA table_info(matches);")
    existing_cols = [c[1] for c in cursor.fetchall()]
    if "turns" not in existing_cols:
        cursor.execute("ALTER TABLE matches ADD COLUMN turns INTEGER DEFAULT 0;")
    if "duration_sec" not in existing_cols:
        cursor.execute("ALTER TABLE matches ADD COLUMN duration_sec INTEGER DEFAULT 0;")
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

    conn.close()

def register_user(username, email, password):
    username = username.strip()
    email = email.strip().lower()
    if len(username) < 3:
        return False, "Username must be at least 3 characters."
    if len(password) < 6:
        return False, "Password must be at least 6 characters."

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, generate_password_hash(password))
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return True, {"id": user_id, "username": username, "email": email, "elo_rating": 1200}
    except sqlite3.IntegrityError:
        conn.close()
        return False, "Username or email already exists."

def authenticate_user(username_or_email, password):
    query_param = username_or_email.strip()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (query_param, query_param.lower())
    )
    user = cursor.fetchone()
    conn.close()

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

def get_user_by_id(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, elo_rating, matches_played, wins, losses, avatar FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

def get_leaderboard(limit=50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT username, elo_rating, matches_played, wins, losses, avatar
    FROM users
    ORDER BY elo_rating DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def calculate_elo_change(rating_a, rating_b, score_a, k=32):
    """
    Standard FIDE Elo calculation.
    score_a: 1.0 for win, 0.5 for draw, 0.0 for loss
    """
    expected_a = 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))
    change_a = round(k * (score_a - expected_a))
    return change_a

def record_match_result(white_username, black_username, winner, white_damage=0, black_damage=0, turns=0, duration_sec=0):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO matches (white_username, black_username, winner, white_damage, black_damage, turns, duration_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (white_username, black_username, winner, white_damage, black_damage, turns, duration_sec))

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
    conn.close()
    return {
        "white_delta": delta_w,
        "black_delta": delta_b,
        "winner": winner
    }

def log_telemetry_event(correlation_id, event_type, payload):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO telemetry (correlation_id, event_type, payload) VALUES (?, ?, ?)",
        (correlation_id, event_type, str(payload))
    )
    conn.commit()
    conn.close()
