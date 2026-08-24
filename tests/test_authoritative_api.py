import json

import pytest

from config import TestingConfig
from extensions import db
from app import create_app


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
    return room, started.get_json()["state"]


def test_start_creates_server_canonical_state(client):
    room, state = make_room(client)
    assert len(state["pieces"]) == 32
    assert state["currentTeam"] == "white"
    assert state["gameOver"] is False

    stored = client.get(f"/api/rooms/{room}/sync")
    assert stored.status_code == 200
    stored_state = json.loads(stored.get_json()["state"])
    assert stored_state == state


def test_client_cannot_overwrite_authoritative_state(client):
    room, _ = make_room(client)
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
    room, state = make_room(client)
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

    persisted = json.loads(client.get(f"/api/rooms/{room}/sync").get_json()["state"])
    assert persisted == data["state"]
    assert persisted["currentTeam"] == "black"


def test_launch_rejects_wrong_player_before_simulation(client):
    room, state = make_room(client)
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
