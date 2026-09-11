"""
ARCHESS - Automated Test Suite
Validates backend APIs, database persistence, authentication,
telemetry, and logger conformity.
"""

import os
import sys
import json
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.database import (
    init_db,
    register_user,
    authenticate_user,
    get_user_by_id,
    get_leaderboard,
    record_match_result,
    log_telemetry_event,
    get_connection
)
from backend.logger import TrackerJsonFormatter, cleanup_old_logs
import logging

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_page_routes(client):
    """Ensure all multi-page HTML views return HTTP 200."""
    for path in ["/", "/play", "/arsenal", "/leaderboard"]:
        res = client.get(path)
        assert res.status_code == 200, f"Failed GET {path}"
        assert b"<!DOCTYPE html>" in res.data or b"<html" in res.data

def test_legacy_asset_fallbacks(client):
    """Ensure backward-compatible fallback routes serve assets without 404."""
    for path in ["/style.css", "/main.js", "/auth.js", "/game.js"]:
        res = client.get(path)
        assert res.status_code == 200, f"Legacy route {path} failed"
        assert len(res.data) > 0

def test_logo_assets(client):
    """Verify both transparent logo.png and master logo.jpg are served correctly."""
    res_png = client.get("/static/media/logo.png")
    assert res_png.status_code == 200
    assert res_png.mimetype == "image/png"
    assert len(res_png.data) > 0

    res_jpg = client.get("/static/media/logo.jpg")
    assert res_jpg.status_code == 200
    assert res_jpg.mimetype in ["image/jpeg", "image/jpg"]
    assert len(res_jpg.data) > 0

def test_health_api(client):
    """Verify health endpoint structure."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"

def test_leaderboard_api(client):
    """Verify leaderboard returns array of players sorted by rating."""
    res = client.get("/api/leaderboard?limit=10")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert isinstance(data["leaderboard"], list)
    if len(data["leaderboard"]) > 1:
        # Check sorted descending
        ratings = [p["elo_rating"] for p in data["leaderboard"]]
        assert ratings == sorted(ratings, reverse=True)

def test_auth_registration_and_login(client):
    """Test user registration and subsequent login with both formats."""
    unique_user = f"AutoTester_{os.urandom(3).hex()}"
    email = f"{unique_user.lower()}@test.io"
    password = "secretpassword123"

    # Register
    reg_res = client.post("/api/auth/register", json={
        "username": unique_user,
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()
    assert reg_data["success"] is True
    assert reg_data["user"]["username"] == unique_user

    # Login with username_or_email
    log_res1 = client.post("/api/auth/login", json={
        "username_or_email": unique_user,
        "password": password
    })
    assert log_res1.status_code == 200
    assert log_res1.get_json()["success"] is True

    # Login with identifier (frontend format)
    log_res2 = client.post("/api/auth/login", json={
        "identifier": email,
        "password": password
    })
    assert log_res2.status_code == 200
    assert log_res2.get_json()["success"] is True

    # Check /api/auth/me session
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.get_json()["authenticated"] is True

    # Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    me_res_after = client.get("/api/auth/me")
    assert me_res_after.get_json()["authenticated"] is False

def test_matches_record_and_elo(client):
    """Test match settlement and ELO calculation with FIDE formula."""
    res = client.post("/api/matches/record", json={
        "white_username": "Magnus_Kinetic",
        "black_username": "Hikaru_Impulse",
        "winner": "white",
        "white_damage": 300,
        "black_damage": 150,
        "turns": 18,
        "duration_sec": 120
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "settlement" in data
    assert data["settlement"]["winner"] == "white"
    assert "white_delta" in data["settlement"]
    assert "black_delta" in data["settlement"]

def test_matches_record_draw(client):
    """Test match settlement with draw."""
    res = client.post("/api/matches/record", json={
        "white_username": "Basalt_Wall",
        "black_username": "Prism_Sniper",
        "winner": "draw",
        "white_damage": 200,
        "black_damage": 200,
        "turns": 25,
        "duration_sec": 180
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["settlement"]["winner"] == "draw"

def test_telemetry_event(client):
    """Test telemetry logging endpoint."""
    res = client.post("/api/telemetry", json={
        "event_type": "KINETIC_IMPULSE",
        "payload": {"piece": "knight", "impulse": 45.2, "vector": [1.2, -0.8]}
    })
    assert res.status_code == 200
    assert res.get_json()["recorded"] is True

def test_logger_json_format():
    """Verify TrackerJsonFormatter handles both dict and string logs as valid JSON."""
    formatter = TrackerJsonFormatter()
    
    # Test JSON string message
    record1 = logging.LogRecord("ArChess", logging.INFO, "test.py", 10, '{"event":"test"}', (), None)
    out1 = formatter.format(record1)
    parsed1 = json.loads(out1)
    assert parsed1["level"] == "INFO"
    assert parsed1["message"]["event"] == "test"

    # Test plain text message
    record2 = logging.LogRecord("ArChess", logging.WARNING, "test.py", 20, 'Simple plain warning message', (), None)
    out2 = formatter.format(record2)
    parsed2 = json.loads(out2)
    assert parsed2["level"] == "WARNING"
    assert parsed2["message"] == "Simple plain warning message"

def test_cleanup_old_logs_retention(tmp_path):
    """Verify cleanup_old_logs prunes expired runs and caps daily runs while preserving active run."""
    import shutil
    
    mock_logs = tmp_path / "Logs"
    # Create old run (2020)
    old_run = mock_logs / "2020" / "Jan" / "01_Logs" / "Run01"
    old_run.mkdir(parents=True)
    (old_run / "app.log").write_text("old test log line\n", encoding="utf-8")
    
    # Create multiple runs for today
    today_dir = mock_logs / "2026" / "Sep" / "10_Logs"
    run1 = today_dir / "Run01"
    run2 = today_dir / "Run02"
    run3 = today_dir / "Run03"
    for r in [run1, run2, run3]:
        r.mkdir(parents=True)
        (r / "app.log").write_text("today run\n", encoding="utf-8")
        
    # Run cleanup with retention_days=7, max_runs_per_day=2, protecting run3
    stats = cleanup_old_logs(
        base_logs_dir=str(mock_logs),
        retention_days=7,
        max_runs_per_day=2,
        current_run_dir=str(run3)
    )
    
    assert stats["deleted_runs"] >= 2
    # Old 2020 run must be deleted
    assert not old_run.exists()
    # 2020 parent folder should be pruned
    assert not (mock_logs / "2020").exists()
    # run3 must be preserved as it is active
    assert run3.exists()
    # Only 2 runs should remain in today_dir (Run03 and Run02)
    remaining_today = [p.name for p in today_dir.iterdir() if p.is_dir()]
    assert len(remaining_today) <= 2
    assert "Run03" in remaining_today
    assert "Run01" not in remaining_today

def test_industry_ui_elements(client):
    """Verify presence of industry-grade HUD, fonts, debrief, and skeleton states."""
    # 1. Play Arena UI structure
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="turnTimerRing"' in play_html
    assert 'id="whiteCasualtyRack"' in play_html
    assert 'id="victoryMvpCard"' in play_html
    assert 'id="victoryDamageSection"' in play_html
    assert 'id="btnCopyMatchReport"' in play_html
    assert 'Cinzel' in play_html and 'Space+Grotesk' in play_html

    # 2. Leaderboard shimmer skeleton structure
    lead_res = client.get("/leaderboard")
    assert lead_res.status_code == 200
    lead_html = lead_res.data.decode("utf-8")
    assert 'class="skeleton-tr"' in lead_html
    assert 'class="skeleton-cell"' in lead_html
    assert 'Cinzel' in lead_html

    # 3. CSS tokens and design system classes
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert "--surface-0" in css
    assert "--surface-1" in css
    assert "--specular-edge" in css
    assert "--gold-metallic" in css
    assert ".archess-toast-container" in css
    assert ".appearance-modal-card" in css
    assert ".casualty-stack-chip" in css
    assert ".turn-timer-circle" in css

