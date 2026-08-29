from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from backend.main import app

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
    response = client.get("/api/version", headers={"X-Request-ID": "req-test-1", "X-Correlation-ID": "corr-test-1"})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-test-1"
    assert response.headers["X-Correlation-ID"] == "corr-test-1"


def test_create_room_and_state_contract() -> None:
    response = client.post("/api/rooms")
    assert response.status_code == 201
    payload = response.json()
    assert len(payload["room_id"]) == 6
    assert payload["status"] == "active"

    state = client.get(f"/api/rooms/{payload['room_id']}/state")
    assert state.status_code == 200
    snapshot = state.json()["snapshot"]
    assert snapshot["currentTeam"] == "white"
    assert len(snapshot["pieces"]) == 32


def test_unknown_room_launch_is_rejected() -> None:
    response = client.post("/api/rooms/NOPE/launch", json={"game_id": "game-1", "team": "white", "piece_id": "white-pawn-1", "dx": 1, "dy": 0})
    assert response.status_code == 200
    assert response.json() == {"ok": False, "accepted": False, "error": "room_not_found"}


def test_room_websocket_sends_authoritative_initial_snapshot() -> None:
    room = client.post("/api/rooms").json()["room_id"]
    with client.websocket_connect(f"/ws/rooms/{room}") as websocket:
        state = websocket.receive_json()
        assert state["event"] == "state"
        assert state["room_id"] == room
        assert state["snapshot"]["currentTeam"] == "white"
        assert len(state["snapshot"]["pieces"]) == 32


def test_missing_room_websocket_is_rejected() -> None:
    try:
        with client.websocket_connect("/ws/ROOMNO"):
            raise AssertionError("missing room websocket unexpectedly connected")
    except WebSocketDisconnect as error:
        assert error.code == 1008


def test_authoritative_launch_broadcasts_settled_snapshot() -> None:
    room = client.post("/api/rooms").json()["room_id"]
    initial = client.get(f"/api/rooms/{room}/state").json()["snapshot"]
    piece = next(item for item in initial["pieces"] if item["team"] == "white" and item["type"] == "pawn")

    with client.websocket_connect(f"/ws/rooms/{room}") as websocket:
        websocket.receive_json()
        response = client.post(f"/api/rooms/{room}/launch", json={"game_id": "browser-game-1", "team": "white", "piece_id": piece["id"], "dx": 0.5, "dy": -0.5})
        assert response.status_code == 200
        payload = response.json()
        assert payload["ok"] is True
        assert payload["accepted"] is True
        assert payload["snapshot"]["currentTeam"] == "black"
        assert isinstance(payload["events"], list)

        broadcast = websocket.receive_json()
        assert broadcast["event"] == "state"
        assert broadcast["snapshot"] == payload["snapshot"]

    persisted = client.get(f"/api/rooms/{room}/state").json()
    assert persisted["snapshot"] == payload["snapshot"]
    assert persisted["game_id"] == "browser-game-1"


def test_wrong_turn_does_not_mutate_authoritative_state() -> None:
    room = client.post("/api/rooms").json()["room_id"]
    snapshot = client.get(f"/api/rooms/{room}/state").json()["snapshot"]
    white_piece = next(item for item in snapshot["pieces"] if item["team"] == "white")
    response = client.post(f"/api/rooms/{room}/launch", json={"game_id": "game-2", "team": "black", "piece_id": white_piece["id"], "dx": 1.0, "dy": 0.0})
    assert response.status_code == 200
    assert response.json()["accepted"] is False
    assert response.json()["error"] == "not_your_turn"
    assert client.get(f"/api/rooms/{room}/state").json()["snapshot"] == snapshot


def test_game_mismatch_is_rejected() -> None:
    room = client.post("/api/rooms").json()["room_id"]
    snapshot = client.get(f"/api/rooms/{room}/state").json()["snapshot"]
    piece = next(item for item in snapshot["pieces"] if item["team"] == "white")
    first = client.post(f"/api/rooms/{room}/launch", json={"game_id": "game-a", "team": "white", "piece_id": piece["id"], "dx": 0.2, "dy": 0.2})
    assert first.status_code == 200 and first.json()["accepted"] is True
    next_snapshot = first.json()["snapshot"]
    black_piece = next(item for item in next_snapshot["pieces"] if item["team"] == "black")
    mismatch = client.post(f"/api/rooms/{room}/launch", json={"game_id": "game-b", "team": "black", "piece_id": black_piece["id"], "dx": -0.2, "dy": 0.2})
    assert mismatch.status_code == 200
    assert mismatch.json()["accepted"] is False
    assert mismatch.json()["error"] == "game_mismatch"
    assert mismatch.json()["snapshot"] == next_snapshot


def test_zero_drag_is_rejected_without_state_change() -> None:
    room = client.post("/api/rooms").json()["room_id"]
    snapshot = client.get(f"/api/rooms/{room}/state").json()["snapshot"]
    piece = next(item for item in snapshot["pieces"] if item["team"] == "white")
    response = client.post(f"/api/rooms/{room}/launch", json={"game_id": "game-invalid", "team": "white", "piece_id": piece["id"], "dx": 0.0, "dy": 0.0})
    assert response.status_code == 200
    assert response.json()["accepted"] is False
    assert response.json()["error"] == "zero_drag"
    assert client.get(f"/api/rooms/{room}/state").json()["snapshot"] == snapshot
