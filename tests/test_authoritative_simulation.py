import math

from game.constants import BOARD_SIZE, PIECE_STATS
from game.physics.authoritative import AuthoritativeSimulation, ServerPiece


def make_piece(piece_id, piece_type, team, x, y):
    return ServerPiece(piece_id, piece_type, team, x, y)


def test_launch_rejects_opponent_piece_and_out_of_turn():
    sim = AuthoritativeSimulation([make_piece("w1", "rook", "white", 2, 2)])
    assert sim.validate_launch("black", "w1", 1, 0) == (False, "not_your_turn")
    assert sim.validate_launch("white", "missing", 1, 0) == (False, "piece_not_found")
    assert sim.validate_launch("white", "w1", 99, 0) == (False, "speed_exceeded")


def test_three_piece_impact_resolves_without_invalid_state():
    pieces = [
        make_piece("a", "rook", "white", 2.0, 4.0),
        make_piece("b", "pawn", "black", 2.5, 4.0),
        make_piece("c", "pawn", "white", 3.0, 4.0),
    ]
    pieces[0].vx = 10.0
    pieces[2].vx = -10.0
    sim = AuthoritativeSimulation(pieces)
    events = sim.step(0.01)
    damaged = [event for event in events if event.get("damaged")]

    assert events
    assert damaged
    assert pieces[1].hp < PIECE_STATS["pawn"]["hp"]
    for piece in pieces:
        assert piece.radius <= piece.x <= BOARD_SIZE - piece.radius
        assert piece.radius <= piece.y <= BOARD_SIZE - piece.radius
        assert math.isfinite(piece.x)
        assert math.isfinite(piece.y)
        assert math.isfinite(piece.vx)
        assert math.isfinite(piece.vy)


def test_collision_cooldown_prevents_stationary_hp_drain():
    pieces = [
        make_piece("a", "rook", "white", 2.0, 2.0),
        make_piece("b", "pawn", "black", 2.5, 2.0),
    ]
    pieces[0].vx = 10.0
    sim = AuthoritativeSimulation(pieces)
    first = sim.step(0.01)
    hp_after_first = (pieces[0].hp, pieces[1].hp)
    second = sim.step(0.01)
    assert any(event.get("damaged") for event in first)
    assert (pieces[0].hp, pieces[1].hp) == hp_after_first or all(not event.get("damaged") for event in second)


def test_king_destruction_sets_game_over():
    attacker = make_piece("q", "queen", "white", 2.0, 2.0)
    king = make_piece("k", "king", "black", 2.55, 2.0)
    king.hp = 1
    attacker.vx = 10.0
    sim = AuthoritativeSimulation([attacker, king])
    sim.step(0.01)
    assert sim.game_over is True
    assert king.alive is False


def test_legacy_vector_launch_remains_server_validated():
    piece = make_piece("w1", "rook", "white", 2, 2)
    sim = AuthoritativeSimulation([piece])
    assert sim.launch("white", "w1", 3.0, 0.0) == (True, None)
    assert piece.vx == 3.0
    assert sim.current_team == "black"
