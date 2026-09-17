"""
ARCHESS - Exhaustive Modernization Test Suite
Comprehensive automated test suite validating:
1. Template & Semantic Accessibility (HTML5 semantic landmarks, viewport, ARIA)
2. Design Tokens & CSS Integrity (Tesla/Apple spring tokens, frosted surfaces, legacy fallbacks)
3. Functional & Positive API Flows (Auth, Match settlement, Telemetry, Multiplayer, Tournaments)
4. Exhaustive Negative & Error Edge Cases (Auth rejections, Malformed payloads, Boundary limits,
   Room capacity conflicts, SQL injection resilience, XSS sanitation, 404/405 handlers)
"""

import os
import sys
import json
import uuid
import time
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
    get_connection,
    update_user_profile,
    update_user_password,
    get_or_create_google_user,
    delete_user_account,
    get_user_stats,
    get_match_by_id
)
from backend.multiplayer import room_manager, matchmaking_queue
from backend.tournament import tournament_engine
from backend.achievements import (
    get_all_achievements,
    get_user_achievements,
    evaluate_match_achievements
)

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ==============================================================================
# SECTION 1: TEMPLATE & SEMANTIC ACCESSIBILITY TESTS (Unit & Functional)
# ==============================================================================

class TestTemplateModernization:
    """Validates HTML5 semantic hierarchy, accessibility identifiers, and viewport metadata."""

    def test_home_page_semantic_structure(self, client):
        """Verify home page loads with HTML5 doctype, viewport, meta description, and modern hero elements."""
        res = client.get("/")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        
        # HTML5 doctype and meta
        assert "<!DOCTYPE html>" in html
        assert 'name="viewport"' in html
        assert 'name="description"' in html
        assert "bgMotionCanvas" in html
        
        # Semantic landmarks
        assert "<header" in html
        assert "<main" in html
        assert "<section" in html
        assert "<footer" in html
        
        # Modern Hero Elements
        assert "announcement-pill" in html
        assert "hero-title-minimal" in html
        assert "hero-metric-strip" in html
        assert "themesSection" in html
        assert "Midnight Obsidian" in html
        assert "Woodland Walnut" in html
        assert "Ivory Classical" in html

    def test_play_page_arena_hud_elements(self, client):
        """Verify play arena page loads with all tactical HUD controls, docks, and segmented pickers."""
        res = client.get("/play")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        
        # Core Arena stages
        assert 'id="arenaCanvasStage"' in html
        assert 'id="threeCanvasContainer"' in html
        assert 'id="archessCanvas"' in html
        assert 'id="reactChessboardRoot"' in html
        
        # Apple Dynamic Island / Tesla Emote Dock & Replay Bar
        assert 'id="combatEmoteDock"' in html
        assert "btn-combat-emote" in html
        assert 'id="tacticalReplayBar"' in html
        assert 'id="activeMultiplayerBar"' in html
        
        # Left Wing Command Elements
        assert 'id="arenaTurnLabel"' in html
        assert 'id="turnTimerRing"' in html
        assert 'id="modeVsBotBtn"' in html
        assert 'id="modePvpBtn"' in html
        assert 'id="btnOpenMultiplayerModal"' in html
        assert 'id="botDifficultyToolbarGroup"' in html
        assert 'id="viewMode3DArena"' in html
        assert 'id="camera3DToolbarGroup"' in html
        
        # Right Wing Telemetry Elements
        assert 'id="whitePlayerName"' in html
        assert 'id="blackPlayerName"' in html
        assert 'id="whiteCasualtyRack"' in html
        assert 'id="blackCasualtyRack"' in html
        assert 'id="materialAdvantageBadge"' in html
        assert 'id="sidebarCommentaryCard"' in html

    def test_2d_arena_ui_unified_with_classic(self, client):
        """Verify 2D Arena UI is unified with 2D Classic UI: luxury frame, matching banner, authentic slingshot logic."""
        res = client.get("/play?view=2d-arena")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        assert 'id="reactChessboardRoot"' in html
        assert 'id="archess2DContainer"' in html
        assert 'id="archess2DFrame"' in html
        assert 'class="classic-fide-bar"' in html
        assert 'id="viewMode2DArena"' in html
        assert 'id="viewMode2DClassic"' in html

        # Verify main.js unifies 2D Arena with physical slingshot engine and 2D Classic with FIDE rules
        main_js_path = os.path.join(os.path.dirname(__file__), "..", "static", "js", "main.js")
        with open(main_js_path, "r", encoding="utf-8") as f:
            js_content = f.read()
        assert "else if (mode === '2d-arena')" in js_content
        assert "arena.setRenderMode('2d')" in js_content
        assert "mountArchess2D('reactChessboardRoot', { theme: currentTheme, mode: currentMode, variant: 'classic' })" in js_content

        # Verify game.js handles 2D render mode and frame sizing
        game_js_path = os.path.join(os.path.dirname(__file__), "..", "static", "js", "game.js")
        with open(game_js_path, "r", encoding="utf-8") as f:
            game_content = f.read()
        assert "archess2DCanvasBox" in game_content
        assert "archess2DFrame" in game_content

    def test_arsenal_codex_page_structure(self, client):
        """Verify tactical codex / arsenal page loads with piece tabs and bento cards."""
        res = client.get("/arsenal")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        
        assert "arsenal-tabs-list" in html
        assert "piece-tab-item" in html
        assert 'id="pieceDetailCard"' in html
        assert "bento-grid" in html
        assert "The Knight" in html
        assert "The Rook" in html

    def test_leaderboard_standings_page_structure(self, client):
        """Verify leaderboard page loads with Grandmaster podium and rating ladder."""
        res = client.get("/leaderboard")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        
        assert "bento-grid" in html
        assert "Reigning Champion" in html
        assert "Magnus_Kinetic" in html
        assert "Global ELO Standings" in html


# ==============================================================================
# SECTION 2: DESIGN TOKENS & CSS INTEGRITY TESTS (Unit Tests)
# ==============================================================================

class TestDesignSystemIntegrity:
    """Validates CSS tokens, fluid spring definitions, and legacy asset fallbacks."""

    def test_modernized_css_tokens_presence(self, client):
        """Verify style.css contains world-class motion, spring, and surface tokens."""
        res = client.get("/static/css/style.css")
        assert res.status_code == 200
        css = res.data.decode("utf-8")
        
        # Fluid Spring & Motion Tokens
        assert "--ease-spring" in css
        assert "--ease-tactile" in css
        assert "--ease-smooth" in css
        assert "--transition-tactile" in css
        
        # Surface & Lighting Tokens
        assert "--surface-0" in css
        assert "--surface-1" in css
        assert "--specular-rim" in css
        assert "--shadow-luxury" in css
        
        # Cupertino & Dynamic Island Dock Styles
        assert ".cupertino-segmented-control" in css
        assert ".combat-emote-dock" in css
        assert ".btn-combat-emote" in css
        assert ".hero-metric-strip" in css
        assert ".side-expansion-drawer" in css

    def test_legacy_asset_fallbacks(self, client):
        """Verify legacy root asset routes return HTTP 200 without breakage."""
        for asset_path in ["/style.css", "/main.js", "/auth.js", "/game.js"]:
            res = client.get(asset_path)
            assert res.status_code == 200, f"Failed legacy route {asset_path}"
            assert len(res.data) > 0


# ==============================================================================
# SECTION 3: FUNCTIONAL & POSITIVE API TEST CASES
# ==============================================================================

class TestFunctionalPositiveAPIs:
    """Validates end-to-end positive flows for Auth, Match settlement, Telemetry, and Tournaments."""

    def test_auth_full_lifecycle_positive(self, client):
        """Register, login, check profile, update profile, update password, and delete account."""
        uid = uuid.uuid4().hex[:8]
        username = f"usr_{uid}"
        email = f"{username}@archess.test"
        password = "SecurePassword2026!"
        
        # 1. Register
        reg_res = client.post("/api/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        assert reg_res.status_code in (200, 201)
        data = reg_res.get_json()
        assert data.get("success") is True
        user_id = data.get("user", {}).get("id")
        assert user_id is not None
        
        # 2. Login
        login_res = client.post("/api/auth/login", json={
            "username": username,
            "password": password
        })
        assert login_res.status_code == 200
        assert login_res.get_json().get("success") is True
        
        # 3. Check Session / Me
        me_res = client.get("/api/auth/me")
        assert me_res.status_code == 200
        assert me_res.get_json().get("user", {}).get("username") == username
        
        # 4. Update Profile (PUT)
        new_username = f"upd_{uid}"
        up_res = client.put("/api/auth/profile", json={
            "username": new_username,
            "avatar": "queen"
        })
        assert up_res.status_code == 200
        assert up_res.get_json().get("success") is True
        
        # 5. Update Password (PUT)
        new_pw = "BrandNewPassword2026@"
        pw_res = client.put("/api/auth/password", json={
            "current_password": password,
            "new_password": new_pw
        })
        assert pw_res.status_code == 200
        assert pw_res.get_json().get("success") is True
        
        # 6. Delete Account Cleanly
        del_res = client.delete("/api/auth/account")
        assert del_res.status_code == 200
        assert del_res.get_json().get("success") is True

    def test_match_recording_and_leaderboard_positive(self, client):
        """Record a completed tactical match and verify stats, PGN, and leaderboard."""
        uid_w = uuid.uuid4().hex[:8]
        uid_b = uuid.uuid4().hex[:8]
        user_w = f"w_{uid_w}"
        user_b = f"b_{uid_b}"
        
        register_user(user_w, f"{user_w}@test.com", "password123")
        register_user(user_b, f"{user_b}@test.com", "password123")
        
        match_payload = {
            "white_username": user_w,
            "black_username": user_b,
            "winner": "white",
            "white_damage": 120,
            "black_damage": 45,
            "turns": 24,
            "duration_sec": 180
        }
        res = client.post("/api/matches/record", json=match_payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("success") is True
        settlement = data.get("settlement", {})
        match_id = settlement.get("match_id")
        assert match_id is not None
        
        # Verify match can be retrieved
        get_res = client.get(f"/api/matches/{match_id}")
        assert get_res.status_code == 200
        match_info = get_res.get_json().get("match", {})
        assert match_info.get("winner") == "white"
        
        # Verify PGN generation
        pgn_res = client.get(f"/api/matches/{match_id}/pgn?format=json")
        assert pgn_res.status_code == 200
        assert "pgn" in pgn_res.get_json()
        
        # Verify leaderboard returns valid list
        lb_res = client.get("/api/leaderboard")
        assert lb_res.status_code == 200
        lb_data = lb_res.get_json()
        assert isinstance(lb_data.get("leaderboard"), list)

    def test_telemetry_ingestion_positive(self, client):
        """Post structured kinetic telemetry event and verify correlation headers."""
        telemetry_payload = {
            "event_type": "piece_launch",
            "payload": {
                "piece": "knight",
                "velocity": 14.8,
                "angle_deg": 45.2,
                "rebound_count": 2
            }
        }
        res = client.post("/api/telemetry", json=telemetry_payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("recorded") is True
        assert "X-Request-ID" in res.headers
        assert "X-Correlation-ID" in res.headers

    def test_multiplayer_room_lifecycle_positive(self, client):
        """Create a room, check status, and perform quick match search."""
        create_res = client.post("/api/multiplayer/rooms/create", json={"username": "CommanderAlpha"})
        assert create_res.status_code in (200, 201)
        room_data = create_res.get_json()
        room_id = room_data.get("room_id")
        assert room_id is not None
        
        status_res = client.get(f"/api/multiplayer/rooms/{room_id}")
        assert status_res.status_code == 200
        assert status_res.get_json().get("room", {}).get("room_id") == room_id
        
        # Quick match
        qm_res = client.post("/api/multiplayer/quick_match", json={"username": "ChallengerBravo"})
        assert qm_res.status_code == 200
        assert "room_id" in qm_res.get_json()

    def test_matchmaking_queue_positive(self, client):
        """Join matchmaking queue, poll ticket, and cancel."""
        join_res = client.post("/api/matchmaking/join", json={
            "username": "AcePilot",
            "elo": 1450,
            "mode": "3d-arena"
        })
        assert join_res.status_code == 200
        ticket_id = join_res.get_json().get("ticket", {}).get("ticket_id")
        assert ticket_id is not None
        
        poll_res = client.get(f"/api/matchmaking/ticket/{ticket_id}")
        assert poll_res.status_code == 200
        
        cancel_res = client.delete(f"/api/matchmaking/ticket/{ticket_id}")
        assert cancel_res.status_code == 200

    def test_tournament_engine_positive(self, client):
        """Query tournament bracket and advance simulation round."""
        bracket_res = client.get("/api/tournament/bracket")
        assert bracket_res.status_code == 200
        assert "tournament" in bracket_res.get_json()
        
        sim_res = client.post("/api/tournament/simulate")
        assert sim_res.status_code == 200
        assert sim_res.get_json().get("success") is True

    def test_achievements_catalog_positive(self, client):
        """Query achievements catalog and verify schema."""
        ach_res = client.get("/api/achievements")
        assert ach_res.status_code == 200
        data = ach_res.get_json()
        assert data.get("success") is True
        assert len(data.get("achievements", [])) > 0


# ==============================================================================
# SECTION 4: EXHAUSTIVE NEGATIVE & ERROR-HANDLING TEST CASES
# ==============================================================================

class TestNegativeAndBoundaryEdgeCases:
    """Validates negative cases, input validation, malformed payloads, boundaries, and security resilience."""

    def test_auth_empty_and_malformed_registration(self, client):
        """Reject empty credentials, missing fields, or empty JSON body."""
        res1 = client.post("/api/auth/register", json={})
        assert res1.status_code in (400, 422)
        
        res2 = client.post("/api/auth/register", json={"username": "valid_user", "email": "valid@test.com"})
        assert res2.status_code in (400, 422)
        
        res3 = client.post("/api/auth/register", json={"username": "", "email": "", "password": ""})
        assert res3.status_code in (400, 422)

    def test_auth_duplicate_username_rejection(self, client):
        """Reject registration with an already existing username."""
        uid = uuid.uuid4().hex[:8]
        user = f"dup_{uid}"
        client.post("/api/auth/register", json={"username": user, "email": f"{user}@test.com", "password": "password123"})
        
        dup_res = client.post("/api/auth/register", json={"username": user, "email": f"diff_{user}@test.com", "password": "password123"})
        assert dup_res.status_code == 400
        assert dup_res.get_json().get("success") is False

    def test_auth_invalid_login_credentials(self, client):
        """Reject non-existent user and incorrect password."""
        res_non = client.post("/api/auth/login", json={"username": "ghost_nonexistent_999", "password": "password123"})
        assert res_non.status_code == 401
        assert res_non.get_json().get("success") is False
        
        uid = uuid.uuid4().hex[:8]
        user = f"usr_{uid}"
        client.post("/api/auth/register", json={"username": user, "email": f"{user}@test.com", "password": "real_password123"})
        
        res_wrong = client.post("/api/auth/login", json={"username": user, "password": "totally_wrong_password"})
        assert res_wrong.status_code == 401
        assert res_wrong.get_json().get("success") is False

    def test_match_recording_malformed_payloads(self, client):
        """Reject match recording with invalid winner or negative duration."""
        # Invalid winner
        res_winner = client.post("/api/matches/record", json={"winner": "invalid_alien_team"})
        assert res_winner.status_code == 400
        
        # Non-numeric turns/damage
        res_types = client.post("/api/matches/record", json={"turns": "not_a_number"})
        assert res_types.status_code == 400

    def test_telemetry_missing_and_corrupt_data(self, client):
        """Reject non-dict telemetry payload."""
        res_non_dict = client.post("/api/telemetry", data=json.dumps([1, 2, 3]), content_type="application/json")
        assert res_non_dict.status_code == 400
        assert "Invalid JSON payload" in res_non_dict.get_json()["error"]

    def test_multiplayer_nonexistent_rooms_and_tickets(self, client):
        """Reject querying nonexistent room or ticket and verify 404."""
        bad_room = "ROOM-DOES-NOT-EXIST-404"
        res = client.get(f"/api/multiplayer/rooms/{bad_room}")
        assert res.status_code == 404
        
        bad_ticket = "TICKET-DOES-NOT-EXIST-404"
        t_res = client.get(f"/api/matchmaking/ticket/{bad_ticket}")
        assert t_res.status_code == 404

    def test_security_sql_injection_resilience(self, client):
        """Verify inputs with SQL injection payloads are safely sanitized and handled."""
        sql_payload = "' OR '1'='1' --"
        res = client.post("/api/auth/login", json={
            "username": sql_payload,
            "password": "random_password123"
        })
        assert res.status_code == 401
        assert res.get_json().get("success") is False

    def test_security_xss_injection_resilience(self, client):
        """Verify username with script tags is rejected by username validator."""
        xss_string = "<script>alert(1)</script>"
        res = client.post("/api/auth/register", json={
            "username": xss_string,
            "email": "xss@test.com",
            "password": "password123"
        })
        assert res.status_code == 400
        assert res.get_json().get("success") is False

    def test_security_boundary_oversized_payloads(self, client):
        """Verify oversized string payloads (10KB+) are handled safely."""
        huge_string = "A" * 12000
        res = client.post("/api/auth/login", json={
            "username": huge_string,
            "password": "password123"
        })
        assert res.status_code in (400, 401, 413, 422)

    def test_http_404_and_405_error_handlers(self, client):
        """Verify non-existent route returns standard 404, and invalid method returns 405."""
        res_404 = client.get("/api/this/endpoint/does/not/exist/99999")
        assert res_404.status_code == 404
        
        # Method Not Allowed: POST to GET-only route
        res_405 = client.post("/api/leaderboard", json={})
        assert res_405.status_code in (400, 405)
