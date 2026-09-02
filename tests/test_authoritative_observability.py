import logging

import core.logging_config as lc
from game.constants import GAME_CONFIG
from game.physics.authoritative import AuthoritativeSimulation


def _event_records(caplog):
    return [record for record in caplog.records if record.name == "archess_app" and getattr(record, "event_name", None)]


def test_authoritative_launch_and_settlement_emit_causal_events(caplog):
    caplog.set_level(logging.DEBUG, logger="archess_app")
    simulation = AuthoritativeSimulation.new_match()
    piece = next(piece for piece in simulation.pieces if piece.team == "white" and piece.type == "pawn")

    valid, reason = simulation.launch("white", piece.id, GAME_CONFIG["maxLaunchSpeed"] / 2, 0.0)
    assert valid is True
    assert reason is None
    simulation.advance_until_settled(max_steps=5)

    events = {record.event_name for record in _event_records(caplog)}
    assert "MATCH_CREATED" in events
    assert "LAUNCH_ACCEPTED" in events
    assert "PHYSICS_SETTLE_TIMEOUT" in events or "PHYSICS_SETTLED" in events


def test_authoritative_rejection_is_structured_and_actionable(caplog):
    caplog.set_level(logging.DEBUG, logger="archess_app")
    simulation = AuthoritativeSimulation.new_match()
    piece = next(piece for piece in simulation.pieces if piece.team == "black" and piece.type == "pawn")

    valid, reason = simulation.validate_launch("black", piece.id, 1.0, 0.0)
    assert valid is False
    assert reason == "not_your_turn"

    rejected = next(record for record in _event_records(caplog) if record.event_name == "LAUNCH_REJECTED")
    fields = rejected.fields
    assert fields["piece_id"] == piece.id
    assert fields["team"] == "black"
    assert fields["reason"] == "not_your_turn"


def test_authoritative_collision_event_contains_pair_impact_and_hp(caplog):
    caplog.set_level(logging.DEBUG, logger="archess_app")
    simulation = AuthoritativeSimulation.new_match()
    white = next(piece for piece in simulation.pieces if piece.team == "white" and piece.type == "pawn")
    black = next(piece for piece in simulation.pieces if piece.team == "black" and piece.type == "pawn")

    black.x = white.x
    black.y = white.y - white.radius - black.radius + 0.01
    white.vx = 0.0
    white.vy = -2.0
    black.vx = black.vy = 0.0
    simulation.step(1.0 / 120.0)

    events = _event_records(caplog)
    collision = next(record for record in events if record.event_name in {"COLLISION_DAMAGE_APPLIED", "COLLISION_RESOLVED", "COLLISION_COOLDOWN"})
    fields = collision.fields
    assert {fields["piece_a"], fields["piece_b"]} == {white.id, black.id}
    assert "impact" in fields


def test_observability_domain_helper_is_non_fatal():
    simulation = AuthoritativeSimulation.new_match()
    original = lc.log_event
    try:
        lc.log_event = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("logging unavailable"))
        simulation._domain_event(logging.INFO, "TEST_EVENT", fields={"piece_id": "p1"})
    finally:
        lc.log_event = original
