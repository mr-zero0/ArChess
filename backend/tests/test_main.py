from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app, room_service

client = TestClient(app)


def test_health_contract() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["service"] == "archess-api"
    assert payload["version"] == app.version
    assert payload["timestamp"]
    assert response.headers["X-Request-ID"]
    assert response.headers["X-Correlation-ID"] == response.headers["X-Request-ID"]


def test_request_context_headers_are_preserved() -> None:
    response = client.get(
        "/api/version",
        headers={"X-Request-ID": "req-test-1", "X-Correlation-ID": "corr-test-1"},
    )
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-test-1"
    assert response.headers["X-Correlation-ID"] == "corr-test-1"


def test_create_room_contract() -> None:
    response = client.post("/api/rooms")
    assert response.status_code == 201
    payload = response.json()
    assert len(payload["room_id"]) == 6
    assert payload["status"] == "waiting"
    assert payload["created_at"]


def test_unknown_room_launch_is_rejected() -> None:
    response = client.post(
        "/api/rooms/NOPE/launch",
        json={"game_id": "game-1", "piece_id": "white-pawn-1", "dx": 1, "dy": 0},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": False, "error": "room_not_found"}


def test_authoritative_launch_updates_server_snapshot() -> None:
    room_response = client.post("/api/rooms")
    room_id = room_response.json()["room_id"]
    room = room_service.get(room_id)
    assert room is not None
    white_piece = next(piece for piece in room.simulation.pieces if piece.team == "white" and piece.type == "pawn")

    response = client.post(
        f"/api/rooms/{room_id}/launch",
        json={"game_id": "game-1", "team": "white", "piece_id": white_piece.id, "dx": 1.0, "dy": 0.0},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["accepted"] is True
    assert payload["room_id"] == room_id
    assert payload["snapshot"]["currentTeam"] == "black"
    assert any(event["type"] == "integrity" for event in payload["events"])


def test_wrong_turn_is_rejected_without_mutating_turn() -> None:
    room_response = client.post("/api/rooms")
    room_id = room_response.json()["room_id"]
    room = room_service.get(room_id)
    assert room is not None
    black_piece = next(piece for piece in room.simulation.pieces if piece.team == "black" and piece.type == "pawn")

    response = client.post(
        f"/api/rooms/{room_id}/launch",
        json={"game_id": "game-2", "team": "black", "piece_id": black_piece.id, "dx": 1.0, "dy": 0.0},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["accepted"] is False
    assert payload["error"] == "not_your_turn"
    assert payload["snapshot"]["currentTeam"] == "white"


def test_room_state_returns_authoritative_snapshot() -> None:
    room_response = client.post("/api/rooms")
    room_id = room_response.json()["room_id"]
    response = client.get(f"/api/rooms/{room_id}/state")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["room_id"] == room_id
    assert payload["status"] == "waiting"
    assert len(payload["snapshot"]["pieces"]) == 32
    assert payload["snapshot"]["currentTeam"] == "white"


def test_room_websocket_contract() -> None:
    with client.websocket_connect("/ws/rooms/TEST01") as websocket:
        connected = websocket.receive_json()
        assert connected["event"] == "connected"
        assert connected["room_id"] == "TEST01"
        assert connected["state"]["currentTeam"] == "white"
        websocket.send_json({"event": "ping"})
        acknowledged = websocket.receive_json()
        assert acknowledged["event"] == "ack"
        assert acknowledged["room_id"] == "TEST01"
        assert acknowledged["received"] == {"event": "ping"}


def test_websocket_snapshot_contract() -> None:
    with client.websocket_connect("/ws/rooms/TEST02") as websocket:
        websocket.receive_json()
        websocket.send_json({"event": "snapshot"})
        state = websocket.receive_json()
        assert state["event"] == "state"
        assert state["snapshot"]["currentTeam"] == "white"
