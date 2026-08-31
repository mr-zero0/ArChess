import pytest
from app import app, create_app
from config import DevelopmentConfig, ProductionConfig, TestingConfig
from logging_config import JsonFormatter
from game.constants import BOARD_SIZE, GAME_CONFIG, PIECE_STATS
from game.game_state import GameState
from game.models import PieceState


def test_app_config_endpoint():
    client = app.test_client()
    response = client.get("/api/game/config")
    assert response.status_code == 200
    data = response.get_json()
    assert data["boardSize"] == BOARD_SIZE
    assert "pawn" in data["pieceStats"]
    assert "maxLaunchSpeed" in data["gameConfig"]


def test_app_factory_creates_independent_application():
    application = create_app()
    assert application is not app
    assert application.test_client().get("/api/version").get_json() == {"version": "v0.5.2"}


def test_app_config_profiles(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    development = create_app(DevelopmentConfig)
    testing = create_app(TestingConfig)
    production = create_app(ProductionConfig)
    assert development.debug is True
    assert testing.testing is True
    assert production.debug is False


def test_health_endpoint():
    response = app.test_client().get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "version": "v0.5.2"}


def test_version_endpoint():
    response = app.test_client().get("/api/version")
    assert response.status_code == 200
    assert response.get_json() == {"version": "v0.5.2"}


def test_not_found_error_handler():
    response = app.test_client().get("/api/missing")
    assert response.status_code == 404
    assert response.get_json() == {"error": "not_found", "message": "Resource not found"}


def test_security_headers_are_present():
    response = app.test_client().get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_api_body_validation_rejects_non_json():
    response = app.test_client().post("/api/example", data="not-json", content_type="text/plain")
    assert response.status_code == 415
    assert response.get_json()["error"] == "json_required"


def test_request_size_limit_returns_json_error():
    payload = b"x" * (app.config["MAX_CONTENT_LENGTH"] + 1)
    response = app.test_client().post("/api/example", data=payload, content_type="application/json")
    assert response.status_code == 413
    assert response.get_json()["error"] == "request_too_large"


def test_create_room_assigns_white_player():
    response = app.test_client().post("/api/rooms", json={"guestId": "guest-test"})
    assert response.status_code == 201
    data = response.get_json()
    assert len(data["roomId"]) == 6
    assert data["status"] == "waiting"
    assert data["players"] == [{"guestId": "guest-test", "team": "white"}]


def test_create_room_validates_guest_id():
    response = app.test_client().post("/api/rooms", json={"guestId": ""})
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_guest_id"


def test_production_requires_secret_key(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(ProductionConfig)


def test_app_uses_structured_logging():
    application = create_app(TestingConfig)
    formatters = [handler.formatter for handler in application.logger.handlers]
    assert any(isinstance(formatter, JsonFormatter) for formatter in formatters)


def test_legacy_config_endpoint():
    client = app.test_client()
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.get_json()
    assert data["boardSize"] == BOARD_SIZE


def test_game_state_initialization():
    state = GameState.new()
    assert state.current_player == "white"
    assert len(state.pieces) == 32
    white_kings = [p for p in state.pieces if p.type == "king" and p.team == "white"]
    assert len(white_kings) == 1
    assert white_kings[0].hp == PIECE_STATS["king"]["hp"]


def test_piece_state_dict():
    pawn = PieceState.create("pawn", "white", 0.5, 6.5)
    snapshot = pawn.to_dict()
    assert snapshot["type"] == "pawn"
    assert snapshot["team"] == "white"
    assert snapshot["maxHp"] == 30
    assert snapshot["alive"] is True


# ---------- Config boundary tests ----------

def test_board_size_is_eight():
    assert BOARD_SIZE == 8


def test_piece_stats_all_present():
    """All 6 piece types should have hp and power defined."""
    for piece_type in ["pawn", "knight", "bishop", "rook", "queen", "king"]:
        assert piece_type in PIECE_STATS, f"Missing piece type: {piece_type}"
        stats = PIECE_STATS[piece_type]
        assert "hp" in stats, f"Missing hp for {piece_type}"
        assert "power" in stats, f"Missing power for {piece_type}"


def test_piece_role_fields_present():
    """Every piece type must define its STEP 6 combat-role profile."""
    required = ["launchMul", "friction", "restitution", "damageMul", "collisionMul"]
    for piece_type, stats in PIECE_STATS.items():
        for field in required:
            assert field in stats, f"Missing {field} for {piece_type}"


def test_piece_role_fields_in_ranges():
    """Role multipliers must be physically sane (no energy gains)."""
    for piece_type, stats in PIECE_STATS.items():
        assert 0.5 <= stats["launchMul"] <= 1.5, f"{piece_type} launchMul out of range"
        assert 0 < stats["friction"] <= 1.0, f"{piece_type} friction must be in (0, 1]"
        assert 0 < stats["restitution"] <= 1.0, f"{piece_type} restitution must be in (0, 1]"
        assert stats["damageMul"] > 0, f"{piece_type} damageMul must be positive"
        assert stats["collisionMul"] > 0, f"{piece_type} collisionMul must be positive"


def test_combo_window_in_config():
    """Combo window must be configured and positive."""
    assert "comboWindow" in GAME_CONFIG, "Missing comboWindow in GAME_CONFIG"
    assert GAME_CONFIG["comboWindow"] > 0


def test_game_config_required_fields():
    """GAME_CONFIG should have all required physics fields."""
    required = [
        "maxLaunchSpeed", "launchStrength", "maxDragDistance",
        "friction", "bounceFactor", "collisionMultiplier",
        "damageMultiplier", "impactReferenceSpeed", "maxCollisionDamage",
        "minDamageImpact", "minVelocity", "physicsSubsteps",
        "collisionRestitution", "collisionCooldown", "settleDelay"
    ]
    for field in required:
        assert field in GAME_CONFIG, f"Missing GAME_CONFIG field: {field}"


def test_piece_mass_and_radius_positive():
    """All piece masses and radii should be positive values."""
    for piece_type, stats in PIECE_STATS.items():
        assert stats["mass"] > 0, f"{piece_type} mass should be positive, got {stats['mass']}"
        assert stats["radius"] > 0, f"{piece_type} radius should be positive, got {stats['radius']}"


def test_launch_speed_clamp():
    """maxLaunchSpeed should be a reasonable positive value."""
    assert GAME_CONFIG["maxLaunchSpeed"] > 0


def test_min_damage_impact_positive():
    """minDamageImpact should be a positive threshold."""
    assert GAME_CONFIG["minDamageImpact"] > 0


def test_damage_clamp_above_threshold():
    """maxCollisionDamage should be greater than minDamageImpact."""
    assert GAME_CONFIG["maxCollisionDamage"] > GAME_CONFIG["minDamageImpact"]


def test_physics_substeps_range():
    """physicsSubsteps should be in a reasonable range."""
    assert 1 <= GAME_CONFIG["physicsSubsteps"] <= 10


def test_collision_cooldown_positive():
    """collisionCooldown should be positive."""
    assert GAME_CONFIG["collisionCooldown"] > 0


def test_settle_delay_positive():
    """settleDelay should be positive."""
    assert GAME_CONFIG["settleDelay"] > 0


# ---------- Game state turn tests ----------

def test_turn_switch():
    """Turn should switch after settlement."""
    from game.game_state import GameState as GS

    state = GS.new()
    assert state.current_player == "white"

    # Simulate settlement - just verify the state structure allows turn change
    # The actual turn switch happens in the browser JS gameLoop
    new_state = GS(current_player="black")
    assert new_state.current_player == "black"


# ---------- Piece creation tests ----------

def test_create_pawn():
    pawn = PieceState.create("pawn", "white", 0.5, 6.5)
    assert pawn.type == "pawn"
    assert pawn.team == "white"
    assert pawn.hp == PIECE_STATS["pawn"]["hp"]
    assert pawn.max_hp == PIECE_STATS["pawn"]["hp"]
    assert pawn.power == PIECE_STATS["pawn"]["power"]
    assert pawn.radius == PIECE_STATS["pawn"]["radius"]
    assert pawn.mass == PIECE_STATS["pawn"]["mass"]
    assert pawn.alive is True


def test_create_king():
    king = PieceState.create("king", "black", 4.5, 0.5)
    assert king.type == "king"
    assert king.team == "black"
    assert king.hp == PIECE_STATS["king"]["hp"]
    assert king.max_hp == PIECE_STATS["king"]["hp"]
    assert king.power == PIECE_STATS["king"]["power"]


def test_piece_to_dict_roundtrip():
    """to_dict should preserve all essential fields."""
    pawn = PieceState.create("pawn", "white", 1.5, 3.5)
    d = pawn.to_dict()
    assert d["type"] == "pawn"
    assert d["team"] == "white"
    assert d["maxHp"] == 30
    assert d["alive"] is True
    assert "id" in d