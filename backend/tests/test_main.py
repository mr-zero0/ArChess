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
