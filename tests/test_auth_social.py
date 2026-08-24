import pytest
from app import create_app
from config import TestingConfig
from extensions import db


@pytest.fixture()
def app_client():
    application = create_app(TestingConfig)
    with application.app_context():
        db.drop_all()
        db.create_all()
    client = application.test_client()
    yield application, client
    with application.app_context():
        db.session.remove()
        db.drop_all()


def csrf(client):
    return client.get('/api/auth/csrf').get_json()['csrfToken']


def signup(client, username, email, guest_id):
    token = csrf(client)
    response = client.post('/api/auth/signup', json={
        'username': username,
        'email': email,
        'password': 'A-strong-password-123',
        'guestId': guest_id,
        'avatarKey': 'knight',
    }, headers={'X-CSRF-Token': token})
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def login(client, email):
    token = csrf(client)
    response = client.post('/api/auth/login', json={
        'identifier': email,
        'password': 'A-strong-password-123',
    }, headers={'X-CSRF-Token': token})
    assert response.status_code == 200, response.get_json()
    return response.get_json()


def test_signup_login_logout_and_guest_claim(app_client):
    application, client = app_client
    data = signup(client, 'PlayerOne', 'one@example.com', 'guest-one')
    assert data['username'] == 'PlayerOne'
    assert data['authProvider'] == 'password'
    assert client.get('/api/auth/me').get_json()['authenticated'] is True
    token = data['csrfToken']
    assert client.post('/api/auth/logout', headers={'X-CSRF-Token': token}).status_code == 200
    logged = login(client, 'one@example.com')
    assert logged['username'] == 'PlayerOne'


def test_duplicate_credentials_and_google_configuration(app_client):
    application, client = app_client
    signup(client, 'PlayerOne', 'one@example.com', 'guest-one')
    token = csrf(client)
    duplicate = client.post('/api/auth/signup', json={
        'username': 'PlayerOne', 'email': 'other@example.com', 'password': 'A-strong-password-123'
    }, headers={'X-CSRF-Token': token})
    assert duplicate.status_code == 409
    assert client.get('/api/auth/google/start').status_code == 503


def test_profile_friendship_and_direct_challenge(app_client):
    application, client = app_client
    alpha = signup(client, 'Alpha', 'alpha@example.com', 'guest-alpha')
    alpha_client = application.test_client()
    bravo_client = application.test_client()
    bravo = signup(bravo_client, 'Bravo', 'bravo@example.com', 'guest-bravo')
    bravo_token = bravo['csrfToken']
    request_response = bravo_client.post('/api/friends/request', json={'userId': alpha['id']}, headers={'X-CSRF-Token': bravo_token})
    assert request_response.status_code == 201
    friendship_id = request_response.get_json()['friendshipId']
    alpha_login = login(alpha_client, 'alpha@example.com')
    accepted = alpha_client.post(f'/api/friends/{friendship_id}/accept', headers={'X-CSRF-Token': alpha_login['csrfToken']})
    assert accepted.status_code == 200

    challenge = bravo_client.post('/api/challenges', json={'userId': alpha['id'], 'mode': 'casual'}, headers={'X-CSRF-Token': bravo_client.get('/api/auth/me').get_json()['csrfToken']})
    assert challenge.status_code == 201, challenge.get_json()
    challenge_id = challenge.get_json()['id']
    accepted_challenge = alpha_client.post(f"/api/challenges/{challenge_id}/accept", headers={'X-CSRF-Token': alpha_client.get('/api/auth/me').get_json()['csrfToken']})
    assert accepted_challenge.status_code == 200, accepted_challenge.get_json()
    payload = accepted_challenge.get_json()
    assert payload['matchId'].startswith('match-')
    assert payload['internalRoomId']


def test_public_profile_has_stats_history_graphs_and_achievements(app_client):
    _, client = app_client
    signup(client, 'GraphPlayer', 'graph@example.com', 'guest-graph')
    response = client.get('/api/profile/GraphPlayer')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['username'] == 'GraphPlayer'
    assert 'stats' in payload
    assert 'performance' in payload
    assert 'history' in payload
    assert 'achievements' in payload
    assert 'cosmetics' in payload
