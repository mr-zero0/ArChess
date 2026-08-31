from datetime import datetime, timedelta, timezone
import secrets
import string

from flask import Blueprint, jsonify, request

from core.extensions import db
from game.auth_routes import current_user, login_required, require_csrf

SOCIAL_BP = Blueprint('social', __name__)


def _utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def public_user(user):
    return user.public_dict()


def friend_between(a_id, b_id):
    from game.models.social import Friendship
    return Friendship.query.filter(
        ((Friendship.requester_id == a_id) & (Friendship.addressee_id == b_id)) |
        ((Friendship.requester_id == b_id) & (Friendship.addressee_id == a_id))
    ).first()


def are_friends(a_id, b_id):
    relation = friend_between(a_id, b_id)
    return bool(relation and relation.status == 'accepted')


def make_direct_match(challenger, challenged, mode='casual'):
    from game.models import Room
    room_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    while Room.query.filter_by(room_code=room_code).first():
        room_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    room = Room(room_code=room_code, status='waiting', white_player_id=challenger.id, black_player_id=challenged.id)
    if mode == 'ranked':
        room.match_log = '{"type":"ranked_match_start","source":"friend_challenge"}'
    db.session.add(room)
    db.session.flush()
    challenger.room_id = room.id
    challenged.room_id = room.id
    return room


@SOCIAL_BP.get('/api/profile/me')
@login_required
def profile_me(user):
    return _profile_response(user, private=True)


@SOCIAL_BP.get('/api/profile/<username>')
def profile_public(username):
    from game.models import User
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'profile_not_found'}), 404
    viewer = current_user()
    return _profile_response(user, private=bool(viewer and viewer.id == user.id))


def _profile_response(user, private=False):
    from game.models.social import MatchHistory
    from game.ranked import tier_for_mmr, is_provisional
    history = MatchHistory.query.filter_by(user_id=user.id).order_by(MatchHistory.created_at.desc()).limit(50).all()
    wins = sum(1 for item in history if item.result == 'win')
    losses = sum(1 for item in history if item.result == 'loss')
    profile = public_user(user)
    profile.update({
        'stats': {
            'mmr': int(user.mmr or 1200),
            'tier': tier_for_mmr(user.mmr),
            'provisional': is_provisional(user.matches_played),
            'matchesPlayed': int(user.matches_played or 0),
            'wins': int(user.wins or 0),
            'losses': int(user.losses or 0),
            'winRate': round((wins / max(1, wins + losses)) * 100, 1),
            'xp': int(user.xp or 0),
            'level': int(user.level or 1),
        },
        'history': [item.to_dict() for item in history],
        'performance': [
            {'date': item.created_at.isoformat(), 'mmr': item.mmr_after, 'result': item.result, 'xp': item.xp_gained}
            for item in reversed(history)
        ],
        'achievements': user.achievements or [],
        'cosmetics': {'owned': user.cosmetics_owned or [], 'equipped': user.avatar_key},
    })
    if private:
        profile['email'] = user.email
        profile['authProvider'] = user.auth_provider
        profile['googleLinked'] = bool(user.google_sub)
    return jsonify(profile), 200


@SOCIAL_BP.patch('/api/profile/me')
@login_required
def profile_update(user):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    payload = request.get_json(silent=True) or {}
    username = payload.get('username')
    bio = payload.get('bio')
    avatar_key = payload.get('avatarKey')
    avatar_url = payload.get('avatarUrl')
    from game.models import User
    if username is not None:
        from game.auth_routes import validate_username
        if not validate_username(username):
            return jsonify({'error': 'invalid_username'}), 400
        other = User.query.filter(User.username == username, User.id != user.id).first()
        if other:
            return jsonify({'error': 'username_taken'}), 409
        user.username = username
    if bio is not None:
        if not isinstance(bio, str) or len(bio) > 280:
            return jsonify({'error': 'invalid_bio'}), 400
        user.bio = bio.strip()
    if avatar_key is not None:
        from game.auth_routes import AVATAR_PRESETS
        if avatar_key not in AVATAR_PRESETS:
            return jsonify({'error': 'invalid_avatar'}), 400
        user.avatar_key = avatar_key
    if avatar_url is not None:
        if avatar_url and (not isinstance(avatar_url, str) or not avatar_url.startswith('https://') or len(avatar_url) > 500):
            return jsonify({'error': 'invalid_avatar_url'}), 400
        user.avatar_url = avatar_url or None
    db.session.commit()
    return _profile_response(user, private=True)


@SOCIAL_BP.get('/api/friends')
@login_required
def friends(user):
    from game.models.social import Friendship
    relations = Friendship.query.filter(
        ((Friendship.requester_id == user.id) | (Friendship.addressee_id == user.id)) &
        (Friendship.status.in_(['accepted', 'pending', 'blocked']))
    ).order_by(Friendship.updated_at.desc()).limit(100).all()
    data = []
    for relation in relations:
        other = relation.addressee if relation.requester_id == user.id else relation.requester
        data.append({'id': relation.id, 'status': relation.status, 'direction': 'outgoing' if relation.requester_id == user.id else 'incoming', 'user': public_user(other)})
    return jsonify({'friends': data}), 200


@SOCIAL_BP.get('/api/friends/search')
@login_required
def friend_search(user):
    query = (request.args.get('q') or '').strip()
    if len(query) < 2:
        return jsonify({'users': []}), 200
    from game.models import User
    users = User.query.filter(User.username.ilike(f'%{query}%'), User.id != user.id).order_by(User.username.asc()).limit(20).all()
    return jsonify({'users': [public_user(item) for item in users]}), 200


@SOCIAL_BP.post('/api/friends/request')
@login_required
def friend_request(user):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    payload = request.get_json(silent=True) or {}
    target_id = payload.get('userId')
    from game.models import User
    from game.models.social import Friendship
    target = db.session.get(User, target_id) if target_id else None
    if target is None or target.id == user.id:
        return jsonify({'error': 'invalid_friend_target'}), 400
    relation = friend_between(user.id, target.id)
    if relation:
        if relation.status == 'blocked':
            return jsonify({'error': 'friend_blocked'}), 409
        if relation.status == 'accepted':
            return jsonify({'error': 'already_friends'}), 409
        if relation.requester_id == user.id and relation.status == 'pending':
            return jsonify({'error': 'request_already_sent'}), 409
        relation.status = 'accepted'
        db.session.commit()
        return jsonify({'status': 'accepted', 'friend': public_user(target), 'friendshipId': relation.id}), 200
    relation = Friendship(requester_id=user.id, addressee_id=target.id, status='pending')
    db.session.add(relation)
    db.session.commit()
    return jsonify({'status': 'pending', 'friend': public_user(target), 'friendshipId': relation.id}), 201


@SOCIAL_BP.post('/api/friends/<int:friendship_id>/accept')
@login_required
def friend_accept(user, friendship_id):
    return _friend_mutation(user, friendship_id, 'accepted')


@SOCIAL_BP.post('/api/friends/<int:friendship_id>/decline')
@login_required
def friend_decline(user, friendship_id):
    return _friend_mutation(user, friendship_id, 'declined')


@SOCIAL_BP.post('/api/friends/<int:friendship_id>/block')
@login_required
def friend_block(user, friendship_id):
    return _friend_mutation(user, friendship_id, 'blocked')


@SOCIAL_BP.delete('/api/friends/<int:friendship_id>')
@login_required
def friend_remove(user, friendship_id):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    from game.models.social import Friendship
    relation = db.session.get(Friendship, friendship_id)
    if relation is None or user.id not in {relation.requester_id, relation.addressee_id}:
        return jsonify({'error': 'friendship_not_found'}), 404
    db.session.delete(relation)
    db.session.commit()
    return jsonify({'status': 'removed'}), 200


def _friend_mutation(user, friendship_id, status):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    from game.models.social import Friendship
    relation = db.session.get(Friendship, friendship_id)
    if relation is None or relation.addressee_id != user.id:
        return jsonify({'error': 'friendship_not_found'}), 404
    relation.status = status
    relation.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'status': status}), 200


@SOCIAL_BP.get('/api/challenges')
@login_required
def challenge_list(user):
    from game.models.social import Challenge
    incoming = Challenge.query.filter_by(challenged_id=user.id).order_by(Challenge.created_at.desc()).limit(50).all()
    outgoing = Challenge.query.filter_by(challenger_id=user.id).order_by(Challenge.created_at.desc()).limit(50).all()
    return jsonify({'incoming': [item.to_public_dict() for item in incoming], 'outgoing': [item.to_public_dict() for item in outgoing]}), 200


@SOCIAL_BP.post('/api/challenges')
@login_required
def challenge_create(user):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    payload = request.get_json(silent=True) or {}
    target_id = payload.get('userId')
    mode = payload.get('mode', 'casual')
    if mode not in {'casual', 'ranked'}:
        return jsonify({'error': 'invalid_mode'}), 400
    from game.models import User
    from game.models.social import Challenge
    target = db.session.get(User, target_id) if target_id else None
    if target is None or target.id == user.id or not are_friends(user.id, target.id):
        return jsonify({'error': 'friend_required'}), 403
    existing = Challenge.query.filter_by(challenger_id=user.id, challenged_id=target.id, status='pending').first()
    if existing:
        return jsonify(existing.to_public_dict()), 409
    challenge = Challenge(challenger_id=user.id, challenged_id=target.id, status='pending', mode=mode, expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
    db.session.add(challenge)
    db.session.commit()
    return jsonify(challenge.to_public_dict()), 201


@SOCIAL_BP.post('/api/challenges/<int:challenge_id>/accept')
@login_required
def challenge_accept(user, challenge_id):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    from game.models.social import Challenge
    challenge = db.session.get(Challenge, challenge_id)
    if challenge is None or challenge.challenged_id != user.id:
        return jsonify({'error': 'challenge_not_found'}), 404
    if challenge.status != 'pending':
        return jsonify({'error': 'challenge_not_pending'}), 409
    if _utc(challenge.expires_at) and _utc(challenge.expires_at) < datetime.now(timezone.utc):
        challenge.status = 'expired'
        db.session.commit()
        return jsonify({'error': 'challenge_expired'}), 409
    from game.models import User
    challenger = db.session.get(User, challenge.challenger_id)
    if challenger is None:
        return jsonify({'error': 'challenger_not_found'}), 404
    if challenger.room_id or user.room_id:
        return jsonify({'error': 'player_busy'}), 409
    room = make_direct_match(challenger, user, challenge.mode)
    challenge.status = 'accepted'
    challenge.room_id = room.id
    challenge.responded_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'challenge': challenge.to_public_dict(), 'matchId': f'match-{challenge.id}', 'internalRoomId': room.room_code}), 200


@SOCIAL_BP.post('/api/challenges/<int:challenge_id>/decline')
@login_required
def challenge_decline(user, challenge_id):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    from game.models.social import Challenge
    challenge = db.session.get(Challenge, challenge_id)
    if challenge is None or challenge.challenged_id != user.id:
        return jsonify({'error': 'challenge_not_found'}), 404
    if challenge.status != 'pending':
        return jsonify({'error': 'challenge_not_pending'}), 409
    challenge.status = 'declined'
    challenge.responded_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(challenge.to_public_dict()), 200


@SOCIAL_BP.delete('/api/challenges/<int:challenge_id>')
@login_required
def challenge_cancel(user, challenge_id):
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    from game.models.social import Challenge
    challenge = db.session.get(Challenge, challenge_id)
    if challenge is None or challenge.challenger_id != user.id:
        return jsonify({'error': 'challenge_not_found'}), 404
    if challenge.status != 'pending':
        return jsonify({'error': 'challenge_not_pending'}), 409
    challenge.status = 'canceled'
    challenge.responded_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'status': 'canceled'}), 200


@SOCIAL_BP.get('/api/history')
@login_required
def history(user):
    from game.models.social import MatchHistory
    limit = max(1, min(int(request.args.get('limit', 50)), 100))
    rows = MatchHistory.query.filter_by(user_id=user.id).order_by(MatchHistory.created_at.desc()).limit(limit).all()
    return jsonify({'matches': [item.to_dict() for item in rows]}), 200
