import hashlib

import pytest

from app import create_app
from config import TestingConfig
from extensions import db
from game.models import Room, TelemetryEvent, User
from game.telemetry import actor_hash, record_event, summary


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    application.config["ANALYTICS_API_KEY"] = "test-analytics-key"
    application.config["TELEMETRY_SALT"] = "test-salt"
    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


def test_actor_hash_is_stable_and_not_raw_guest_id(app):
    with app.app_context():
        value = actor_hash("alice")
        assert value == hashlib.sha256(b"test-salt:alice").hexdigest()
        assert value != "alice"
        assert len(value) == 64


def test_record_event_persists_supported_event(app):
    with app.app_context():
        user = User(guest_id="telemetry-user")
        db.session.add(user)
        db.session.flush()
        event = record_event(
            "match_found",
            guest_id=user.guest_id,
            payload={"queueWaitSeconds": 3},
            commit=True,
        )
        assert event.id is not None
        saved = db.session.get(TelemetryEvent, event.id)
        assert saved.actor_hash != user.guest_id
        assert saved.payload["queueWaitSeconds"] == 3


def test_summary_counts_events_and_never_exposes_actor_hash(app):
    with app.app_context():
        record_event("queue_join", guest_id="alice", commit=False)
        record_event("queue_join", guest_id="bob", commit=False)
        record_event("ranked_result", guest_id="alice", commit=False)
        db.session.commit()
        result = summary(7)
        assert result["events"]["queue_join"] == 2
        assert result["events"]["ranked_result"] == 1
        assert "actor_hash" not in result


def test_analytics_requires_key(app):
    client = app.test_client()
    assert client.get("/api/analytics/summary").status_code == 401
    ok = client.get(
        "/api/analytics/summary?days=7",
        headers={"X-Analytics-Key": "test-analytics-key"},
    )
    assert ok.status_code == 200
    assert ok.get_json()["days"] == 7


def test_analytics_rejects_bad_window(app):
    client = app.test_client()
    response = client.get(
        "/api/analytics/summary?days=91",
        headers={"X-Analytics-Key": "test-analytics-key"},
    )
    assert response.status_code == 400
