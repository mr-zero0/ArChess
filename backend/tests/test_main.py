from fastapi.testclient import TestClient

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


def test_room_websocket_contract() -> None:
    with client.websocket_connect("/ws/rooms/TEST01") as websocket:
        connected = websocket.receive_json()
        assert connected["event"] == "connected"
        assert connected["room_id"] == "TEST01"
        websocket.send_json({"event": "ping"})
        acknowledged = websocket.receive_json()
        assert acknowledged["event"] == "ack"
        assert acknowledged["room_id"] == "TEST01"
        assert acknowledged["received"] == {"event": "ping"}
