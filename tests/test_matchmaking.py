import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError

from app import create_app
from config import TestingConfig
from extensions import db
from game.models import MatchmakingQueue, Room, User


@pytest.fixture()
def client():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
        yield application.test_client()
        db.session.remove()
        db.drop_all()


def _join(client, guest_id):
    return client.post('/api/matchmaking/join', json={'guestId': guest_id})


def _status(client, guest_id):
    return client.get('/api/matchmaking/status', query_string={'guestId': guest_id})


def test_first_player_enters_search_queue(client):
    response = _join(client, 'mm-alice')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'searching'
    assert data['room'] is None
    assert data['mmrWindow'] == 200

    with client.application.app_context():
        assert MatchmakingQueue.query.count() == 1
        assert MatchmakingQueue.query.one().status == 'searching'


def test_second_player_is_paired_into_same_private_room(client):
    first = _join(client, 'mm-alice')
    second = _join(client, 'mm-bob')
    assert first.status_code == 200
    assert second.status_code == 200

    alice = _status(client, 'mm-alice').get_json()
    bob = second.get_json()
    assert alice['status'] == 'matched'
    assert bob['status'] == 'matched'
    assert alice['room']['roomId'] == bob['room']['roomId']
    assert len(alice['room']['players']) == 2
    assert {player['team'] for player in alice['room']['players']} == {'white', 'black'}

    with client.application.app_context():
        assert Room.query.count() == 1
        room = Room.query.one()
        assert room.status == 'waiting'
        assert {room.white_player_id, room.black_player_id} == {
            User.query.filter_by(guest_id='mm-alice').one().id,
            User.query.filter_by(guest_id='mm-bob').one().id,
        }


def test_queue_join_is_idempotent_for_existing_search(client):
    first = _join(client, 'mm-alice')
    second = _join(client, 'mm-alice')
    assert first.get_json()['queueId'] == second.get_json()['queueId']

    with client.application.app_context():
        assert MatchmakingQueue.query.count() == 1


def test_duplicate_queue_row_is_rejected(client):
    with client.application.app_context():
        user = User(guest_id='mm-alice')
        db.session.add(user)
        db.session.flush()
        db.session.add(MatchmakingQueue(user_id=user.id))
        db.session.commit()
        db.session.add(MatchmakingQueue(user_id=user.id))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_leave_cancels_search_and_rejoin_can_search_again(client):
    _join(client, 'mm-alice')
    left = client.post('/api/matchmaking/leave', json={'guestId': 'mm-alice'})
    assert left.status_code == 200
    assert left.get_json()['status'] == 'canceled'

    joined_again = _join(client, 'mm-alice')
    assert joined_again.status_code == 200
    assert joined_again.get_json()['status'] == 'searching'


def test_large_mmr_gap_does_not_pair_before_window_expands(client):
    _join(client, 'mm-alice')
    with client.application.app_context():
        User.query.filter_by(guest_id='mm-alice').one().mmr = 1200
        bob = User(guest_id='mm-bob', mmr=1451)
        db.session.add(bob)
        db.session.flush()
        bob_entry = MatchmakingQueue(user_id=bob.id)
        db.session.add(bob_entry)
        db.session.commit()

    response = _join(client, 'mm-bob')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'searching'
    assert response.get_json()['mmrWindow'] == 200
    assert _status(client, 'mm-alice').get_json()['status'] == 'searching'

    with client.application.app_context():
        assert Room.query.count() == 0


def test_wait_time_expands_mmr_window_for_both_players(client):
    _join(client, 'mm-alice')
    with client.application.app_context():
        alice = User.query.filter_by(guest_id='mm-alice').one()
        alice_entry = MatchmakingQueue.query.filter_by(user_id=alice.id).one()
        joined = datetime.now(timezone.utc) - timedelta(seconds=16)
        alice_entry.joined_at = joined
        bob = User(guest_id='mm-bob', mmr=1450)
        db.session.add(bob)
        db.session.flush()
        bob_entry = MatchmakingQueue(user_id=bob.id, joined_at=joined)
        db.session.add(bob_entry)
        db.session.commit()

    response = _join(client, 'mm-bob')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'matched'
    assert response.get_json()['room'] is not None


def test_finished_matched_room_recovers_to_searching(client):
    _join(client, 'mm-alice')
    _join(client, 'mm-bob')

    with client.application.app_context():
        room = Room.query.one()
        room.status = 'finished'
        db.session.commit()

    recovered = _status(client, 'mm-alice')
    assert recovered.status_code == 200
    data = recovered.get_json()
    assert data['status'] == 'searching'
    assert data['room'] is None
    assert data['mmrWindow'] == 200


def test_large_mmr_gap_remains_unmatched_at_initial_window(client):
    _join(client, 'mm-alice')
    with client.application.app_context():
        User.query.filter_by(guest_id='mm-alice').one().mmr = 1200
        bob = User(guest_id='mm-bob', mmr=1601)
        db.session.add(bob)
        db.session.commit()

    response = _join(client, 'mm-bob')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'searching'
    assert _status(client, 'mm-alice').get_json()['status'] == 'searching'

    with client.application.app_context():
        assert Room.query.count() == 0
