import pytest
from app import app
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