from datetime import datetime, timezone
from functools import wraps
import re
import secrets

from flask import Blueprint, current_app, jsonify, redirect, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

try:
    from authlib.integrations.flask_client import OAuth
except ImportError:  # pragma: no cover
    OAuth = None

AUTH_BP = Blueprint('auth', __name__)
SOCIAL_COOKIE_DAYS = 30
USERNAME_RE = re.compile(r'^[A-Za-z0-9_]{3,20}$')
AVATAR_PRESETS = ('pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'crown', 'flame')


def configure_auth(app):
    if app.extensions.get('archess_auth_configured'):
        return
    app.config.setdefault('SESSION_COOKIE_HTTPONLY', True)
    app.config.setdefault('SESSION_COOKIE_SAMESITE', 'Lax')
    app.config.setdefault('SESSION_COOKIE_SECURE', not app.config.get('TESTING', False) and not app.config.get('DEBUG', False))
    app.config.setdefault('PERMANENT_SESSION_LIFETIME', SOCIAL_COOKIE_DAYS * 24 * 60 * 60)
    app.extensions['archess_auth_configured'] = True
    if OAuth and app.config.get('GOOGLE_CLIENT_ID') and app.config.get('GOOGLE_CLIENT_SECRET'):
        oauth = OAuth(app)
        oauth.register(name='google', client_id=app.config['GOOGLE_CLIENT_ID'], client_secret=app.config['GOOGLE_CLIENT_SECRET'], server_metadata_url='https://accounts.google.com/.well-known/openid-configuration', client_kwargs={'scope': 'openid email profile'})
        app.extensions['archess_google_oauth'] = oauth


def current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    from game.models import User
    return db.session.get(User, int(user_id))


def csrf_token():
    token = session.get('csrf_token')
    if not token:
        token = secrets.token_urlsafe(32)
        session['csrf_token'] = token
    return token


def require_csrf():
    expected = session.get('csrf_token')
    supplied = request.headers.get('X-CSRF-Token')
    return bool(expected and supplied and secrets.compare_digest(expected, supplied))


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({'error': 'authentication_required'}), 401
        return view(user, *args, **kwargs)
    return wrapped


def validate_username(username):
    return isinstance(username, str) and USERNAME_RE.fullmatch(username) is not None


def normalize_email(email):
    return email.strip().lower() if isinstance(email, str) else ''


def user_payload(user, private=False):
    payload = user.public_dict()
    payload.update({'authenticated': True, 'csrfToken': csrf_token()})
    if private:
        payload.update({'email': user.email, 'googleLinked': bool(user.google_sub), 'authProvider': user.auth_provider, 'guestId': user.guest_id})
    return payload


@AUTH_BP.get('/api/auth/csrf')
def auth_csrf():
    configure_auth(current_app._get_current_object())
    return jsonify({'csrfToken': csrf_token()})


@AUTH_BP.get('/api/auth/me')
def auth_me():
    configure_auth(current_app._get_current_object())
    user = current_user()
    if user is None:
        return jsonify({'authenticated': False, 'csrfToken': csrf_token()}), 200
    return jsonify(user_payload(user, private=True)), 200


@AUTH_BP.post('/api/auth/signup')
def signup():
    configure_auth(current_app._get_current_object())
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    email = normalize_email(payload.get('email'))
    password = payload.get('password')
    guest_id = payload.get('guestId')
    avatar_key = payload.get('avatarKey') or 'knight'
    avatar_url = payload.get('avatarUrl')
    if not validate_username(username):
        return jsonify({'error': 'invalid_username', 'message': 'Username must be 3-20 characters using letters, numbers or underscore'}), 400
    if not email or '@' not in email or len(email) > 254:
        return jsonify({'error': 'invalid_email'}), 400
    if not isinstance(password, str) or len(password) < 10 or len(password) > 128:
        return jsonify({'error': 'weak_password', 'message': 'Password must be 10-128 characters'}), 400
    if avatar_key not in AVATAR_PRESETS:
        avatar_key = 'knight'
    from game.models import User
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'username_taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'email_taken'}), 409
    user = User.query.filter_by(guest_id=guest_id.strip()).first() if isinstance(guest_id, str) and guest_id.strip() else None
    if user and user.email:
        return jsonify({'error': 'guest_already_claimed'}), 409
    if user is None:
        user = User(guest_id=f'account-{secrets.token_urlsafe(18)}')
        db.session.add(user)
    user.username = username
    user.email = email
    user.password_hash = generate_password_hash(password)
    user.auth_provider = 'password'
    user.avatar_key = avatar_key
    user.avatar_url = avatar_url.strip() if isinstance(avatar_url, str) and avatar_url.strip() else None
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()
    session.clear(); session.permanent = True; session['user_id'] = user.id; session['csrf_token'] = secrets.token_urlsafe(32)
    return jsonify(user_payload(user, private=True)), 201


@AUTH_BP.post('/api/auth/login')
def login():
    configure_auth(current_app._get_current_object())
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    payload = request.get_json(silent=True) or {}
    identifier = (payload.get('identifier') or '').strip().lower()
    password = payload.get('password')
    if not identifier or not isinstance(password, str):
        return jsonify({'error': 'invalid_credentials'}), 401
    from game.models import User
    user = User.query.filter((User.email == identifier) | (User.username == identifier)).first()
    if user is None or not user.password_hash or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'invalid_credentials'}), 401
    session.clear(); session.permanent = True; session['user_id'] = user.id; session['csrf_token'] = secrets.token_urlsafe(32)
    user.last_seen = datetime.now(timezone.utc); db.session.commit()
    return jsonify(user_payload(user, private=True)), 200


@AUTH_BP.post('/api/auth/logout')
def logout():
    if not require_csrf():
        return jsonify({'error': 'csrf_required'}), 403
    session.clear(); session.permanent = False
    return jsonify({'authenticated': False}), 200


@AUTH_BP.get('/api/auth/google/start')
def google_start():
    oauth = current_app.extensions.get('archess_google_oauth')
    if oauth is None:
        return jsonify({'error': 'google_oauth_not_configured'}), 503
    redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI') or url_for('auth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@AUTH_BP.get('/api/auth/google/callback')
def google_callback():
    oauth = current_app.extensions.get('archess_google_oauth')
    if oauth is None:
        return jsonify({'error': 'google_oauth_not_configured'}), 503
    token = oauth.google.authorize_access_token(); userinfo = token.get('userinfo') or {}
    google_sub = userinfo.get('sub'); email = normalize_email(userinfo.get('email'))
    if not google_sub or not email:
        return jsonify({'error': 'google_identity_invalid'}), 400
    from game.models import User
    user = User.query.filter_by(google_sub=str(google_sub)).first() or User.query.filter_by(email=email).first()
    if user is None:
        user = User(guest_id=f'account-{secrets.token_urlsafe(18)}', email=email); db.session.add(user)
    if not user.username:
        base = re.sub(r'[^A-Za-z0-9_]', '', userinfo.get('name') or email.split('@')[0])[:18] or 'player'; candidate = base; suffix = 1
        while User.query.filter(User.username == candidate, User.id != user.id).first():
            suffix += 1; candidate = f'{base[:18-len(str(suffix))]}{suffix}'
        user.username = candidate
    user.google_sub = str(google_sub); user.auth_provider = 'google'
    if not user.avatar_url:
        picture = userinfo.get('picture'); user.avatar_url = picture if isinstance(picture, str) and picture.startswith('https://') else None
    user.last_seen = datetime.now(timezone.utc); db.session.commit()
    session.clear(); session.permanent = True; session['user_id'] = user.id; session['csrf_token'] = secrets.token_urlsafe(32)
    return redirect('/profile')


@AUTH_BP.get('/login')
def login_page():
    return current_app.send_static_file('auth.html')


@AUTH_BP.get('/profile')
def profile_page():
    return current_app.send_static_file('profile.html')
