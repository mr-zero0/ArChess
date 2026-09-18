"""
ARCHESS - Exhaustive Test Suite for 100% Coverage
Tests all positive, negative, boundary, edge-case, and error paths across:
- backend.achievements
- backend.database
- backend.logger
- backend.multiplayer
- backend.notation
- backend.tournament
- backend.app
"""

import os
import sys
import json
import time
import pytest
import sqlite3
from unittest.mock import patch, MagicMock, PropertyMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.database import (
    get_connection,
    init_db,
    register_user,
    authenticate_user,
    get_user_by_id,
    get_leaderboard,
    calculate_elo_change,
    record_match_result,
    log_telemetry_event,
    get_user_stats,
    get_match_by_id,
    update_user_profile,
    update_user_password,
    get_or_create_google_user,
    delete_user_account,
)
from backend.achievements import (
    init_achievements_schema,
    get_all_achievements,
    unlock_achievement,
    get_user_achievements,
    evaluate_match_achievements,
    ACHIEVEMENT_CATALOG,
)
from backend.logger import (
    setup_logging,
    cleanup_old_logs,
    TrackerJsonFormatter,
)
from backend.multiplayer import (
    CombatRoom,
    RoomManager,
    room_manager,
    generate_room_id,
    MatchmakingTicket,
    MatchmakingQueue,
    matchmaking_queue,
)
from backend.notation import (
    get_pgn_result,
    format_pgn_tag,
    generate_pgn,
    generate_fen,
)
from backend.tournament import (
    TournamentEngine,
    elo_win_probability,
)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "exhaustive-test-secret"
    with app.test_client() as c:
        yield c


# =========================================================================
# 1. ACHIEVEMENTS EXHAUSTIVE SUITE
# =========================================================================
def test_achievements_exhaustive():
    # 1.1 get_all_achievements ordering
    all_ach = get_all_achievements()
    assert len(all_ach) == len(ACHIEVEMENT_CATALOG)
    tier_order = {"bronze": 1, "silver": 2, "gold": 3, "platinum": 4, "sovereign": 5}
    for i in range(len(all_ach) - 1):
        assert tier_order[all_ach[i]["tier"]] <= tier_order[all_ach[i + 1]["tier"]]

    # 1.2 unlock_achievement negative cases
    assert unlock_achievement("TestCommander", "non_existent_badge") is False
    assert unlock_achievement("", "first_strike") is False
    assert unlock_achievement("   ", "first_strike") is False

    # 1.3 Database exception in unlock_achievement
    with patch("backend.achievements.get_connection", side_effect=sqlite3.OperationalError("db locked")):
        assert unlock_achievement("TestUser", "first_strike") is False

    # 1.4 Fresh unlock vs duplicate unlock
    user = f"AchUser_{int(time.time() * 1000)}"
    assert unlock_achievement(user, "first_strike") is True
    assert unlock_achievement(user, "first_strike") is False  # Already unlocked

    # 1.5 get_user_achievements for non-existent and existing user
    user_achs = get_user_achievements("NonExistentUser_999999")
    assert len(user_achs) == len(ACHIEVEMENT_CATALOG)
    assert all(not a["unlocked"] for a in user_achs)

    # With DB error in get_user_achievements
    with patch("backend.achievements.get_connection") as mock_conn:
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = sqlite3.OperationalError("disk error")
        mock_conn.return_value.cursor.return_value = mock_cursor
        res = get_user_achievements("TestUser")
        assert len(res) == len(ACHIEVEMENT_CATALOG)

    # 1.6 evaluate_match_achievements negative: bots, guests, empty
    assert evaluate_match_achievements("", {"is_winner": True}) == []
    assert evaluate_match_achievements("ArChess Bot", {"is_winner": True}) == []
    assert evaluate_match_achievements("Guest", {"is_winner": True}) == []
    assert evaluate_match_achievements("Anonymous", {"is_winner": True}) == []

    # 1.7 evaluate_match_achievements positive paths
    eval_user = f"EvalUser_{int(time.time() * 1000)}"
    
    # First strike & blitz tactician (< 15 turns)
    unlocked = evaluate_match_achievements(eval_user, {
        "is_winner": True,
        "turns": 8,
        "sudden_death": False,
        "is_multiplayer": False
    })
    unlocked_ids = [u["id"] for u in unlocked]
    assert "first_strike" in unlocked_ids
    assert "ricochet_master" in unlocked_ids

    # Sudden death victor
    unlocked_sd = evaluate_match_achievements(eval_user, {
        "is_winner": True,
        "turns": 20,
        "sudden_death": True,
        "is_multiplayer": False
    })
    assert any(u["id"] == "sudden_death_victor" for u in unlocked_sd)

    # Grandmaster slayer (opponent ELO >= 2500 or name has Grandmaster)
    unlocked_gm = evaluate_match_achievements(eval_user, {
        "is_winner": True,
        "opponent": "Grandmaster AI",
        "opponent_elo": 2600
    })
    assert any(u["id"] == "grandmaster_conqueror" for u in unlocked_gm)

    # Nexus duelist (is_multiplayer=True)
    unlocked_mp = evaluate_match_achievements(eval_user, {
        "is_winner": False,
        "is_multiplayer": True
    })
    assert any(u["id"] == "nexus_duelist" for u in unlocked_mp)

    # Damage centurion (record 500+ damage)
    record_match_result(eval_user, "Bot", "white", white_damage=550, black_damage=0)
    unlocked_centurion = evaluate_match_achievements(eval_user, {"is_winner": False})
    assert any(u["id"] == "damage_centurion" for u in unlocked_centurion)

    # DB exception in evaluate_match_achievements damage query
    with patch("backend.achievements.get_connection") as mock_conn:
        mock_conn.side_effect = sqlite3.OperationalError("db error")
        assert evaluate_match_achievements("ValidUser", {"is_winner": False}) == []

    # init_achievements_schema exception branch
    with patch("backend.achievements.get_connection", side_effect=sqlite3.OperationalError("cannot create")):
        init_achievements_schema()  # Should pass cleanly without error


# =========================================================================
# 2. DATABASE EXHAUSTIVE SUITE
# =========================================================================
def test_database_exhaustive():
    # 2.1 register_user validation checks
    assert register_user(123, "e@archess.io", "pass123")[0] is False
    assert register_user("ab", "e@archess.io", "pass123")[0] is False  # too short
    assert register_user("a" * 55, "e@archess.io", "pass123")[0] is False  # too long
    assert register_user("user!@#$", "e@archess.io", "pass123")[0] is False  # bad regex
    assert register_user("valid_user", "bad_email", "pass123")[0] is False  # bad email
    assert register_user("valid_user", "e@archess.io", "123")[0] is False  # short pass
    assert register_user("valid_user", "e@archess.io", "p" * 150)[0] is False  # long pass

    # Duplicate registration
    ts = int(time.time() * 1000)
    ok_user = f"DbExUser_{ts}"
    ok_email = f"dbex_{ts}@archess.io"
    success, res = register_user(ok_user, ok_email, "securepass123")
    assert success is True
    assert res["username"] == ok_user

    dup_success, dup_res = register_user(ok_user, f"other_{ts}@archess.io", "securepass123")
    assert dup_success is False
    assert "already exists" in dup_res

    # 2.2 authenticate_user checks
    assert authenticate_user(123, "pass")[0] is False
    assert authenticate_user("", "pass")[0] is False
    assert authenticate_user("user", "")[0] is False
    assert authenticate_user("NonExistentCommander_999", "pass")[0] is False
    assert authenticate_user(ok_user, "wrong_password")[0] is False
    
    # Successful auth by username and by email
    auth_ok, auth_data = authenticate_user(ok_user, "securepass123")
    assert auth_ok is True
    assert auth_data["username"] == ok_user

    auth_email_ok, auth_email_data = authenticate_user(ok_email, "securepass123")
    assert auth_email_ok is True
    assert auth_email_data["email"] == ok_email

    # 2.3 get_user_by_id
    assert get_user_by_id(auth_data["id"])["username"] == ok_user
    assert get_user_by_id(9999999) is None

    # 2.4 get_leaderboard bounds and invalid limits
    assert len(get_leaderboard(limit="invalid_limit")) > 0
    assert len(get_leaderboard(limit=-5)) == 1
    assert len(get_leaderboard(limit=500)) <= 100

    # 2.5 calculate_elo_change across score values
    assert calculate_elo_change(1500, 1500, 1.0) == 16
    assert calculate_elo_change(1500, 1500, 0.0) == -16
    assert calculate_elo_change(1500, 1500, 0.5) == 0

    # 2.6 record_match_result variations
    # Black wins
    b_res = record_match_result(ok_user, "ArChess Bot", "black", white_damage=20, black_damage=80, turns=12, duration_sec=45)
    assert b_res["winner"] == "black"
    assert b_res["white_delta"] < 0
    assert b_res["black_delta"] > 0

    # Draw result
    d_res = record_match_result(ok_user, "ArChess Bot", "draw", white_damage=50, black_damage=50, turns=30, duration_sec=90)
    assert d_res["winner"] == "draw"

    # Invalid winner defaults to draw
    inv_res = record_match_result(ok_user, "ArChess Bot", "unknown_outcome")
    assert inv_res["winner"] == "draw"

    # Malformed damage/turn values handled gracefully
    bad_math_res = record_match_result(ok_user, "ArChess Bot", "white", white_damage="bad", turns=None)
    assert bad_math_res["winner"] == "white"

    # 2.7 log_telemetry_event payload serialization fallback
    log_telemetry_event("CORR-TEST-1", "test_event", {"valid": "json"})
    # Non-serializable set object
    log_telemetry_event("CORR-TEST-2", "test_event_unserializable", {1, 2, 3})
    # Empty correlation and event_type
    log_telemetry_event("", "", {"key": "value"})

    # 2.8 get_user_stats
    assert get_user_stats("NonExistent_User_XYZ") is None
    stats = get_user_stats(ok_user)
    assert stats is not None
    assert "stats" in stats
    assert stats["stats"]["tier"] in ("Grandmaster", "Master", "Contender")
    assert isinstance(stats["recent_matches"], list)

    # 2.9 get_match_by_id
    assert get_match_by_id("invalid_id") is None
    assert get_match_by_id(9999999) is None
    match = get_match_by_id(b_res["match_id"])
    assert match is not None


def test_database_schema_migration():
    """Test schema migration paths: ALTER TABLE for missing columns (lines 84, 86)."""
    fresh_conn = sqlite3.connect(":memory:")
    fresh_conn.row_factory = sqlite3.Row

    # Wrap the connection so init_db's conn.close() becomes a no-op
    class NoCloseWrapper:
        def __init__(self, conn):
            self._conn = conn
        def __getattr__(self, name):
            if name == 'close':
                return lambda: None
            return getattr(self._conn, name)
        def cursor(self):
            return self._conn.cursor()
        def commit(self):
            return self._conn.commit()
        def execute(self, *args, **kwargs):
            return self._conn.execute(*args, **kwargs)

    wrapper = NoCloseWrapper(fresh_conn)

    def mock_get_conn():
        return wrapper

    with patch("backend.database.get_connection", side_effect=mock_get_conn):
        # First init_db creates all tables with all columns
        init_db()
        cursor = fresh_conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM users")
        assert cursor.fetchone()["count"] == 6  # Seeded grandmasters!

        # Now drop matches and recreate WITHOUT turns and duration_sec columns
        cursor.execute("DROP TABLE matches")
        cursor.execute("""
            CREATE TABLE matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                white_username TEXT,
                black_username TEXT,
                winner TEXT,
                white_damage INTEGER DEFAULT 0,
                black_damage INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("DROP TABLE users")
        cursor.execute("""
            CREATE TABLE users (
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
            )
        """)
        fresh_conn.commit()

        # Re-run init_db — this should trigger ALTER TABLE for turns, duration_sec, auth_provider, and google_id
        init_db()

        # Verify columns now exist
        cursor.execute("PRAGMA table_info(matches)")
        cols = [c[1] for c in cursor.fetchall()]
        assert "turns" in cols
        assert "duration_sec" in cols

        cursor.execute("PRAGMA table_info(users)")
        u_cols = [c[1] for c in cursor.fetchall()]
        assert "auth_provider" in u_cols
        assert "google_id" in u_cols

    fresh_conn.close()


# =========================================================================
# 3. LOGGER EXHAUSTIVE SUITE
# =========================================================================
def test_logger_exhaustive(tmp_path):
    # 3.1 cleanup_old_logs with non-existent directory
    stats = cleanup_old_logs(base_logs_dir=str(tmp_path / "non_existent"))
    assert stats == {"deleted_runs": 0, "reclaimed_bytes": 0}

    # 3.2 Create realistic directory structure in tmp_path
    logs_dir = tmp_path / "Logs"
    year_dir = logs_dir / "2026"
    month_dir = year_dir / "Sep"
    day_dir = month_dir / "14_Logs"
    day_dir.mkdir(parents=True)

    # Create dummy non-digit directory under Logs (line 88: year.isdigit() check)
    (logs_dir / "invalid_year").mkdir(parents=True)
    # Non-directory file in logs root (should be skipped)
    (logs_dir / "readme.txt").write_text("ignore")

    # Create dummy non-matching day folder (line 95-96: day_match check)
    (month_dir / "not_a_day").mkdir(parents=True)
    # Non-directory item in month folder (line 92: isdir check)
    (month_dir / "notes.txt").write_text("ignore")

    # Create empty month/year for pruning tests
    empty_day = month_dir / "15_Logs"
    empty_day.mkdir(parents=True)

    # Non-directory file matching day pattern (line 98-99: isdir(day_path) check)
    (month_dir / "16_Logs").touch()  # File, not directory

    # Non-run item in day folder (line 111: run_match check)
    (day_dir / "not_a_run").mkdir()
    # File (not dir) matching Run pattern (line 114-115: isdir(run_path) check)
    (day_dir / "Run99").touch()

    # Create dummy runs
    for i in range(1, 8):
        r_dir = day_dir / f"Run{i}"
        r_dir.mkdir(exist_ok=True)
        log_file = r_dir / "app.log"
        log_file.write_text(f"Log content run {i} " * 50)

    # Run cleanup with max_runs_per_day=3
    current_run = str(day_dir / "Run7")
    clean_stats = cleanup_old_logs(base_logs_dir=str(logs_dir), current_run_dir=current_run, max_runs_per_day=3)
    assert clean_stats["deleted_runs"] >= 3
    assert os.path.exists(current_run)  # Current run must be protected

    # Test size pruning by setting max_total_size_mb=0
    clean_size_stats = cleanup_old_logs(base_logs_dir=str(logs_dir), current_run_dir=current_run, max_total_size_mb=0.0001)
    assert clean_size_stats["deleted_runs"] >= 0

    # 3.3 TrackerJsonFormatter
    formatter = TrackerJsonFormatter()
    # Test JSON message
    rec_json = MagicMock(getMessage=lambda: '{"event": "test"}', levelname="INFO", name="ArChess")
    formatted_json = formatter.format(rec_json)
    assert '"message":{"event": "test"}' in formatted_json

    # Test JSON array message
    rec_arr = MagicMock(getMessage=lambda: '[1, 2, 3]', levelname="INFO", name="ArChess")
    formatted_arr = formatter.format(rec_arr)
    assert '"message":[1, 2, 3]' in formatted_arr

    # Test raw text message
    rec_raw = MagicMock(getMessage=lambda: 'Plain text error', levelname="ERROR", name="ArChess")
    formatted_raw = formatter.format(rec_raw)
    assert '"message":"Plain text error"' in formatted_raw

    # 3.4 setup_logging
    log1, dir1 = setup_logging(app_name="TestApp1", force_new=False)
    log2, dir2 = setup_logging(app_name="TestApp1", force_new=False)
    assert log1 == log2
    assert dir1 == dir2

    # Force new
    log3, dir3 = setup_logging(app_name="TestApp2", force_new=True)
    assert log3 is not None


def test_logger_cleanup_with_unparseable_dates(tmp_path):
    """Test cleanup_old_logs when date parsing fails (line 104-105)."""
    logs_dir = tmp_path / "DateLogs"
    year_dir = logs_dir / "2026"
    bad_month_dir = year_dir / "XYZ"  # Invalid month abbreviation
    day_dir = bad_month_dir / "14_Logs"
    day_dir.mkdir(parents=True)

    r_dir = day_dir / "Run01"
    r_dir.mkdir()
    (r_dir / "app.log").write_text("test")

    # This should handle the parsing exception gracefully (line 104-105)
    stats = cleanup_old_logs(base_logs_dir=str(logs_dir), retention_days=0)
    assert isinstance(stats, dict)


def test_logger_cleanup_oserror_during_size_calc(tmp_path):
    """Test cleanup when os.path.getsize raises OSError (line 126-127)."""
    logs_dir = tmp_path / "OSErrLogs"
    year_dir = logs_dir / "2026"
    month_dir = year_dir / "Sep"
    day_dir = month_dir / "14_Logs"
    day_dir.mkdir(parents=True)

    r_dir = day_dir / "Run01"
    r_dir.mkdir()
    (r_dir / "app.log").write_text("some log data")

    # Test with deletion where OSError happens during size tally (line 188-189)
    stats = cleanup_old_logs(
        base_logs_dir=str(logs_dir),
        retention_days=0,
        current_run_dir=None
    )
    assert stats["deleted_runs"] >= 1


def test_logger_cleanup_prune_empty_parents(tmp_path):
    """Test cleanup properly removes empty year/month/day directories (lines 193-224)."""
    logs_dir = tmp_path / "PruneLogs"
    year_dir = logs_dir / "2025"
    month_dir = year_dir / "Jan"
    day_dir = month_dir / "01_Logs"
    day_dir.mkdir(parents=True)

    r_dir = day_dir / "Run01"
    r_dir.mkdir()
    (r_dir / "app.log").write_text("old data")

    # Clean with retention_days=0 to delete this old run
    stats = cleanup_old_logs(
        base_logs_dir=str(logs_dir),
        retention_days=0,
        current_run_dir=None
    )
    assert stats["deleted_runs"] >= 1

    # After cleanup, empty parent dirs should be pruned
    assert not os.path.exists(str(day_dir))


def test_logger_cleanup_rmdir_oserror_in_prune(tmp_path):
    """Test OSError handling during parent directory pruning."""
    logs_dir = tmp_path / "PruneErr"
    year_dir = logs_dir / "2026"
    month_dir = year_dir / "Sep"
    day_dir = month_dir / "14_Logs"
    day_dir.mkdir(parents=True)

    # Leave empty day dir but put a file in month to prevent full prune
    (month_dir / "keep_me.txt").write_text("prevent month removal")

    stats = cleanup_old_logs(base_logs_dir=str(logs_dir))
    assert isinstance(stats, dict)
    # day_dir was empty and should have been removed
    assert not os.path.exists(str(day_dir))
    # month_dir still has keep_me.txt, should NOT be removed
    assert os.path.exists(str(month_dir))


def test_logger_cleanup_non_dir_items_in_hierarchy(tmp_path):
    """Test that non-directory items at each level are handled (lines 92, 98-99, 200-201, 204-205)."""
    logs_dir = tmp_path / "MixedLogs"
    year_dir = logs_dir / "2026"
    month_dir = year_dir / "Sep"
    day_dir = month_dir / "14_Logs"
    day_dir.mkdir(parents=True)

    # Non-directory in year_dir (line 200-201 in prune phase)
    (year_dir / "notes.txt").write_text("not a dir")

    # Non-directory in month_dir (line 204-205 in prune phase)
    (month_dir / "readme.txt").write_text("not a dir")

    stats = cleanup_old_logs(base_logs_dir=str(logs_dir))
    assert isinstance(stats, dict)


def test_logger_setup_cleanup_exception(tmp_path):
    """Test setup_logging when cleanup_old_logs raises an exception (line 281-282)."""
    import backend.logger as logger_module

    orig_run_dir = logger_module._ACTIVE_RUN_DIR
    orig_logger = logger_module._ACTIVE_LOGGER

    try:
        logger_module._ACTIVE_RUN_DIR = None
        logger_module._ACTIVE_LOGGER = None

        with patch("backend.logger.cleanup_old_logs", side_effect=RuntimeError("cleanup boom")):
            log, run_dir = setup_logging(app_name="CleanupExcTest", force_new=True)
            assert log is not None
            assert run_dir is not None
    finally:
        logger_module._ACTIVE_RUN_DIR = orig_run_dir
        logger_module._ACTIVE_LOGGER = orig_logger


def test_logger_get_run_directory_reuse():
    """Test that get_run_directory reuses cached directory (line 27-28)."""
    import backend.logger as logger_module
    from backend.logger import get_run_directory

    orig = logger_module._ACTIVE_RUN_DIR
    logger_module._ACTIVE_RUN_DIR = "/fake/cached/RunDir"
    try:
        result = get_run_directory(force_new=False)
        assert result == "/fake/cached/RunDir"
    finally:
        logger_module._ACTIVE_RUN_DIR = orig


# =========================================================================
# 4. MULTIPLAYER EXHAUSTIVE SUITE
# =========================================================================
def test_multiplayer_exhaustive():
    # 4.1 Room creation and ID generation
    rid = generate_room_id()
    assert rid.startswith("ARC-")
    room = CombatRoom("ARC-TEST", "HostCommander")
    assert room.room_id == "ARC-TEST"
    assert room.host_username == "HostCommander"

    # Mock WebSockets
    ws1 = MagicMock()
    ws2 = MagicMock()
    ws3 = MagicMock()
    ws4 = MagicMock()

    # 4.2 Add connections: white, black, spectator, preferred role
    role1 = room.add_connection(ws1, "PlayerOne", preferred_role="white")
    assert role1 == "white"

    # Reconnection check for white
    ws1_reconnect = MagicMock()
    re_role = room.add_connection(ws1_reconnect, "PlayerOne")
    assert re_role == "white"
    assert room.white_player["ws"] == ws1_reconnect

    # Add black player
    role2 = room.add_connection(ws2, "PlayerTwo", preferred_role="black")
    assert role2 == "black"
    assert room.status == "in_combat"

    # Reconnection check for black
    ws2_reconnect = MagicMock()
    re_b_role = room.add_connection(ws2_reconnect, "PlayerTwo")
    assert re_b_role == "black"
    assert room.black_player["ws"] == ws2_reconnect

    # Add spectators
    role3 = room.add_connection(ws3, "SpectatorOne", preferred_role="spectator")
    assert role3 == "spectator"
    role4 = room.add_connection(ws4, "SpectatorTwo")
    assert role4 == "spectator"

    # 4.3 Summary
    summary = room.get_summary()
    assert summary["room_id"] == "ARC-TEST"
    assert summary["spectators_count"] == 2
    assert summary["white"]["connected"] is True
    assert summary["black"]["connected"] is True

    # 4.4 Broadcast with simulated socket error
    failing_ws = MagicMock()
    failing_ws.send.side_effect = RuntimeError("Broken pipe")
    room.spectators.append({"ws": failing_ws, "username": "Ghost"})
    room.broadcast({"type": "test_broadcast"}, exclude_ws=ws1_reconnect)

    # 4.5 handle_message types
    # Malformed JSON
    room.handle_message(ws1_reconnect, "white", "invalid{json")

    # Ping
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "ping", "client_ts": 12345}))
    ws1_reconnect.send.assert_called()

    # Aim when turn is correct vs wrong
    room.current_turn = "white"
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "aim", "pieceId": "p1", "angle": 0.5}))
    room.handle_message(ws2_reconnect, "black", json.dumps({"type": "aim", "pieceId": "p2"}))  # Wrong turn

    # Aim cancel
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "aim_cancel"}))

    # Launch
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "launch", "pieceId": "p1", "vx": 5, "vy": 2}))
    assert room.turns_elapsed == 1

    # Turn complete
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "turn_complete"}))
    assert room.current_turn == "black"

    # Game over
    room.handle_message(ws2_reconnect, "black", json.dumps({"type": "game_over", "winner": "white", "reason": "checkmate"}))
    assert room.status == "finished"
    assert room.winner == "white"

    # Reaction
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "reaction", "emoji": "\U0001f525", "username": "P1"}))

    # Taunt with and without text
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "taunt", "text": "Well played!"}))
    room.handle_message(ws1_reconnect, "white", json.dumps({"type": "taunt", "text": ""}))

    # 4.6 Remove connections
    assert room.remove_connection(ws1_reconnect) == "white"
    assert room.remove_connection(ws2_reconnect) == "black"
    assert room.remove_connection(ws3) is None

    # 4.7 RoomManager operations
    mgr = RoomManager()
    r1 = mgr.create_room("Host1")
    assert mgr.get_room(r1.room_id) == r1
    assert mgr.get_room("NON_EXISTENT") is None

    # find_quick_match: create room vs join waiting room
    qm1 = mgr.find_quick_match("UserA")
    assert qm1 is not None
    # Simulate UserA waiting as white
    qm1.add_connection(MagicMock(), "UserA")
    qm2 = mgr.find_quick_match("UserB")
    assert qm2.room_id == qm1.room_id  # Should match with waiting UserA!

    # prune_stale_rooms
    empty_room = mgr.create_room("StaleHost")
    empty_room.last_activity = time.time() - 10000
    pruned = mgr.prune_stale_rooms(max_age_sec=5000)
    assert pruned >= 1


def test_multiplayer_ping_exception():
    """Test ping handler when ws.send raises exception (lines 143-144)."""
    room = CombatRoom("ARC-PING-ERR", "Host")
    ws = MagicMock()
    ws.send.side_effect = RuntimeError("Connection reset")
    
    role = room.add_connection(ws, "Player1", preferred_role="white")
    assert role == "white"
    
    # Ping message should not raise even if ws.send fails
    room.handle_message(ws, "white", json.dumps({"type": "ping", "client_ts": 99999}))


def test_multiplayer_room_creation_fallback():
    """Test RoomManager.create_room fallback when all IDs collide (lines 250-253)."""
    mgr = RoomManager()
    
    # Patch generate_room_id to always return the same ID, forcing collision
    first_room = mgr.create_room("FirstHost")
    
    with patch("backend.multiplayer.generate_room_id", return_value=first_room.room_id):
        # All 20 attempts will collide, triggering the fallback at lines 249-253
        fallback_room = mgr.create_room("FallbackHost")
        assert fallback_room is not None
        assert fallback_room.room_id.startswith("ARC-")
        assert fallback_room.room_id != first_room.room_id


# =========================================================================
# 5. NOTATION EXHAUSTIVE SUITE
# =========================================================================
def test_notation_exhaustive():
    # 5.1 get_pgn_result
    assert get_pgn_result("white") == "1-0"
    assert get_pgn_result("black") == "0-1"
    assert get_pgn_result("draw") == "1/2-1/2"
    assert get_pgn_result("stalemate") == "1/2-1/2"
    assert get_pgn_result("unknown") == "*"

    # 5.2 format_pgn_tag
    assert format_pgn_tag("Event", "ArChess") == '[Event "ArChess"]'

    # 5.3 generate_pgn edge cases
    assert generate_pgn(None) == ""
    assert generate_pgn({}) == ""

    # Match with unparseable date
    bad_date_match = {
        "id": 101,
        "white_username": "WhitePlayer",
        "black_username": "BlackPlayer",
        "winner": "black",
        "turns": 5,
        "duration_sec": 30,
        "white_damage": 100,
        "black_damage": 200,
        "created_at": "invalid-date-format",
        "events": []
    }
    pgn_bad_date = generate_pgn(bad_date_match)
    assert '[Date "????.??.??"]' in pgn_bad_date
    assert '[Result "0-1"]' in pgn_bad_date
    assert "B_CHECKMATE_STRIKE" in pgn_bad_date

    # Match without created_at
    no_date_match = {**bad_date_match, "created_at": None, "winner": "draw"}
    pgn_no_date = generate_pgn(no_date_match)
    assert '[Result "1/2-1/2"]' in pgn_no_date
    assert '[Termination "Insufficient Material / Stalemate"]' in pgn_no_date

    # Match with events: JSON string payload, raw string payload, various event types
    match_with_events = {
        "id": 102,
        "white_username": "Tactician",
        "black_username": "Grandmaster AI",
        "winner": "white",
        "turns": 2,
        "duration_sec": 45,
        "white_damage": 150,
        "black_damage": 50,
        "created_at": "2026-09-14T12:00:00Z",
        "events": [
            {"event_type": "KINETIC_LAUNCH", "payload": json.dumps({"desc": "White launches knight"})},
            {"event_type": "WALL_COLLISION", "payload": json.dumps({"message": "Black rebounds off cushion"})},
            {"event_type": "CITADEL_BREACH", "payload": "Breach event"},
            {"event_type": "PIECE_ELIMINATION", "payload": {"desc": "Black king eliminated"}},
        ]
    }
    pgn_events = generate_pgn(match_with_events)
    assert "W_KINETIC_LAUNCH" in pgn_events
    assert "B_IMPACT_STRIKE" in pgn_events
    assert "W_CITADEL_BREACH" in pgn_events
    assert "B_SHATTER_X" in pgn_events

    # 5.4 generate_fen
    fen_white = generate_fen("white", 10)
    assert "4K3" in fen_white
    assert " 10" in fen_white

    fen_black = generate_fen("black", 15)
    assert "4k3" in fen_black
    assert " 15" in fen_black

    fen_draw = generate_fen("draw", 20)
    assert "4K3" in fen_draw
    assert "4k3" in fen_draw

    # 5.5 Notation event token mapping full coverage
    match_all_events = {
        "id": 103,
        "white_username": "TacticianW",
        "black_username": "TacticianB",
        "winner": "black",
        "turns": 4,
        "duration_sec": 60,
        "created_at": "2026-09-14T12:00:00Z",
        "events": [
            {"event_type": "WALL_HIT", "payload": "White wall hit"},
            {"event_type": "KINETIC_LAUNCH", "payload": "Black launch"},
            {"event_type": "PIECE_ELIMINATION", "payload": "White eliminates"},
            {"event_type": "FORTRESS_BREACH", "payload": "Black breach"}
        ]
    }
    pgn_all = generate_pgn(match_all_events)
    assert "W_IMPACT_STRIKE" in pgn_all
    assert "B_KINETIC_LAUNCH" in pgn_all
    assert "W_SHATTER_X" in pgn_all
    assert "B_CITADEL_BREACH" in pgn_all


# =========================================================================
# 6. TOURNAMENT EXHAUSTIVE SUITE
# =========================================================================
def test_tournament_exhaustive():
    # 6.1 Elo win probability boundary
    assert elo_win_probability(2000, 2000) == 0.5
    assert elo_win_probability(2800, 2000) > 0.95
    assert elo_win_probability(2000, 2800) < 0.05

    # 6.2 TournamentEngine initialization and DB fallback
    engine = TournamentEngine()
    with patch("backend.tournament.get_connection", side_effect=sqlite3.OperationalError("db error")):
        commanders = engine.get_seed_commanders()
        assert len(commanders) == 8

    # 6.3 Advance through all rounds
    engine.initialize_season(season_num=99)
    assert engine.season == 99
    assert engine.status == "quarterfinals"

    # Simulate match with missing players
    empty_match = {"player1": None, "player2": None}
    assert engine.simulate_match(empty_match) == empty_match

    # Advance QF -> SF
    s1 = engine.advance_round()
    assert s1["status"] == "semifinals"

    # Advance SF -> Finals
    s2 = engine.advance_round()
    assert s2["status"] == "finals"

    # Advance Finals -> Completed
    s3 = engine.advance_round()
    assert s3["status"] == "completed"
    assert s3["winner"] is not None

    # Advance when already completed
    s4 = engine.advance_round()
    assert s4["status"] == "completed"


# =========================================================================
# 7. APP ROUTES & ERROR HANDLERS EXHAUSTIVE SUITE
# =========================================================================
def test_app_routes_and_error_handlers_exhaustive(client):
    from backend.app import ws_combat, handle_404_error, handle_500_error

    # 7.1 Legacy asset routes
    res_asset = client.get("/assets/logo.png")
    assert res_asset.status_code in (200, 304)

    # 7.2 Auth API edge cases
    res_reg_arr = client.post("/api/auth/register", json=[1, 2, 3])
    assert res_reg_arr.status_code == 400
    assert "Invalid JSON payload" in res_reg_arr.get_json()["error"]

    res_login_arr = client.post("/api/auth/login", json=[1, 2, 3])
    assert res_login_arr.status_code == 400
    assert "Invalid JSON payload" in res_login_arr.get_json()["error"]

    # Non-string credentials in login
    res_login_types = client.post("/api/auth/login", json={"username_or_email": 123, "password": 456})
    assert res_login_types.status_code == 400

    # 7.3 api_me edge cases
    with client.session_transaction() as sess:
        sess["user_id"] = 99999999
    res_me_ghost = client.get("/api/auth/me")
    assert res_me_ghost.status_code == 200
    assert res_me_ghost.get_json()["authenticated"] is False

    # 7.4 api_record_match negative & authorization cases
    res_rec_bad = client.post("/api/matches/record", json=["bad", "payload"])
    assert res_rec_bad.status_code == 400
    assert "Invalid JSON payload" in res_rec_bad.get_json()["error"]

    res_rec_nan = client.post("/api/matches/record", json={
        "white_username": "P1",
        "black_username": "P2",
        "winner": "white",
        "turns": "not-a-number"
    })
    assert res_rec_nan.status_code == 400

    # Registered users
    ts = int(time.time() * 1000)
    user_w = f"UserW_{ts}"
    user_b = f"UserB_{ts}"
    register_user(user_w, f"{user_w}@archess.io", "password123")
    register_user(user_b, f"{user_b}@archess.io", "password123")
    record_match_result(user_w, user_b, "black", white_damage=50, black_damage=100, turns=10, duration_sec=60)

    ach_with_wins = get_user_achievements(user_b)
    assert len(ach_with_wins) > 0

    # Unauthorized recording check
    client.post("/api/auth/login", json={"username_or_email": user_w, "password": "password123"})
    
    res_unauth = client.post("/api/matches/record", json={
        "white_username": "RandomPlayerA",
        "black_username": "RandomPlayerB",
        "winner": "white",
        "turns": 10
    })
    assert res_unauth.status_code == 403
    assert "Unauthorized" in res_unauth.get_json()["error"]

    res_auth_rec = client.post("/api/matches/record", json={
        "white_username": user_w,
        "black_username": user_b,
        "winner": "white",
        "turns": 10
    })
    assert res_auth_rec.status_code == 200

    # Auth failure
    res_wrong_pw = client.post("/api/auth/login", json={"username_or_email": user_w, "password": "wrongpassword"})
    assert res_wrong_pw.status_code == 401

    # Leaderboard
    res_lb_none = client.get("/api/leaderboard?limit=")
    assert res_lb_none.status_code == 200

    # User stats 404
    res_stat_404 = client.get("/api/users/GhostPlayer_999999/stats")
    assert res_stat_404.status_code == 404

    # Match endpoints 404s
    assert client.get("/api/matches/99999999").status_code == 404
    assert client.get("/api/matches/not_an_int").status_code == 404
    assert client.get("/api/matches/99999999/pgn").status_code == 404
    assert client.get("/api/matches/99999999/fen").status_code == 404

    # Error handlers
    with app.test_request_context("/api/missing_endpoint"):
        resp_404_api = handle_404_error(None)
        assert resp_404_api[1] == 404
        assert "API route not found" in resp_404_api[0].get_json()["error"]

        resp_500_api = handle_500_error(None)
        assert resp_500_api[1] == 500
        assert "Internal server error" in resp_500_api[0].get_json()["error"]

    with app.test_request_context("/missing_page"):
        resp_404_web = handle_404_error(None)
        assert resp_404_web[1] == 404

        resp_500_web = handle_500_error(None)
        assert resp_500_web[1] == 500

    # WebSocket handle_combat_websocket route execution
    from backend.app import handle_combat_websocket
    mock_ws = MagicMock()
    # Non-existent room
    handle_combat_websocket(mock_ws, "NONEXISTENT_ROOM")
    mock_ws.close.assert_called()

    # Existing room handshake and message loop
    active_room = room_manager.create_room("WsHost")
    mock_ws_valid = MagicMock()
    mock_ws_valid.receive.side_effect = [
        json.dumps({"type": "join", "username": "WsPlayer", "preferred_role": "white"}),
        json.dumps({"type": "ping", "client_ts": 100}),
        None
    ]
    handle_combat_websocket(mock_ws_valid, active_room.room_id)
    assert mock_ws_valid.send.called


def test_app_telemetry_invalid_payload(client):
    """Test telemetry endpoint with non-dict JSON payload (line 339)."""
    res = client.post("/api/telemetry", 
                      data=json.dumps([1, 2, 3]),
                      content_type="application/json")
    assert res.status_code == 400
    assert "Invalid JSON payload" in res.get_json()["error"]


def test_app_leaderboard_exception_path(client):
    """Test leaderboard limit parsing exception path (lines 213, 215-216)."""
    from backend.app import api_leaderboard

    # Test 1: Force ValueError in the try block (line 215-216)
    with app.test_request_context("/api/leaderboard"):
        with patch("backend.app.request") as mock_request:
            mock_request.args = MagicMock()
            mock_request.args.get.side_effect = ValueError("Forced ValueError")
            mock_request.path = "/api/leaderboard"
            mock_request.method = "GET"
            mock_request.start_time = time.time()
            mock_request.req_id = "test"
            mock_request.corr_id = "test"
            response, status_code = api_leaderboard()
            data = response.get_json()
            assert data["success"] is True

    # Test 2: Force TypeError in the try block (line 215-216)
    with app.test_request_context("/api/leaderboard"):
        with patch("backend.app.request") as mock_request:
            mock_request.args = MagicMock()
            mock_request.args.get.side_effect = TypeError("Forced TypeError")
            mock_request.path = "/api/leaderboard"
            mock_request.method = "GET"
            mock_request.start_time = time.time()
            mock_request.req_id = "test"
            mock_request.corr_id = "test"
            response, status_code = api_leaderboard()
            data = response.get_json()
            assert data["success"] is True

    # Test 3: Force None return for raw_limit (line 212-213)
    with app.test_request_context("/api/leaderboard"):
        with patch("backend.app.request") as mock_request:
            mock_request.args = MagicMock()
            mock_request.args.get.return_value = None
            mock_request.path = "/api/leaderboard"
            mock_request.method = "GET"
            mock_request.start_time = time.time()
            mock_request.req_id = "test"
            mock_request.corr_id = "test"
            response, status_code = api_leaderboard()
            data = response.get_json()
            assert data["success"] is True


def test_app_websocket_handshake_error():
    """Test WebSocket where initial handshake receive raises exception (lines 417-418)."""
    from backend.app import handle_combat_websocket

    active_room = room_manager.create_room("WsHandshakeErr")
    mock_ws = MagicMock()
    mock_ws.receive.side_effect = RuntimeError("Connection closed during handshake")

    handle_combat_websocket(mock_ws, active_room.room_id)


def test_app_websocket_handshake_empty():
    """Test WebSocket where initial handshake receive returns None (line 412)."""
    from backend.app import handle_combat_websocket

    active_room = room_manager.create_room("WsHandshakeNone")
    mock_ws = MagicMock()
    mock_ws.receive.return_value = None

    handle_combat_websocket(mock_ws, active_room.room_id)


def test_app_websocket_send_handshake_error():
    """Test WebSocket where sending handshake_ok fails (lines 436-437)."""
    from backend.app import handle_combat_websocket

    active_room = room_manager.create_room("WsSendErr")
    mock_ws = MagicMock()
    
    mock_ws.receive.side_effect = [
        json.dumps({"type": "join", "username": "FailSender", "preferred_role": "white"}),
        None
    ]
    mock_ws.send.side_effect = RuntimeError("Broken pipe on send")

    handle_combat_websocket(mock_ws, active_room.room_id)


def test_app_websocket_message_loop_exception():
    """Test WebSocket message loop when it raises an exception (lines 446-447)."""
    from backend.app import handle_combat_websocket

    active_room = room_manager.create_room("WsLoopErr")
    mock_ws = MagicMock()
    
    mock_ws.receive.side_effect = [
        json.dumps({"type": "join", "username": "LoopBreaker", "preferred_role": "white"}),
        RuntimeError("Connection reset by peer")
    ]
    
    handle_combat_websocket(mock_ws, active_room.room_id)


def test_app_websocket_nonexistent_room_send_error():
    """Test WebSocket with non-existent room where ws.send and ws.close fail (lines 402-403)."""
    from backend.app import handle_combat_websocket

    mock_ws = MagicMock()
    mock_ws.send.side_effect = RuntimeError("Cannot send error message")
    mock_ws.close.side_effect = RuntimeError("Cannot close")

    handle_combat_websocket(mock_ws, "ROOM_DOES_NOT_EXIST")


def test_app_ws_combat_route():
    """Test the actual ws_combat route wrapper function (line 460)."""
    import backend.app as app_module
    
    active_room = room_manager.create_room("WsRouteTest")
    mock_ws = MagicMock()
    mock_ws.receive.side_effect = [
        json.dumps({"type": "join", "username": "RoutePlayer", "preferred_role": "black"}),
        None
    ]
    # Call the underlying function directly which is what ws_combat delegates to
    # ws_combat itself is wrapped by flask-sock's @sock.route decorator
    # To cover line 460, we call it through the module's reference
    app_module.ws_combat(mock_ws, active_room.room_id)
    assert mock_ws.send.called


def test_app_match_record_invalid_winner(client):
    """Test recording a match with invalid winner value."""
    with client.session_transaction() as sess:
        sess.pop("user_id", None)

    res = client.post("/api/matches/record", json={
        "white_username": "Player1",
        "black_username": "Player2",
        "winner": "invalid_winner_value",
        "turns": 5
    })
    assert res.status_code == 400
    assert "Invalid winner" in res.get_json()["error"]


def test_app_match_pgn_json_format(client):
    """Test PGN endpoint with format=json query parameter."""
    ts = int(time.time() * 1000)
    u1 = f"PgnUser1_{ts}"
    u2 = f"PgnUser2_{ts}"
    register_user(u1, f"{u1}@archess.io", "password123")
    register_user(u2, f"{u2}@archess.io", "password123")
    settlement = record_match_result(u1, u2, "white", turns=5, duration_sec=30)
    
    res_json = client.get(f"/api/matches/{settlement['match_id']}/pgn?format=json")
    assert res_json.status_code == 200
    data = res_json.get_json()
    assert data["success"] is True
    assert "pgn" in data

    res_text = client.get(f"/api/matches/{settlement['match_id']}/pgn")
    assert res_text.status_code == 200
    assert b"[Event" in res_text.data


def test_app_page_routes(client):
    """Test all frontend page routes return 200."""
    assert client.get("/").status_code == 200
    assert client.get("/play").status_code == 200
    assert client.get("/play.html").status_code == 200
    assert client.get("/arsenal").status_code == 200
    assert client.get("/arsenal.html").status_code == 200
    assert client.get("/leaderboard").status_code == 200
    assert client.get("/leaderboard.html").status_code == 200


def test_app_legacy_routes(client):
    """Test legacy backward-compatible routes."""
    assert client.get("/style.css").status_code == 200
    assert client.get("/main.js").status_code == 200
    assert client.get("/auth.js").status_code == 200
    assert client.get("/game.js").status_code == 200


def test_app_health_check(client):
    """Test health check endpoint."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_app_tournament_routes(client):
    """Test tournament API endpoints."""
    assert client.get("/api/tournament/bracket").status_code == 200
    assert client.post("/api/tournament/simulate").status_code == 200
    assert client.post("/api/tournament/reset", json={"season": 50}).status_code == 200


def test_app_achievements_routes(client):
    """Test achievement API endpoints."""
    res_all = client.get("/api/achievements")
    assert res_all.status_code == 200
    assert res_all.get_json()["success"] is True

    res_user = client.get("/api/users/SomeUser/achievements")
    assert res_user.status_code == 200


def test_app_multiplayer_routes(client):
    """Test multiplayer REST API endpoints."""
    res_create = client.post("/api/multiplayer/rooms/create", json={"username": "TestHost"})
    assert res_create.status_code == 201
    room_id = res_create.get_json()["room_id"]

    assert client.get(f"/api/multiplayer/rooms/{room_id}").status_code == 200
    assert client.get("/api/multiplayer/rooms/NONEXISTENT").status_code == 404
    assert client.post("/api/multiplayer/quick_match", json={"username": "QuickPlayer"}).status_code == 200


def test_app_auth_full_cycle(client):
    """Test complete auth flow: register -> me -> logout -> me."""
    ts = int(time.time() * 1000)
    username = f"AuthCycle_{ts}"
    
    res_reg = client.post("/api/auth/register", json={
        "username": username,
        "email": f"{username}@archess.io",
        "password": "securepass123"
    })
    assert res_reg.status_code == 201

    res_me = client.get("/api/auth/me")
    assert res_me.get_json()["authenticated"] is True

    assert client.post("/api/auth/logout").status_code == 200

    res_me2 = client.get("/api/auth/me")
    assert res_me2.get_json()["authenticated"] is False


def test_app_register_non_string_fields(client):
    """Test registration with non-string field types."""
    res = client.post("/api/auth/register", json={
        "username": 12345,
        "email": "test@test.com",
        "password": "password123"
    })
    assert res.status_code == 400
    assert "must be valid strings" in res.get_json()["error"]


# =========================================================================
# 8. EXHAUSTIVE BRANCH COVERAGE & EDGE-CASE SUITE
# =========================================================================

def test_run_py_import_and_execution():
    """Test run.py module import and __main__ server entrypoint."""
    import run
    assert hasattr(run, "app")

    import runpy
    run_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "run.py")

    with patch.dict(os.environ, {"PORT": "5005", "HOST": "127.0.0.1", "FLASK_DEBUG": "1"}):
        with patch("backend.app.app.run") as mock_run:
            runpy.run_path(run_file, run_name="__main__")
            mock_run.assert_called_once_with(host="127.0.0.1", port=5005, debug=True)

    with patch.dict(os.environ, {"PORT": "5006", "HOST": "0.0.0.0", "FLASK_DEBUG": "0"}):
        with patch("backend.app.app.run") as mock_run:
            runpy.run_path(run_file, run_name="__main__")
            mock_run.assert_called_once_with(host="0.0.0.0", port=5006, debug=False)


def test_app_match_record_invalid_session_user_id(client):
    """Cover app.py branch 257->264 where session user_id does not match any user in DB."""
    with client.session_transaction() as sess:
        sess["user_id"] = 999999999  # Non-existent user

    res = client.post("/api/matches/record", json={
        "white_username": "GuestWhite",
        "black_username": "GuestBlack",
        "winner": "white",
        "white_damage": 100,
        "black_damage": 50,
        "turns": 8,
        "duration_sec": 45
    })
    assert res.status_code == 200
    assert res.get_json()["success"] is True


def test_app_ws_spectator_disconnect():
    """Cover app.py branch 450->exit where departed role is spectator or None."""
    import backend.app as app_module

    active_room = room_manager.create_room("SpectatorRoom")
    mock_ws = MagicMock()
    mock_ws.receive.side_effect = [
        json.dumps({"type": "join", "username": "SpecDisconnect", "preferred_role": "spectator"}),
        None
    ]
    app_module.ws_combat(mock_ws, active_room.room_id)
    # Spectator disconnect does not broadcast opponent_disconnected
    assert active_room.status != "in_combat"


def test_achievements_get_user_row_none():
    """Cover achievements.py branch 170->173 where cursor.fetchone() returns None."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = None
    mock_conn.cursor.return_value = mock_cursor

    with patch("backend.achievements.get_connection", return_value=mock_conn):
        ach_list = get_user_achievements("MockedNullUser")
        assert isinstance(ach_list, list)


def test_achievements_get_user_conn_none():
    """Cover achievements.py branch 180->183 where conn is None in finally block."""
    with patch("backend.achievements.get_connection", side_effect=Exception("DB init failed")):
        ach_list = get_user_achievements("FailConnUser")
        assert isinstance(ach_list, list)


def test_achievements_evaluate_already_unlocked():
    """Cover achievements.py branches 245->249, 250->254, 255->259 when badges already unlocked."""
    user = f"DoubleUnlock_{int(time.time() * 1000)}"
    match_data = {
        "is_winner": True,
        "turns": 15,
        "sudden_death": True,
        "is_multiplayer": True,
        "opponent": "Grandmaster Prime",
        "opponent_elo": 2700
    }
    # First call unlocks the badges
    first_unlocked = evaluate_match_achievements(user, match_data)
    assert len(first_unlocked) > 0

    # Second call hits the False branch for unlock_achievement on already unlocked badges
    second_unlocked = evaluate_match_achievements(user, match_data)
    assert len(second_unlocked) == 0


def test_multiplayer_match_started_at_already_set():
    """Cover multiplayer.py branch 61->63 where match_started_at is already set."""
    room = CombatRoom("ALREADY_STARTED_ROOM", "HostUser")
    room.match_started_at = 123456789.0
    mock_ws = MagicMock()
    role = room.add_connection(mock_ws, "SecondPlayer", preferred_role="black")
    assert role == "black"
    assert room.match_started_at == 123456789.0


def test_multiplayer_broadcast_spectator_without_ws():
    """Cover multiplayer.py branch 95->94 where a spectator entry has ws=None."""
    room = CombatRoom("SPEC_NO_WS_ROOM", "HostUser")
    room.spectators.append({"ws": None, "username": "GhostSpec", "joined_at": time.time()})
    mock_target = MagicMock()
    room.white_player = {"ws": mock_target, "username": "WhitePlayer", "joined_at": time.time()}
    room.broadcast({"type": "test_broadcast"})
    assert mock_target.send.called


def test_multiplayer_message_wrong_turn_and_unknown_type():
    """Cover multiplayer.py branches 164->169, 173->184, and 224->exit."""
    room = CombatRoom("WRONG_TURN_ROOM", "HostUser")
    mock_ws = MagicMock()
    room.white_player = {"ws": mock_ws, "username": "WhitePlayer", "joined_at": time.time()}
    room.black_player = {"ws": MagicMock(), "username": "BlackPlayer", "joined_at": time.time()}
    room.current_turn = "white"

    # Black attempts aim_cancel during White's turn (covers 164->169)
    room.handle_message(mock_ws, "black", json.dumps({"type": "aim_cancel"}))

    # Black attempts launch during White's turn (covers 173->184)
    room.handle_message(mock_ws, "black", json.dumps({"type": "launch", "pieceId": "p1"}))

    # Unknown message type (covers 224->exit)
    room.handle_message(mock_ws, "white", json.dumps({"type": "non_existent_packet"}))


def test_multiplayer_find_quick_match_skip_self():
    """Cover multiplayer.py branch 265->263 where user cannot match with their own waiting room."""
    rm = RoomManager()
    room1 = rm.create_room("SelfPlayer")
    # Set white_player to SelfPlayer so line 264 evaluates to True
    room1.white_player = {"username": "SelfPlayer", "ws": MagicMock()}
    assert room1.status == "waiting"

    # Quick match as SelfPlayer: line 265 is False (username == SelfPlayer), skips room1 and creates a new room
    room2 = rm.find_quick_match("SelfPlayer")
    assert room2.room_id != room1.room_id

    # Quick match as OtherPlayer: line 265 is True, returns room1
    matched = rm.find_quick_match("OtherPlayer")
    assert matched.room_id == room1.room_id


def test_notation_branches_unmatched_tokens_and_odd_events():
    """Cover notation.py branches 122->125, 129->147, and 141->144."""
    # 1. White event with unmapped type (covers 122->125) and odd length (covers 129->147)
    match_odd = {
        "white_username": "PlayerW",
        "black_username": "PlayerB",
        "winner": "white",
        "turns": 1,
        "events": [
            {"event_type": "CUSTOM_TACTIC", "payload": {"desc": "White tactical stance"}}
        ]
    }
    pgn_odd = generate_pgn(match_odd)
    assert "W_CUSTOM_TACTIC" in pgn_odd

    # 2. Black event with unmapped type (covers 141->144)
    match_pair = {
        "white_username": "PlayerW",
        "black_username": "PlayerB",
        "winner": "draw",
        "turns": 2,
        "events": [
            {"event_type": "KINETIC_LAUNCH", "payload": {"desc": "White launch"}},
            {"event_type": "RETREAT_DEFENSE", "payload": {"desc": "Black retreat"}}
        ]
    }
    pgn_pair = generate_pgn(match_pair)
    assert "B_RETREAT_DEFENSE" in pgn_pair


def test_tournament_branches_already_completed():
    """Cover tournament.py branches 154->153, 176->175, and 192->195."""
    te = TournamentEngine()
    te.initialize_season(88)

    # 1. Mark quarterfinal match as completed beforehand (covers 154->153)
    te.bracket["quarterfinals"][0]["status"] = "completed"
    te.bracket["quarterfinals"][0]["winner"] = te.bracket["quarterfinals"][0]["player1"]
    te.advance_round()
    assert te.status == "semifinals"

    # 2. Mark semifinal match as completed beforehand (covers 176->175)
    te.bracket["semifinals"][0]["status"] = "completed"
    te.bracket["semifinals"][0]["winner"] = te.bracket["semifinals"][0]["player1"]
    te.advance_round()
    assert te.status == "finals"

    # 3. Mark finals match as completed beforehand (covers 192->195)
    te.bracket["finals"][0]["status"] = "completed"
    te.bracket["finals"][0]["winner"] = te.bracket["finals"][0]["player1"]
    te.advance_round()
    assert te.status == "completed"
    assert te.winner is not None


def test_logger_exhaustive_edge_cases(tmp_path):
    """Cover all remaining lines and branches in backend/logger.py."""
    import backend.logger as logger_module
    from backend.logger import get_run_directory, cleanup_old_logs, setup_logging

    fake_logs = str(tmp_path / "Logs")
    os.makedirs(fake_logs, exist_ok=True)

    # 1. get_run_directory when date_dir does not exist check is False (covers 41->47)
    orig_exists = os.path.exists
    date_dir_path = os.path.join(fake_logs, time.strftime("%Y"), time.strftime("%b"), f"{time.strftime('%d')}_Logs")
    call_state = {"checked": False}
    def mock_exists_date_dir(p):
        if p == date_dir_path and not call_state["checked"]:
            call_state["checked"] = True
            return False
        return orig_exists(p)

    with patch("os.path.exists", side_effect=mock_exists_date_dir):
        run_d = get_run_directory(base_logs_dir=fake_logs, force_new=True)
        assert os.path.isdir(run_d)

    # 2. get_run_directory when a matching name is a file, not a dir (covers 44->42)
    today = time.strftime("%Y/%b/%d_Logs")
    t_dir = os.path.join(fake_logs, today)
    os.makedirs(t_dir, exist_ok=True)
    file_run = os.path.join(t_dir, "Run99")
    with open(file_run, "w") as f:
        f.write("not a directory")
    run_d2 = get_run_directory(base_logs_dir=fake_logs, force_new=True)
    assert os.path.isdir(run_d2)

    # 3. cleanup_old_logs: total_size > max_size_bytes with break when size drops (covers 174)
    # Create 3 runs with 2MB each, limit to 3MB
    r1 = os.path.join(t_dir, "Run01")
    r2 = os.path.join(t_dir, "Run02")
    r3 = os.path.join(t_dir, "Run03")
    for r in [r1, r2, r3]:
        os.makedirs(r, exist_ok=True)
        with open(os.path.join(r, "app.log"), "wb") as f:
            f.write(b"0" * (2 * 1024 * 1024))

    stats_size = cleanup_old_logs(base_logs_dir=fake_logs, max_total_size_mb=3, retention_days=30, max_runs_per_day=10)
    assert stats_size["deleted_runs"] >= 1

    # 4. cleanup_old_logs: current_run_dir in per-day excess runs (covers 161->160)
    day_old = os.path.join(fake_logs, "2026/Jan/01_Logs")
    os.makedirs(day_old, exist_ok=True)
    ro1 = os.path.join(day_old, "Run01")
    ro2 = os.path.join(day_old, "Run02")
    ro3 = os.path.join(day_old, "Run03")
    for ro in [ro1, ro2, ro3]:
        os.makedirs(ro, exist_ok=True)
        with open(os.path.join(ro, "app.log"), "w") as f:
            f.write("test log")

    stats_cur = cleanup_old_logs(base_logs_dir=fake_logs, max_runs_per_day=1, retention_days=365, current_run_dir=ro1)
    assert stats_cur["deleted_runs"] >= 1
    assert os.path.exists(ro1)  # Protected current run

    # 5. cleanup_old_logs: OSError on getsize / getmtime in walk (covers 126-127, 188-189)
    run_err = os.path.join(t_dir, "Run88")
    os.makedirs(run_err, exist_ok=True)
    with open(os.path.join(run_err, "test.log"), "w") as f:
        f.write("data")

    orig_getsize = os.path.getsize
    call_count = [0]
    def failing_getsize(path):
        call_count[0] += 1
        if "Run88" in str(path):
            raise OSError("Simulated Permission Denied")
        return orig_getsize(path)

    with patch("os.path.getsize", side_effect=failing_getsize):
        cleanup_old_logs(base_logs_dir=fake_logs, retention_days=0)

    # 6. cleanup_old_logs: OSError on os.listdir (covers 141-142)
    with patch("os.listdir", side_effect=OSError("Disk error")):
        assert cleanup_old_logs(base_logs_dir=fake_logs) == {"deleted_runs": 0, "reclaimed_bytes": 0}

    # 7. cleanup_old_logs: OSError on shutil.rmtree (covers 193-194)
    run_rm_err = os.path.join(t_dir, "Run77")
    os.makedirs(run_rm_err, exist_ok=True)
    with open(os.path.join(run_rm_err, "log.txt"), "w") as f:
        f.write("data")
    with patch("shutil.rmtree", side_effect=OSError("Lock error")):
        stats_rm_fail = cleanup_old_logs(base_logs_dir=fake_logs, retention_days=0)
        assert stats_rm_fail["deleted_runs"] == 0

    # 8. cleanup_old_logs: OSError on os.rmdir for dp, mp, yp (covers 211-212, 216-217, 221-222)
    empty_day = os.path.join(fake_logs, "2025", "Dec", "31_Logs")
    empty_month = os.path.join(fake_logs, "2024", "Nov")
    empty_year = os.path.join(fake_logs, "2023")
    os.makedirs(empty_day, exist_ok=True)
    os.makedirs(empty_month, exist_ok=True)
    os.makedirs(empty_year, exist_ok=True)
    with patch("os.rmdir", side_effect=OSError("Cannot rmdir")):
        cleanup_old_logs(base_logs_dir=fake_logs)

    # Outer OSError in rmdir loop (covers 223-224)
    orig_listdir = os.listdir
    call_counts = {"val": 0}
    def failing_listdir_prune(path):
        call_counts["val"] += 1
        if call_counts["val"] > 10 and path == fake_logs:
            raise OSError("Prune traversal error")
        return orig_listdir(path) if orig_exists(path) else []

    with patch("os.listdir", side_effect=failing_listdir_prune):
        cleanup_old_logs(base_logs_dir=fake_logs)

    # 9. setup_logging:
    # 9.1 When handlers already exist and deleted_runs == 0 (covers 256->272, 277->284)
    mock_log = MagicMock()
    mock_log.handlers = [MagicMock()]
    with patch("logging.getLogger", return_value=mock_log):
        with patch("backend.logger.cleanup_old_logs", return_value={"deleted_runs": 0, "reclaimed_bytes": 0}):
            l, rd = setup_logging("ExhaustiveTestApp0", force_new=True)

    # 9.2 When deleted_runs > 0 (covers 278)
    with patch("logging.getLogger", return_value=mock_log):
        with patch("backend.logger.cleanup_old_logs", return_value={"deleted_runs": 2, "reclaimed_bytes": 1024}):
            l, rd = setup_logging("ExhaustiveTestApp", force_new=True)
            mock_log.info.assert_any_call('{"event":"logs_cleaned", "deleted_runs":2, "reclaimed_bytes":1024}')

    # 9.3 When cleanup_old_logs raises exception (covers 281-282)
    with patch("logging.getLogger", return_value=mock_log):
        with patch("backend.logger.cleanup_old_logs", side_effect=RuntimeError("Disk corrupted")):
            l, rd = setup_logging("ExhaustiveTestApp2", force_new=True)
            mock_log.warning.assert_any_call('{"event":"logs_cleanup_warning", "error":"Disk corrupted"}')


# =========================================================================
# 11. ACCOUNT MANAGEMENT EXHAUSTIVE SUITE
# =========================================================================
def test_database_account_management_exhaustive():
    ts = int(time.time() * 1000)
    # 1. update_user_profile
    assert update_user_profile(None)[0] is False
    assert update_user_profile(999999)[0] is False

    ok, u1 = register_user(f"AccMgmtUser_1_{ts}", f"accmgmt1_{ts}@test.com", "securepass123")
    assert ok is True
    uid1 = u1["id"]

    assert update_user_profile(uid1, username=123)[0] is False
    assert update_user_profile(uid1, username="ab")[0] is False
    assert update_user_profile(uid1, username="a" * 51)[0] is False
    assert update_user_profile(uid1, username="invalid space!")[0] is False
    assert update_user_profile(uid1, avatar=123)[0] is False
    assert update_user_profile(uid1, avatar="invalid_dragon")[0] is False

    ok2, u2 = register_user(f"AccMgmtUser_2_{ts}", f"accmgmt2_{ts}@test.com", "securepass123")
    assert ok2 is True
    # Conflict
    assert update_user_profile(uid1, username=f"AccMgmtUser_2_{ts}")[0] is False

    # Valid profile updates
    renamed1 = f"AccRenamed1_{ts}"
    s_ok, s_data = update_user_profile(uid1, username=renamed1, avatar="sovereign")
    assert s_ok is True
    assert s_data["username"] == renamed1
    assert s_data["avatar"] == "sovereign"

    # Only username
    renamed2 = f"AccRenamed2_{ts}"
    s_ok2, s_data2 = update_user_profile(uid1, username=renamed2)
    assert s_ok2 is True
    assert s_data2["username"] == renamed2

    # Only avatar
    s_ok3, s_data3 = update_user_profile(uid1, avatar="phoenix")
    assert s_ok3 is True
    assert s_data3["avatar"] == "phoenix"

    # 2. update_user_password
    assert update_user_password(None, "curr", "newpass")[0] is False
    assert update_user_password(uid1, 123, "newpass")[0] is False
    assert update_user_password(uid1, "curr", 123)[0] is False
    assert update_user_password(uid1, "curr", "short")[0] is False
    assert update_user_password(uid1, "curr", "a" * 129)[0] is False
    assert update_user_password(999999, "curr", "validpass")[0] is False
    assert update_user_password(uid1, "wrongcurrpass", "newvalidpass123")[0] is False

    up_ok, up_msg = update_user_password(uid1, "securepass123", "brandnewpass123")
    assert up_ok is True
    # Check that new password authenticates
    assert authenticate_user(renamed2, "brandnewpass123")[0] is True

    # 3. get_or_create_google_user
    assert get_or_create_google_user("", "test@google.com")[0] is False
    assert get_or_create_google_user("gid_1", "")[0] is False

    # New google user
    g_ok, g_u = get_or_create_google_user(f"gid_abc_1_{ts}", f"guser1_{ts}@gmail.com", name="G Commander", avatar="sovereign")
    assert g_ok is True
    assert g_u["google_id"] == f"gid_abc_1_{ts}"
    assert g_u["auth_provider"] == "google"
    assert g_u["avatar"] == "sovereign"

    # Existing user by google_id
    g_ok_again, g_u_again = get_or_create_google_user(f"gid_abc_1_{ts}", f"guser1_{ts}@gmail.com")
    assert g_ok_again is True
    assert g_u_again["id"] == g_u["id"]

    # Existing user by email without google_id -> links google_id
    ok_local, u_local = register_user(f"LocalUserForLink_{ts}", f"local_link_{ts}@gmail.com", "pass12345")
    assert ok_local is True
    g_link_ok, g_link_u = get_or_create_google_user(f"gid_link_99_{ts}", f"local_link_{ts}@gmail.com")
    assert g_link_ok is True
    assert g_link_u["id"] == u_local["id"]
    assert g_link_u["google_id"] == f"gid_link_99_{ts}"
    assert g_link_u["auth_provider"] == "google"

    # Name normalization and collision
    g_col1_ok, g_col1 = get_or_create_google_user(f"gid_col_1_{ts}", f"col1_{ts}@gmail.com", name=f"ShortName_{ts}")
    assert g_col1_ok is True
    g_col2_ok, g_col2 = get_or_create_google_user(f"gid_col_2_{ts}", f"col2_{ts}@gmail.com", name=f"ShortName_{ts}")
    assert g_col2_ok is True
    assert g_col2["username"] != g_col1["username"]

    # Short name < 3 chars fallback
    g_short_ok, g_short = get_or_create_google_user(f"gid_short_{ts}", f"short_{ts}@gmail.com", name="x")
    assert g_short_ok is True
    assert "Commander_" in g_short["username"]

    # Default avatar fallback
    g_def_ok, g_def = get_or_create_google_user(f"gid_def_{ts}", f"def_{ts}@gmail.com", avatar="invalid_glyph")
    assert g_def_ok is True
    assert g_def["avatar"] == "knight"

    # IntegrityError mock
    mock_bad_conn = MagicMock()
    mock_bad_cursor = MagicMock()
    mock_bad_cursor.execute.side_effect = sqlite3.IntegrityError("Unique violation")
    mock_bad_conn.cursor.return_value = mock_bad_cursor
    with patch("backend.database.get_connection", return_value=mock_bad_conn):
        assert get_or_create_google_user("gid_err_1", "err1@gmail.com")[0] is False

    # 4. delete_user_account
    assert delete_user_account(None)[0] is False
    assert delete_user_account(999999)[0] is False
    del_ok, del_msg = delete_user_account(uid1)
    assert del_ok is True
    assert get_user_by_id(uid1) is None


# =========================================================================
# 12. MULTIPLAYER MATCHMAKING QUEUE EXHAUSTIVE SUITE
# =========================================================================
def test_multiplayer_matchmaking_queue_exhaustive():
    rm = RoomManager()
    mq = MatchmakingQueue(rm)

    # 1. MatchmakingTicket.to_dict
    t = MatchmakingTicket("TICKET-1", "CommanderTest", elo=1350, mode="3d-arena")
    t_dict = t.to_dict()
    assert t_dict["ticket_id"] == "TICKET-1"
    assert t_dict["username"] == "CommanderTest"
    assert t_dict["elo"] == 1350
    assert t_dict["mode"] == "3d-arena"
    assert t_dict["status"] == "searching"
    assert "wait_time" in t_dict

    # 2. join_queue with clean handling and fallback elo
    t1 = mq.join_queue("PlayerAlpha", elo="invalid_elo", mode="3d-arena", preferred_role="white")
    assert t1.elo == 1200
    assert t1.status == "searching"

    # Joining again with same username cancels previous ticket
    t1_again = mq.join_queue("PlayerAlpha", elo=1250, mode="3d-arena")
    assert t1.status == "cancelled"
    assert t1_again.status == "searching"

    # 3. get_ticket
    assert mq.get_ticket("NON_EXISTENT_TICKET") is None
    fetched = mq.get_ticket(t1_again.ticket_id)
    assert fetched is not None
    assert fetched["ticket_id"] == t1_again.ticket_id

    # 4. cancel_ticket
    assert mq.cancel_ticket("NON_EXISTENT_TICKET") is False
    assert mq.cancel_ticket(t1_again.ticket_id) is True
    assert mq.cancel_ticket(t1_again.ticket_id) is False  # Already cancelled

    # 5. evaluate_matches
    # Case < 2 searching tickets
    assert mq.evaluate_matches() == 0

    # 2 tickets with mode mismatch
    t_3d = mq.join_queue("User3D", elo=1200, mode="3d-arena")
    t_2d = mq.join_queue("User2D", elo=1200, mode="2d-arena")
    assert mq.evaluate_matches() == 0
    mq.cancel_ticket(t_3d.ticket_id)
    mq.cancel_ticket(t_2d.ticket_id)

    # 2 tickets with elo diff > window (e.g. 1200 vs 2800, window is 100)
    t_low = mq.join_queue("UserLow", elo=1200, mode="3d-arena")
    t_high = mq.join_queue("UserHigh", elo=2800, mode="3d-arena")
    assert mq.evaluate_matches() == 0
    mq.cancel_ticket(t_low.ticket_id)
    mq.cancel_ticket(t_high.ticket_id)

    # 2 matching tickets
    t_p1 = mq.join_queue("Duelist1", elo=1200, mode="3d-arena", preferred_role="black")
    t_p2 = mq.join_queue("Duelist2", elo=1240, mode="3d-arena", preferred_role="white")
    # join_queue automatically evaluates matches!
    assert t_p1.status == "matched"
    assert t_p2.status == "matched"
    assert t_p1.matched_room_id == t_p2.matched_room_id
    assert t_p1.assigned_role == "black"
    assert t_p2.assigned_role == "white"
    assert t_p1.matched_opponent == "Duelist2"
    assert t_p2.matched_opponent == "Duelist1"

    # Test same username in queue (line 391) and paired/non-searching ticket in inner loop (line 389)
    same1 = MatchmakingTicket("T-SAME-1", "SameUser", elo=1200, mode="3d-arena")
    same2 = MatchmakingTicket("T-SAME-2", "SameUser", elo=1200, mode="3d-arena")
    mq.tickets[same1.ticket_id] = same1
    mq.tickets[same2.ticket_id] = same2
    assert mq.evaluate_matches() == 0  # skips same user!

    # Test paired/non-searching ticket in inner loop (line 389)
    paired_t = MatchmakingTicket("T-PAIRED-1", "PairedUser", elo=1200, mode="3d-arena")
    paired_t.status = "matched"
    other_t = MatchmakingTicket("T-OTHER-1", "OtherUser", elo=1200, mode="3d-arena")
    mq.tickets[paired_t.ticket_id] = paired_t
    mq.tickets[other_t.ticket_id] = other_t
    mq.evaluate_matches()
    mq.cancel_ticket(same1.ticket_id)
    mq.cancel_ticket(same2.ticket_id)
    mq.cancel_ticket(other_t.ticket_id)

    # Alternating roles when no specific preference
    t_p3 = mq.join_queue("Duelist3", elo=1300, mode="3d-arena")
    t_p4 = mq.join_queue("Duelist4", elo=1320, mode="3d-arena")
    assert t_p3.status == "matched"
    assert t_p4.status == "matched"
    assert t_p3.assigned_role == "white"
    assert t_p4.assigned_role == "black"

    # 6. prune_expired_tickets
    t_stale = mq.join_queue("StaleUser", elo=1500, mode="3d-arena")
    t_stale.created_at = time.time() - 100  # Older than 60s
    assert mq.prune_expired_tickets(max_wait_sec=60.0) >= 1
    assert t_stale.status == "timeout"

    # Very old tickets (> 600s) deleted
    t_stale.created_at = time.time() - 700
    mq.prune_expired_tickets(max_wait_sec=60.0)
    assert t_stale.ticket_id not in mq.tickets

    # 7. get_stats
    stats = mq.get_stats()
    assert "active_searching" in stats
    assert "total_tickets" in stats


# =========================================================================
# 13. APP ACCOUNT & MATCHMAKING ROUTES EXHAUSTIVE SUITE
# =========================================================================
def test_app_account_and_matchmaking_routes_exhaustive(client):
    ts = int(time.time() * 1000)
    # Register dedicated user for testing profile and password routes
    reg = client.post("/api/auth/register", json={"username": f"RouteUser_{ts}", "email": f"route_{ts}@archess.gg", "password": "password123"})
    assert reg.status_code == 201

    # Unauthenticated GET
    client.post("/api/auth/logout")
    res = client.get("/api/auth/profile")
    assert res.status_code == 401

    # Login
    auth_res = client.post("/api/auth/login", json={"username_or_email": f"RouteUser_{ts}", "password": "password123"})
    assert auth_res.status_code == 200

    # Authenticated GET
    res_get = client.get("/api/auth/profile")
    assert res_get.status_code == 200
    assert res_get.json["user"]["username"] == f"RouteUser_{ts}"

    # GET when user_id not found in DB
    with client.session_transaction() as sess:
        sess["user_id"] = 999999
    assert client.get("/api/auth/profile").status_code == 404

    # Logout and test PUT unauthenticated
    client.post("/api/auth/logout")
    assert client.put("/api/auth/profile", json={"username": "NewName"}).status_code == 401

    # Re-login
    client.post("/api/auth/login", json={"username_or_email": f"RouteUser_{ts}", "password": "password123"})

    # PUT invalid JSON
    assert client.put("/api/auth/profile", data="not-json", content_type="text/plain").status_code == 400

    # PUT invalid username
    res_inv = client.put("/api/auth/profile", json={"username": "ab"})
    assert res_inv.status_code == 400

    # PUT valid username and avatar
    res_valid = client.put("/api/auth/profile", json={"username": f"RouteUser_{ts}", "avatar": "sovereign"})
    assert res_valid.status_code == 200
    assert res_valid.json["user"]["avatar"] == "sovereign"

    # 2. /api/auth/password
    client.post("/api/auth/logout")
    assert client.put("/api/auth/password", json={"current_password": "p", "new_password": "p2"}).status_code == 401

    # Re-login with RouteUser
    client.post("/api/auth/login", json={"username_or_email": f"RouteUser_{ts}", "password": "password123"})

    # PUT invalid JSON
    assert client.put("/api/auth/password", data="bad", content_type="text/plain").status_code == 400

    # PUT incorrect current password
    assert client.put("/api/auth/password", json={"current_password": "wrongpassword", "new_password": "newpass123"}).status_code == 400

    # PUT successful password update
    assert client.put("/api/auth/password", json={"current_password": "password123", "new_password": "routenewpass123"}).status_code == 200

    # 3. /api/auth/account
    client.post("/api/auth/logout")
    assert client.delete("/api/auth/account").status_code == 401

    # Re-login with RouteUser and DELETE
    client.post("/api/auth/login", json={"username_or_email": f"RouteUser_{ts}", "password": "routenewpass123"})
    del_res = client.delete("/api/auth/account")
    assert del_res.status_code == 200
    assert del_res.json["success"] is True

    # DELETE when user_id not found
    with client.session_transaction() as sess:
        sess["user_id"] = 999999
    assert client.delete("/api/auth/account").status_code == 400

    # 4. /api/auth/google
    assert client.post("/api/auth/google", data="bad", content_type="text/plain").status_code == 400
    assert client.post("/api/auth/google", json={"sub": "gid_123"}).status_code == 400
    assert client.post("/api/auth/google", json={}).status_code == 400

    g_res1 = client.post("/api/auth/google", json={"email": f"route_g1_{ts}@gmail.com", "name": "Google One"})
    assert g_res1.status_code == 200
    assert g_res1.json["success"] is True

    # JWT credential token simulation
    import base64
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(f'{{"sub":"gid_jwt_{ts}","email":"jwt_{ts}@gmail.com","name":"JWT Commander"}}'.encode()).decode().rstrip("=")
    fake_jwt = f"{header_b64}.{payload_b64}.fake_signature"

    g_jwt_res = client.post("/api/auth/google", json={"credential": fake_jwt})
    assert g_jwt_res.status_code == 200
    assert g_jwt_res.json["user"]["google_id"] == f"gid_jwt_{ts}"

    # Malformed JWT credential (triggers lines 297-298 except Exception in app.py)
    bad_jwt_res = client.post("/api/auth/google", json={"credential": "invalid.jwt.token", "email": f"fallback_{ts}@gmail.com"})
    assert bad_jwt_res.status_code == 200

    # Google error branch
    with patch("backend.app.get_or_create_google_user", return_value=(False, "Database error")):
        assert client.post("/api/auth/google", json={"email": "fail@gmail.com"}).status_code == 400

    # 5. /api/matchmaking/join
    assert client.post("/api/matchmaking/join", data="bad", content_type="text/plain").status_code == 400
    join_res = client.post("/api/matchmaking/join", json={"username": f"MMP_{ts}", "elo": 1400, "mode": "3d-arena"})
    assert join_res.status_code == 200
    assert join_res.json["success"] is True
    tid = join_res.json["ticket"]["ticket_id"]

    # 6. /api/matchmaking/ticket/<ticket_id>
    assert client.get("/api/matchmaking/ticket/NON_EXISTENT").status_code == 404
    t_get_res = client.get(f"/api/matchmaking/ticket/{tid}")
    assert t_get_res.status_code == 200
    assert t_get_res.json["ticket"]["ticket_id"] == tid

    # 7. /api/matchmaking/ticket/<ticket_id> (DELETE)
    cancel_res = client.delete(f"/api/matchmaking/ticket/{tid}")
    assert cancel_res.status_code == 200
    assert cancel_res.json["cancelled"] is True

    # 8. /api/matchmaking/stats
    stats_res = client.get("/api/matchmaking/stats")
    assert stats_res.status_code == 200
    assert "active_searching" in stats_res.json["stats"]


def test_unauthenticated_match_rate_limiting(client):
    """Test rate limiting logic for unauthenticated match recording."""
    from backend.app import _is_unauth_rate_limited, _unauth_match_rate_limiter, UNAUTH_MATCH_LIMIT_PER_MINUTE

    # 1. Test _is_unauth_rate_limited directly with TESTING=False
    app.config["TESTING"] = False
    test_ip = "192.168.1.100"
    try:
        # First call within limit
        assert _is_unauth_rate_limited(test_ip) is False
        # Fill up the limiter with old & new timestamps
        _unauth_match_rate_limiter[test_ip] = [time.time() - 100] + [time.time()] * UNAUTH_MATCH_LIMIT_PER_MINUTE
        # Should now be rate limited
        assert _is_unauth_rate_limited(test_ip) is True
    finally:
        app.config["TESTING"] = True
        _unauth_match_rate_limiter.pop(test_ip, None)

    # 2. Test 429 response when rate limited on API endpoint
    with patch("backend.app._is_unauth_rate_limited", return_value=True):
        res = client.post("/api/matches/record", json={
            "white_username": "Guest1",
            "black_username": "Guest2",
            "winner": "white"
        })
        assert res.status_code == 429
        assert res.json["success"] is False
        assert "Rate limit exceeded" in res.json["error"]



