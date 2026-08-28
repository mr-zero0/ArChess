import logging

from game.game_state import GameState
from game.models import PieceState
from game.observability_events import game_event


def test_new_emits_creation_event_with_meaningful_counts(monkeypatch):
    events = []
    monkeypatch.setattr("game.game_state.game_event", lambda *args, **kwargs: events.append((args, kwargs)))

    state = GameState.new()

    assert state.current_player == "white"
    assert len(state.pieces) == 32
    assert events
    event, kwargs = events[-1]
    assert event == "GAME_STATE_CREATED"
    assert kwargs["fields"]["current_player"] == "white"
    assert kwargs["fields"]["piece_count"] == 32
    assert kwargs["fields"]["white_piece_count"] == 16
    assert kwargs["fields"]["black_piece_count"] == 16


def test_snapshot_emits_state_summary_without_changing_payload(monkeypatch):
    events = []
    monkeypatch.setattr("game.game_state.game_event", lambda *args, **kwargs: events.append((args, kwargs)))
    state = GameState.new()

    events.clear()
    snapshot = state.snapshot()

    assert snapshot["currentPlayer"] == "white"
    assert len(snapshot["pieces"]) == 32
    event, kwargs = events[-1]
    assert event == "GAME_STATE_SNAPSHOT"
    assert kwargs["fields"]["current_player"] == "white"
    assert kwargs["fields"]["piece_count"] == 32


def test_snapshot_counts_alive_pieces(monkeypatch):
    events = []
    monkeypatch.setattr("game.game_state.game_event", lambda *args, **kwargs: events.append((args, kwargs)))
    state = GameState.new()
    state.pieces[0].alive = False

    state.snapshot()

    event, kwargs = events[-1]
    assert event == "GAME_STATE_SNAPSHOT"
    assert kwargs["fields"]["alive_piece_count"] == 31


def test_event_helper_accepts_explicit_error_level(monkeypatch):
    captured = []
    monkeypatch.setattr("game.observability_events.log_event", lambda *args, **kwargs: captured.append((args, kwargs)))

    game_event("GAME_STATE_ERROR", level=logging.ERROR, fields={"reason": "test"})

    assert captured
    args, kwargs = captured[-1]
    assert args[1] == logging.ERROR
    assert args[2] == "GAME_STATE_ERROR"
    assert kwargs["fields"] == {"reason": "test"}
