import json

import pytest

from app import create_app
from config import TestingConfig
from extensions import db
from game.physics.state_hash import state_hash


@pytest.fixture()
def client():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
    with application.test_client() as test_client:
        yield test_client
    with application.app_context():
        db.drop_all()


def make_room(client):
    created = client.post("/api/rooms", json={"guestId": "white-guest"})
    assert created.status_code == 201
    room = created.get_json()["roomId"]

    joined = client.post(f"/api/rooms/{room}/join", json={"guestId": "black-guest"})
    assert joined.status_code == 200

    started = client.post(f"/api/rooms/{room}/start")
    assert started.status_code == 200
    return room, started.get_json()["state"], started.get_json()["room"]


def test_start_creates_server_canonical_state(client):
    room, state, room_data = make_room(client)
    assert len(state["pieces"]) == 32
    assert state["currentTeam"] == "white"
    assert state["gameOver"] is False
    assert room_data["canonicalHash"] == state_hash(state)

    stored = client.get(f"/api/rooms/{room}/sync")
    assert stored.status_code == 200
    stored_state = json.loads(stored.get_json()["state"])
    assert stored_state == state


def test_client_cannot_overwrite_authoritative_state(client):
    room, _, _ = make_room(client)
    response = client.post(
        f"/api/rooms/{room}/sync",
        json={"state": {"currentTeam": "black", "pieces": []}},
    )
    assert response.status_code == 409
    assert response.get_json()["error"] == "client_state_not_authoritative"

    assert client.post(f"/api/rooms/{room}/hp", json={"hpState": {}}).status_code == 409
    assert client.post(f"/api/rooms/{room}/destruction", json={"destructionEvent": {}}).status_code == 409
    assert client.post(f"/api/rooms/{room}/gameover", json={"gameOverEvent": {}}).status_code == 409


def test_launch_runs_on_server_and_persists_result(client):
    room, state, _ = make_room(client)
    white_piece = next(piece for piece in state["pieces"] if piece["team"] == "white" and piece["type"] == "rook")

    response = client.post(
        f"/api/rooms/{room}/launch",
        json={
            "guestId": "white-guest",
            "launchData": {"pieceId": white_piece["id"], "vector": {"x": 5.0, "y": 0.0}},
        },
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data["nextTurn"] == "black"
    assert isinstance(data["events"], list)
    integrity = data["state"]["integrity"]
    assert integrity["preHash"] == state_hash(state)
    assert integrity["postHash"] == state_hash(data["state"])
    assert any(event.get("type") == "integrity" and event.get("shotHash") == integrity["shotHash"] for event in data["events"])

    persisted = json.loads(client.get(f"/api/rooms/{room}/sync").get_json()["state"])
    assert persisted == data["state"]
    assert persisted["currentTeam"] == "black"

    reconnect = client.post(f"/api/rooms/{room}/reconnect", json={"guestId": "black-guest"})
    assert reconnect.status_code == 200
    reconnect_payload = reconnect.get_json()
    assert reconnect_payload["room"]["canonicalHash"] == state_hash(persisted)
    assert json.loads(reconnect_payload["state"]) == persisted


def test_launch_rejects_wrong_player_before_simulation(client):
    room, state, _ = make_room(client)
    white_piece = next(piece for piece in state["pieces"] if piece["team"] == "white")

    response = client.post(
        f"/api/rooms/{room}/launch",
        json={
            "guestId": "black-guest",
            "launchData": {"pieceId": white_piece["id"], "vector": {"x": 3.0, "y": 0.0}},
        },
    )
    assert response.status_code == 403
    assert response.get_json()["reason"] == "not_your_turn"
