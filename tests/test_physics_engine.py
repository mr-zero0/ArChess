from game.game_state import GameState
from game.physics.engine import PhysicsEngine


def align_piece_ids(server, client):
    for server_piece, client_piece in zip(server.pieces, client.pieces):
        client_piece.id = server_piece.id


def test_engine_keeps_pieces_inside_radius_aware_board():
    state = GameState.new()
    piece = state.pieces[0]
    piece.x = 0.01
    piece.vx = -10.0

    PhysicsEngine().step(state, 0.02)

    assert piece.x >= piece.radius
    assert piece.vx >= 0


def test_engine_resolves_piece_collision_and_damage():
    state = GameState.new()
    a, b = state.pieces[:2]
    a.x, a.y = 2.0, 2.0
    b.x, b.y = 2.5, 2.0
    a.vx = 10.0

    engine = PhysicsEngine()
    events = engine.step(state, 0.01)

    assert any(event.get("damaged") for event in events)
    assert a.hp < a.max_hp
    assert b.hp < b.max_hp


def test_engine_collision_cooldown_prevents_repeated_damage():
    state = GameState.new()
    a, b = state.pieces[:2]
    a.x, a.y = 2.0, 2.0
    b.x, b.y = 2.5, 2.0
    a.vx = 10.0

    engine = PhysicsEngine()
    engine.step(state, 0.01)
    hp_after_first = (a.hp, b.hp)
    events = engine.step(state, 0.01)

    assert (a.hp, b.hp) == hp_after_first
    assert any(event.get("cooldown") for event in events) or not any(event.get("damaged") for event in events)


def test_reconcile_checks_turn_piece_set_hp_and_velocity():
    server = GameState.new()
    client = GameState.new()
    align_piece_ids(server, client)
    engine = PhysicsEngine()

    assert engine.reconcile(server, client) == (True, None)

    client.current_player = "black"
    assert engine.reconcile(server, client)[0] is False

    client.current_player = server.current_player
    client.pieces[0].hp -= 1
    assert engine.reconcile(server, client)[0] is False


def test_reconcile_detects_velocity_drift():
    server = GameState.new()
    client = GameState.new()
    align_piece_ids(server, client)
    client.pieces[0].vx = 1.0

    assert PhysicsEngine().reconcile(server, client, drift_threshold=0.1)[0] is False
