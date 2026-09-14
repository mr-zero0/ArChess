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
    assert ".soundscape-volume-bar" in css
    assert ".sound-card-item" in css

def test_soundscape_ui_and_audio_elements(client):
    """Verify presence of soundscape controls, profiles, and volume slider in play view."""
    res = client.get("/play")
    assert res.status_code == 200
    html = res.data.decode("utf-8")
    assert 'id="soundMasterVolumeSlider"' in html
    assert 'id="soundProfileGrid"' in html
    assert 'data-sound-profile="marble"' in html
    assert 'data-sound-profile="cyber"' in html
    assert 'data-sound-profile="classic"' in html
    assert 'btn-sound-preview' in html

def test_html_tag_balance():
    """Verify all templates have zero unclosed or mismatched HTML tags."""
    from html.parser import HTMLParser
    import glob

    class TagChecker(HTMLParser):
        def __init__(self):
            super().__init__()
            self.stack = []
            self.errors = []
        def handle_starttag(self, tag, attrs):
            if tag not in ['img', 'input', 'br', 'hr', 'meta', 'link', 'circle', 'path', 'line', 'polygon', 'rect', 'wbr', 'source']:
                attrs_dict = dict(attrs)
                self.stack.append((tag, attrs_dict.get('class', ''), attrs_dict.get('id', '')))
        def handle_endtag(self, tag):
            if tag in ['img', 'input', 'br', 'hr', 'meta', 'link', 'circle', 'path', 'line', 'polygon', 'rect', 'wbr', 'source']:
                return
            if not self.stack:
                self.errors.append(f"Extra end tag: {tag}")
                return
            last, cls, id_ = self.stack.pop()
            if last != tag:
                self.errors.append(f"Mismatched: expected {last} (class={cls}, id={id_}), got {tag}")

    template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'templates')
    for filepath in glob.glob(os.path.join(template_dir, '*.html')):
        checker = TagChecker()
        with open(filepath, 'r', encoding='utf-8') as f:
            checker.feed(f.read())
        assert len(checker.errors) == 0, f"HTML tag errors in {filepath}: {checker.errors}"
        assert len(checker.stack) == 0, f"Unclosed tags in {filepath}: {checker.stack}"

def test_ui_design_systems_and_bento_grid(client):
    """Verify presence of 6 design system tokens in CSS and Bento Grid in templates."""
    # 1. Check style.css for all 6 design system overrides and Bento Grid classes
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    for design in ["glassmorphism", "neobrutalism", "minimal", "ios-native", "material3", "dark-premium"]:
        assert f'data-ui-design="{design}"' in css, f"Missing {design} in CSS"
    assert ".bento-grid" in css
    assert ".bento-card" in css
    assert ".btn-nav-design-toggle" in css
    assert ".design-picker-card" in css

    # 2. Check all views for design switchers and pre-hydration
    for path in ["/", "/play", "/arsenal", "/leaderboard"]:
        res = client.get(path)
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        assert "archess_ui_design" in html, f"Pre-hydration missing in {path}"
        assert 'id="navDesignToggleBtn"' in html, f"Nav design button missing in {path}"
        assert 'class="drawer-design-section"' in html, f"Drawer design section missing in {path}"
        assert 'id="designPickerModal"' in html, f"Design picker modal missing in {path}"

    # 3. Check Bento Grid on Landing, Arsenal, and Leaderboard
    index_html = client.get("/").data.decode("utf-8")
    assert 'id="bentoShowcaseSection"' in index_html
    assert 'class="bento-grid"' in index_html

    arsenal_html = client.get("/arsenal").data.decode("utf-8")
    assert 'class="bento-grid"' in arsenal_html

    lead_html = client.get("/leaderboard").data.decode("utf-8")
    assert 'class="bento-grid"' in lead_html
    assert "Magnus_Kinetic" in lead_html

def test_leaderboard_negative_and_overflow_limit(client):
    """Verify negative, overflow, and non-integer limits are safely clamped."""
    # Negative limit should be clamped to at least 1, not cause LIMIT -1 dump
    res_neg = client.get("/api/leaderboard?limit=-1")
    assert res_neg.status_code == 200
    data_neg = res_neg.get_json()
    assert data_neg["success"] is True
    assert len(data_neg["leaderboard"]) >= 1

    # Overflow limit should clamp to max 100
    res_over = client.get("/api/leaderboard?limit=9999")
    assert res_over.status_code == 200
    data_over = res_over.get_json()
    assert data_over["success"] is True
    assert len(data_over["leaderboard"]) <= 100

    # Non-integer query param should default gracefully
    res_str = client.get("/api/leaderboard?limit=invalid_param")
    assert res_str.status_code == 200
    data_str = res_str.get_json()
    assert data_str["success"] is True
    assert len(data_str["leaderboard"]) > 0

def test_auth_null_and_malformed_inputs(client):
    """Verify register and login reject null or malformed data with HTTP 400 instead of crashing."""
    # Register with null / non-string fields
    res1 = client.post("/api/auth/register", json={"username": None, "email": "test@test.io", "password": "pass"})
    assert res1.status_code == 400
    assert res1.get_json()["success"] is False

    # Register with invalid email
    res2 = client.post("/api/auth/register", json={"username": "ValidUser", "email": "not-an-email", "password": "password123"})
    assert res2.status_code == 400
    assert res2.get_json()["success"] is False

    # Login with non-string credentials
    res3 = client.post("/api/auth/login", json={"username_or_email": 12345, "password": None})
    assert res3.status_code == 400
    assert res3.get_json()["success"] is False

def test_matches_record_invalid_winner_rejected(client):
    """Verify matches record endpoint rejects invalid winner declarations with HTTP 400."""
    res = client.post("/api/matches/record", json={
        "white_username": "Magnus_Kinetic",
        "black_username": "Hikaru_Impulse",
        "winner": "exploiter_injected_winner"
    })
    assert res.status_code == 400
    assert res.get_json()["success"] is False
    assert "Invalid winner value" in res.get_json()["error"]

def test_telemetry_valid_json_persistence(client):
    """Verify telemetry payload is stored as valid JSON and parseable with json.loads."""
    corr_id = f"test-corr-{os.urandom(4).hex()}"
    test_dict = {"event": "vector_strike", "impulse": 34.5, "tags": ["kinetic", "wall_bounce"]}

    res = client.post("/api/telemetry", json={
        "event_type": "KINETIC_TEST",
        "payload": test_dict
    }, headers={"X-Correlation-ID": corr_id})
    assert res.status_code == 200

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT payload FROM telemetry WHERE correlation_id = ?", (corr_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    # Must parse successfully with json.loads (would fail if stored with Python str())
    parsed_payload = json.loads(row["payload"])
    assert parsed_payload["event"] == "vector_strike"
    assert parsed_payload["tags"] == ["kinetic", "wall_bounce"]

def test_same_user_match_settlement():
    """Verify record_match_result cleanly handles self-play without corrupting ELO or throwing."""
    res = record_match_result("Magnus_Kinetic", "Magnus_Kinetic", "white", 100, 100, 10, 60)
    assert res["winner"] == "white"
    assert "white_delta" in res

def test_database_wal_and_indexes():
    """Verify database has WAL mode enabled and indexes created."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode;")
    mode = cursor.fetchone()[0]
    assert mode.lower() == "wal"

    cursor.execute("SELECT name FROM sqlite_master WHERE type = 'index';")
    indexes = [row[0] for row in cursor.fetchall()]
    conn.close()

    assert "idx_users_elo" in indexes
    assert "idx_matches_created" in indexes
    assert "idx_matches_white_user" in indexes
    assert "idx_matches_black_user" in indexes
    assert "idx_telemetry_corr" in indexes

def test_game_js_keyboard_guard_and_scaling():
    """Verify game.js has input field protection and canvas proportional scaling."""
    game_js_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "js", "game.js")
    with open(game_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Guard for input fields
    assert "INPUT" in content and "TEXTAREA" in content
    # Proportional scaling
    assert "scaleRatio" in content
    # Inner bot aim timeout clear
    assert "botAimTimeout" in content

def test_phase2_physics_accumulator_and_frontend_optimizations():
    """Verify Phase 2 fixed-timestep physics accumulator, bg visibility pause, and luxury cursor styles."""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 1. Physics accumulator in game.js
    game_js = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js, "r", encoding="utf-8") as f:
        game_content = f.read()
    assert "physicsAccumulator" in game_content
    assert "fixedDt" in game_content
    assert "updatePhysics(" in game_content

    # 2. Document visibility pause & fine pointer media query in main.js
    main_js = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js, "r", encoding="utf-8") as f:
        main_content = f.read()
    assert "document.hidden" in main_content
    assert "(hover: hover) and (pointer: fine)" in main_content

    # 3. Custom cursor CSS classes in style.css
    style_css = os.path.join(root_dir, "static", "css", "style.css")
    with open(style_css, "r", encoding="utf-8") as f:
        style_content = f.read()
    assert ".custom-cursor-dot" in style_content
    assert ".custom-cursor-ring" in style_content

def test_phase3_template_modularization_and_shockwave_vfx():
    """Verify Jinja2 template modularization, base template inheritance, and kinetic shockwave VFX."""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    templates_dir = os.path.join(root_dir, "templates")
    components_dir = os.path.join(templates_dir, "components")

    # 1. Base template and component existence
    assert os.path.isfile(os.path.join(templates_dir, "base.html"))
    for comp in ["navbar.html", "drawer.html", "design_modal.html", "footer.html"]:
        assert os.path.isfile(os.path.join(components_dir, comp)), f"Missing component: {comp}"

    # 2. Base template includes all key sub-components
    with open(os.path.join(templates_dir, "base.html"), "r", encoding="utf-8") as f:
        base_content = f.read()
    assert 'include "components/drawer.html"' in base_content
    assert 'include "components/navbar.html"' in base_content
    assert 'include "components/design_modal.html"' in base_content

    # 3. All child templates extend base.html
    for page in ["index.html", "play.html", "arsenal.html", "leaderboard.html"]:
        with open(os.path.join(templates_dir, page), "r", encoding="utf-8") as f:
            page_content = f.read()
        assert '{% extends "base.html" %}' in page_content, f"{page} must extend base.html"

    # 4. Kinetic shockwave VFX in game.js
    game_js = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js, "r", encoding="utf-8") as f:
        game_content = f.read()
    assert "this.shockwaves" in game_content
    assert "spawnShockwave(" in game_content

def test_user_stats_api_endpoint(client):
    """Verify /api/users/<username>/stats returns accurate player career metrics and recent matches."""
    # Query seeded Grandmaster Magnus_Kinetic
    res = client.get("/api/users/Magnus_Kinetic/stats")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["user"]["username"] == "Magnus_Kinetic"
    assert "stats" in data
    assert data["stats"]["elo_rating"] >= 2800
    assert data["stats"]["tier"] == "Grandmaster"
    assert "recent_matches" in data
    assert isinstance(data["recent_matches"], list)

    # Query nonexistent player returns 404
    res_404 = client.get("/api/users/nonexistent_phantom_player/stats")
    assert res_404.status_code == 404
    assert res_404.get_json()["success"] is False

def test_leaderboard_tier_filters_and_dossier_modal(client):
    """Verify presence of Division Tier Filter pills, Inspect buttons, and Commander Dossier Modal."""
    res = client.get("/leaderboard")
    assert res.status_code == 200
    html = res.data.decode("utf-8")

    # 1. Division tier filter pills
    assert 'data-tier="all"' in html
    assert 'data-tier="grandmaster"' in html
    assert 'data-tier="master"' in html
    assert 'data-tier="contender"' in html
    assert 'id="tierFilterGroup"' in html

    # 2. Player Dossier modal dialog
    assert 'id="playerDossierModal"' in html
    assert 'id="closeDossierModalBtn"' in html
    assert 'id="dossierLoadingState"' in html
    assert 'id="dossierContentArea"' in html
    assert 'class="dossier-metrics-grid"' in html
    assert 'id="dossierMatchList"' in html

    # 3. CSS classes in style.css
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".tier-filter-pill" in css
    assert ".player-dossier-dialog" in css
    assert ".btn-inspect-dossier" in css
    assert ".outcome-victory" in css
    assert ".dossier-match-item" in css

def test_challenge_opponent_and_view_mode_url_hooks():
    """Verify play route accepts challenged opponent and view mode parameters in main.js and game.js."""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_content = f.read()

    assert "opponentParam" in main_content
    assert "urlViewMode" in main_content
    assert "arena.opponentName" in main_content

    game_js_path = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js_path, "r", encoding="utf-8") as f:
        game_content = f.read()

    assert "this.opponentName" in game_content

def test_match_details_api_and_victory_timeline(client):
    """Verify GET /api/matches/<id> endpoint and Victory Modal Tactical Timeline."""
    # 1. Record a test match to ensure a match exists
    rec_res = client.post("/api/matches/record", json={
        "white_username": "TimelineTester1",
        "black_username": "TimelineTester2",
        "winner": "white",
        "white_damage": 340,
        "black_damage": 120,
        "turns": 14,
        "duration_sec": 95
    })
    assert rec_res.status_code == 200
    rec_data = rec_res.get_json()
    match_id = rec_data.get("settlement", {}).get("match_id")
    assert match_id is not None

    # 2. Query GET /api/matches/<match_id>
    get_res = client.get(f"/api/matches/{match_id}")
    assert get_res.status_code == 200
    match_data = get_res.get_json()
    assert match_data["success"] is True
    assert match_data["match"]["white_username"] == "TimelineTester1"
    assert match_data["match"]["winner"] == "white"
    assert "events" in match_data["match"]

    # 3. Nonexistent match returns 404
    err_res = client.get("/api/matches/99999999")
    assert err_res.status_code == 404
    assert err_res.get_json()["success"] is False

    # 4. Victory Modal Timeline elements in play.html
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="victoryTimelineSection"' in play_html
    assert 'id="toggleTimelineBtn"' in play_html
    assert 'id="timelineEventsList"' in play_html

    # 5. Timeline CSS in style.css
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".victory-timeline-section" in css
    assert ".timeline-event-item" in css
    assert ".timeline-event-badge" in css

def test_pwa_manifest_and_service_worker(client):
    """Verify PWA manifest route, service worker caching, and HTML meta integration."""
    # 1. Manifest endpoint
    manifest_res = client.get("/manifest.json")
    assert manifest_res.status_code == 200
    manifest = manifest_res.get_json()
    assert manifest is not None
    assert manifest["name"] == "ArChess — Kinetic Physical Chess"
    assert manifest["short_name"] == "ArChess"
    assert manifest["start_url"] == "/play"
    assert manifest["display"] == "standalone"
    assert len(manifest["icons"]) >= 2

    # 2. Service Worker endpoint and root-scope header
    sw_res = client.get("/sw.js")
    assert sw_res.status_code == 200
    assert "javascript" in sw_res.content_type
    assert sw_res.headers.get("Service-Worker-Allowed") == "/"
    sw_code = sw_res.data.decode("utf-8")
    assert "archess-cache" in sw_code
    assert "addEventListener('install'" in sw_code
    assert "addEventListener('fetch'" in sw_code

    # 3. Base HTML integration
    index_res = client.get("/")
    assert index_res.status_code == 200
    html = index_res.data.decode("utf-8")
    assert '<link rel="manifest" href="/manifest.json">' in html
    assert 'apple-mobile-web-app-capable' in html
    assert 'apple-touch-icon' in html

    # 4. Main.js service worker registration
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_code = f.read()
    assert "serviceWorker.register('/sw.js'" in main_code
    assert "window.addEventListener('offline'" in main_code
    assert "window.addEventListener('online'" in main_code

def test_tactical_replay_system(client):
    """Verify presence and wiring of Tactical Combat Replay HUD, scrubber, and dossier link."""
    # 1. Play Arena Replay HUD elements
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="tacticalReplayBar"' in play_html
    assert 'id="replayMatchTitle"' in play_html
    assert 'id="replayEventTicker"' in play_html
    assert 'id="replayTurnScrubber"' in play_html
    assert 'id="btnReplayPlayPause"' in play_html
    assert 'id="btnExitReplay"' in play_html
    assert 'id="btnLaunchReplay"' in play_html

    # 2. Leaderboard Dossier Replay Link
    lead_res = client.get("/leaderboard")
    assert lead_res.status_code == 200
    lead_html = lead_res.data.decode("utf-8")
    assert 'btn-dossier-replay' in lead_html
    assert 'play?replay=' in lead_html

    # 3. CSS Replay Elements
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".tactical-replay-bar" in css
    assert ".replay-ctrl-btn" in css
    assert ".replay-scrubber-slider" in css
    assert ".btn-dossier-replay" in css

    # 4. Main.js Replay Controller Logic
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_code = f.read()
    assert "loadTacticalReplay" in main_code
    assert "playUrlParamsReplay.get('replay')" in main_code
    assert "lastSettledMatchId" in main_code


def test_bot_difficulty_profiles_and_sudden_death_audio(client):
    """Phase 9 validation: Bot AI difficulty profiles (Cadet/Commander/Grandmaster) and Sudden Death tension drone audio."""
    # 1. Play arena template contains bot difficulty controls
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="botDifficultyToolbarGroup"' in play_html
    assert 'data-bot-diff="cadet"' in play_html
    assert 'data-bot-diff="commander"' in play_html
    assert 'data-bot-diff="grandmaster"' in play_html

    # 2. CSS styles for bot difficulty pills
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".bot-difficulty-pill-group" in css
    assert ".bot-difficulty-btn" in css

    # 3. Game.js contains multi-tier AI and audio drone implementation
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    game_js_path = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js_path, "r", encoding="utf-8") as f:
        game_code = f.read()

    assert "startSuddenDeathDrone" in game_code
    assert "stopSuddenDeathDrone" in game_code
    assert "suddenDeathDrone" in game_code
    assert "setBotDifficulty" in game_code
    assert "botDifficulty" in game_code
    assert "grandmaster" in game_code
    assert "rebound" in game_code.lower()

    # 4. Main.js contains bot difficulty handler
    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_code = f.read()

    assert "applyBotDifficulty" in main_code
    assert "archess_bot_difficulty" in main_code


def test_real_time_multiplayer_engine(client):
    """Phase 11 validation: Real-time multiplayer room creation, matchmaking, and WebSocket state integration."""
    # 1. Multiplayer REST Endpoints
    # Create Room
    create_res = client.post("/api/multiplayer/rooms/create", json={"username": "Kasparov_Kinetic"})
    assert create_res.status_code == 201
    create_data = create_res.get_json()
    assert create_data["success"] is True
    room_id = create_data["room_id"]
    assert room_id.startswith("ARC-")

    # Get Room Info
    room_res = client.get(f"/api/multiplayer/rooms/{room_id}")
    assert room_res.status_code == 200
    room_data = room_res.get_json()
    assert room_data["success"] is True
    assert room_data["room"]["room_id"] == room_id
    assert room_data["room"]["status"] == "waiting"

    # Nonexistent Room 404
    bad_res = client.get("/api/multiplayer/rooms/ARC-999999")
    assert bad_res.status_code == 404
    assert bad_res.get_json()["success"] is False

    # Quick Match Auto-Pairing
    qm_res = client.post("/api/multiplayer/quick_match", json={"username": "Deep_Blue_Vanguard"})
    assert qm_res.status_code == 200
    qm_data = qm_res.get_json()
    assert qm_data["success"] is True
    assert "room_id" in qm_data
    assert qm_data["role"] in ("white", "black")

    # 2. In-Memory Room Logic & Message Relay Validation
    from backend.multiplayer import RoomManager, CombatRoom
    rm = RoomManager()
    room = rm.create_room("TestHost")
    assert room.room_id.startswith("ARC-")

    class MockSocket:
        def __init__(self):
            self.sent = []
        def send(self, data):
            self.sent.append(data)

    ws_white = MockSocket()
    ws_black = MockSocket()
    ws_spec = MockSocket()

    role1 = room.add_connection(ws_white, "HostPlayer")
    assert role1 == "white"
    assert room.status == "waiting"

    role2 = room.add_connection(ws_black, "GuestPlayer")
    assert role2 == "black"
    assert room.status == "in_combat"

    role3 = room.add_connection(ws_spec, "SpectatorUser")
    assert role3 == "spectator"

    # Test Aim message relay (white aiming on white turn sends to opponent)
    room.handle_message(ws_white, "white", json.dumps({
        "type": "aim",
        "pieceId": "white_pawn_3",
        "pullScreenX": 45,
        "pullScreenY": -30,
        "powerRatio": 0.65
    }))
    assert any("opponent_aim" in m for m in ws_black.sent)

    # Test Launch message relay
    room.handle_message(ws_white, "white", json.dumps({
        "type": "launch",
        "pieceId": "white_pawn_3",
        "vx": 12.5,
        "vy": -8.4,
        "powerRatio": 0.65
    }))
    assert any("opponent_launch" in m for m in ws_black.sent)
    assert room.turns_elapsed == 1

    # Test Ping / Pong
    room.handle_message(ws_black, "black", json.dumps({
        "type": "ping",
        "client_ts": 123456789
    }))
    assert any("pong" in m for m in ws_black.sent)

    # Disconnect handling
    departed = room.remove_connection(ws_black)
    assert departed == "black"
    assert room.black_player["ws"] is None

    # 3. HTML Play Arena UI Components
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="btnOpenMultiplayerModal"' in play_html
    assert 'id="multiplayerModalBackdrop"' in play_html
    assert 'id="activeMultiplayerBar"' in play_html
    assert 'id="btnQuickMatch"' in play_html
    assert 'id="btnCreateRoom"' in play_html
    assert 'id="btnJoinRoomByCode"' in play_html

    # 4. CSS Multiplayer Styles
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".btn-multiplayer-trigger" in css
    assert ".active-multiplayer-bar" in css
    assert ".multiplayer-modal-dialog" in css
    assert ".room-code-display" in css

    # 5. Client JS Integration
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    game_js_path = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js_path, "r", encoding="utf-8") as f:
        game_code = f.read()
    assert "setMultiplayerState" in game_code
    assert "executeRemoteLaunch" in game_code
    assert "setOpponentAim" in game_code
    assert "multiplayerMode" in game_code

    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_code = f.read()
    assert "connectToCombatRoom" in main_code
    assert "ws/combat" in main_code


def test_tournament_bracket_and_environmental_acoustics(client):
    """Phase 12 validation: 8-commander knockout tournament bracket engine and environmental convolver acoustics."""
    # 1. Reset tournament to fresh state
    reset_res = client.post("/api/tournament/reset", json={"season": 1})
    assert reset_res.status_code == 200
    reset_data = reset_res.get_json()
    assert reset_data["success"] is True
    t = reset_data["tournament"]
    assert t["season"] == 1
    assert t["status"] == "quarterfinals"
    assert t["winner"] is None
    assert len(t["bracket"]["quarterfinals"]) == 4
    assert len(t["bracket"]["semifinals"]) == 2
    assert len(t["bracket"]["finals"]) == 1
    assert t["bracket"]["quarterfinals"][0]["match_id"] == "QF-1"

    # 2. Query Bracket Info
    bracket_res = client.get("/api/tournament/bracket")
    assert bracket_res.status_code == 200
    b_data = bracket_res.get_json()
    assert b_data["success"] is True
    assert b_data["tournament"]["status"] == "quarterfinals"

    # 3. Simulate Quarterfinals -> Semifinals
    sim1_res = client.post("/api/tournament/simulate")
    assert sim1_res.status_code == 200
    sim1_data = sim1_res.get_json()
    assert sim1_data["tournament"]["status"] == "semifinals"
    # All QF matches completed
    for qfm in sim1_data["tournament"]["bracket"]["quarterfinals"]:
        assert qfm["status"] == "completed"
        assert qfm["winner"] is not None
        assert qfm["score1"] + qfm["score2"] >= 2
    # Semifinals seeded
    sf1 = sim1_data["tournament"]["bracket"]["semifinals"][0]
    assert sf1["player1"] is not None
    assert sf1["player2"] is not None
    assert sf1["status"] == "pending"

    # 4. Simulate Semifinals -> Finals
    sim2_res = client.post("/api/tournament/simulate")
    assert sim2_res.status_code == 200
    sim2_data = sim2_res.get_json()
    assert sim2_data["tournament"]["status"] == "finals"
    # Grand Finals seeded
    final_match = sim2_data["tournament"]["bracket"]["finals"][0]
    assert final_match["player1"] is not None
    assert final_match["player2"] is not None
    assert final_match["status"] == "pending"

    # 5. Simulate Finals -> Completed (Champion Crowned)
    sim3_res = client.post("/api/tournament/simulate")
    assert sim3_res.status_code == 200
    sim3_data = sim3_res.get_json()
    assert sim3_data["tournament"]["status"] == "completed"
    assert sim3_data["tournament"]["winner"] is not None
    champ = sim3_data["tournament"]["winner"]
    assert "username" in champ
    assert "elo" in champ

    # 6. Leaderboard UI Template Elements
    lead_res = client.get("/leaderboard")
    assert lead_res.status_code == 200
    lead_html = lead_res.data.decode("utf-8")
    assert 'id="tournamentBracketSection"' in lead_html
    assert 'id="bracketSeasonBadge"' in lead_html
    assert 'id="bracketStatusTag"' in lead_html
    assert 'id="btnSimulateRound"' in lead_html
    assert 'id="btnResetTournament"' in lead_html
    assert 'id="tournamentChampionBanner"' in lead_html
    assert 'id="bracketStagesGrid"' in lead_html
    assert 'id="matchesQuarterfinals"' in lead_html
    assert 'id="matchesSemifinals"' in lead_html
    assert 'id="matchesFinals"' in lead_html

    # 7. CSS Tournament Styles
    css_res = client.get("/static/css/style.css")
    assert css_res.status_code == 200
    css = css_res.data.decode("utf-8")
    assert ".tournament-bracket-card" in css
    assert ".bracket-stages-grid" in css
    assert ".bracket-match-card" in css
    assert ".tournament-champion-banner" in css
    assert ".bracket-player-row.is-winner" in css

    # 8. Environmental Convolver Acoustics
    play_res = client.get("/play")
    assert play_res.status_code == 200
    play_html = play_res.data.decode("utf-8")
    assert 'id="acousticEnvironmentSection"' in play_html
    assert 'id="acousticEnvGrid"' in play_html
    assert 'data-acoustic-env="citadel"' in play_html
    assert 'data-acoustic-env="wood"' in play_html
    assert 'data-acoustic-env="void"' in play_html
    assert 'data-acoustic-env="cathedral"' in play_html

    # Game.js & Main.js JS Integration
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    game_js_path = os.path.join(root_dir, "static", "js", "game.js")
    with open(game_js_path, "r", encoding="utf-8") as f:
        game_code = f.read()
    assert "convolver" in game_code
    assert "audioBus" in game_code
    assert "updateImpulseResponse" in game_code
    assert "updateEnvironmentGains" in game_code
    assert "setEnvironment" in game_code
    assert "getEnvironment" in game_code

    main_js_path = os.path.join(root_dir, "static", "js", "main.js")
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_code = f.read()
    assert "applyAcousticEnvironment" in main_code
    assert "archess_acoustic_environment" in main_code
    assert "data-acoustic-env" in main_code

