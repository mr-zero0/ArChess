"""
ARCHESS - Full Flask Backend Application
Serves the Minimalist Multi-Page Web Application, REST APIs for Authentication,
Leaderboards, Game Match Settlement, Telemetry, and Tracker-Compliant Structured Logging.
"""

from __future__ import annotations

import os
import uuid
import time
import json
import secrets
import hashlib
import threading
from typing import Optional, Dict, Any, Tuple, List, Union
from flask import Flask, request, jsonify, session, render_template, send_from_directory, Response
from flask_cors import CORS
from flask_sock import Sock
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.logger import setup_logging
from backend.database import (
    init_db,
    register_user,
    authenticate_user,
    get_user_by_id,
    get_leaderboard,
    get_user_stats,
    get_match_by_id,
    record_match_result,
    log_telemetry_event,
    update_user_profile,
    update_user_password,
    get_or_create_google_user,
    delete_user_account,
    revoke_all_user_sessions,
    create_or_promote_admin,
    list_users_admin,
    set_user_admin_status,
    get_admin_system_stats
)
from backend.metrics import get_metrics_engine
from backend.multiplayer import room_manager, matchmaking_queue
from backend.tournament import tournament_engine
from backend.achievements import (
    get_all_achievements,
    get_user_achievements,
    evaluate_match_achievements
)
from backend.notation import generate_pgn, generate_fen
from backend.ai_engine import (
    global_rag_engine,
    global_coach_agent,
    global_shoutcaster_agent,
    global_debrief_agent,
    PromptCatalog
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try:
    from dotenv import load_dotenv
    _env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(_env_file):
        load_dotenv(_env_file)
except ImportError:
    pass

TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

logger, run_dir = setup_logging("ArChess")

SERVER_START_TIME = time.time()

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)
_configured_secret = os.environ.get("SECRET_KEY")
if not _configured_secret:
    _configured_secret = secrets.token_hex(32)
    logger.warning('{"event":"security_warning", "message":"SECRET_KEY not set — using ephemeral random key. Sessions will not persist across restarts. Set SECRET_KEY env var for production."}')
app.secret_key = _configured_secret

def configure_production_settings(application=app):
    """Configure security flags, cookie policies, and cache headers based on environment."""
    is_prod = os.environ.get("FLASK_ENV") == "production" or os.environ.get("PRODUCTION") in ("1", "true")
    application.config['SESSION_COOKIE_HTTPONLY'] = True
    application.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    if is_prod or os.environ.get("SESSION_COOKIE_SECURE") in ("1", "true"):
        application.config['SESSION_COOKIE_SECURE'] = True
    if is_prod:
        application.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000
    else:
        application.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Mount ProxyFix to unpack X-Forwarded-For, X-Forwarded-Proto headers from reverse proxies (Nginx/Cloudflare)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

def configure_cors(application=app):
    """Configure CORS allowed origins from environment."""
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    if cors_origins and cors_origins.strip() != "*":
        allowed = [o.strip() for o in cors_origins.split(",") if o.strip()]
        return CORS(application, origins=allowed, supports_credentials=True)
    return CORS(application, supports_credentials=True)

configure_cors(app)
sock = Sock(app)


# Initialize database schema and seeds
init_db()

# Auto-provision administrator if specified in environment
_admin_email = os.environ.get("ADMIN_EMAIL")
_admin_password = os.environ.get("ADMIN_PASSWORD")
if _admin_email and _admin_password:
    _admin_username = os.environ.get("ADMIN_USERNAME", "ArChess_Admin")
    create_or_promote_admin(_admin_username, _admin_email, _admin_password)
    logger.info(f'{{"event":"admin_initialized", "email":"{_admin_email}"}}')

# -------------------------------------------------------------
# Render Free-Tier Keep-Alive Self-Ping
# Prevents the service from sleeping after 15min of inactivity,
# which causes the Render cold-start splash screen.
# Only activates on Render (detected via RENDER env var).
# -------------------------------------------------------------
_render_url = os.environ.get("RENDER_EXTERNAL_URL")
_is_render = os.environ.get("RENDER") == "true" or bool(_render_url)

if _is_render:
    import urllib.request

    def _keep_alive_ping():
        """Ping own health endpoint every 13 minutes to prevent Render free-tier sleep."""
        ping_url = f"{_render_url}/api/health" if _render_url else None
        if not ping_url:
            logger.warning('{"event":"keep_alive_skip", "reason":"RENDER_EXTERNAL_URL not set"}')
            return

        logger.info(f'{{"event":"keep_alive_started", "interval_min":13, "url":"{ping_url}"}}')

        while True:
            time.sleep(13 * 60)  # 13 minutes (Render sleeps at 15)
            try:
                req = urllib.request.Request(ping_url, method="GET")
                req.add_header("User-Agent", "ArChess-KeepAlive/1.0")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    logger.info(f'{{"event":"keep_alive_ping", "status":{resp.status}}}')
            except Exception as e:
                logger.warning(f'{{"event":"keep_alive_error", "error":"{e}"}}')

    _keep_alive_thread = threading.Thread(target=_keep_alive_ping, daemon=True)
    _keep_alive_thread.start()


@app.context_processor
def inject_global_settings():
    return {
        "google_client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "is_production": os.environ.get("FLASK_ENV") == "production" or os.environ.get("PRODUCTION") in ("1", "true")
    }

# Request correlation, security headers, and logging middleware
@app.before_request
def before_request_logging():
    request.start_time = time.time()
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    corr_id = request.headers.get("X-Correlation-ID") or req_id
    request.req_id = req_id
    request.corr_id = corr_id

    # Active session revocation validation: only if user exists and token version differs
    uid = session.get("user_id")
    if uid:
        u = get_user_by_id(uid)
        session_token_ver = session.get("token_version")
        if u and session_token_ver is not None and u.get("token_version", 1) != session_token_ver:
            session.clear()

@app.after_request
def after_request_logging(response):
    response.headers["X-Request-ID"] = getattr(request, "req_id", "")
    response.headers["X-Correlation-ID"] = getattr(request, "corr_id", "")
    
    # Production Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Enterprise Content Security Policy & Permissions Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https: blob:; "
        "media-src 'self' data: blob:; "
        "connect-src 'self' ws: wss: https://accounts.google.com; "
        "frame-src 'self' https://accounts.google.com; "
        "object-src 'none'; "
        "base-uri 'self';"
    )
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # HSTS when served over HTTPS / TLS reverse proxy
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Differentiate static asset vs dynamic API caching
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers.pop("Pragma", None)
        response.headers.pop("Expires", None)
    else:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
    latency_ms = round((time.time() - getattr(request, "start_time", time.time())) * 1000, 2)
    
    # Record Prometheus metrics
    endpoint_name = request.endpoint if request.endpoint else "not_found"
    get_metrics_engine().record_request(request.method, endpoint_name, response.status_code, latency_ms)

    # Don't flood logs with high-frequency polling/static file hits
    if not request.path.startswith("/static/media/"):
        logger.info(
            f'{{"req_id":"{getattr(request, "req_id", "")}", "method":"{request.method}", "path":"{request.path}", "status":{response.status_code}, "latency_ms":{latency_ms}}}'
        )
    return response

# -------------------------------------------------------------
# Static Frontend Multi-Page Routes
# -------------------------------------------------------------
@app.route("/")
def serve_index():
    return render_template("index.html")

@app.route("/play")
@app.route("/play.html")
def serve_play():
    return render_template("play.html")

@app.route("/arsenal")
@app.route("/arsenal.html")
def serve_arsenal():
    return render_template("arsenal.html")

@app.route("/leaderboard")
@app.route("/leaderboard.html")
def serve_leaderboard():
    return render_template("leaderboard.html")

# -------------------------------------------------------------
# Backward-Compatible Legacy Asset Routes (Prevent 404s)
# -------------------------------------------------------------
@app.route("/style.css")
def legacy_style():
    return send_from_directory(os.path.join(STATIC_DIR, "css"), "style.css")

@app.route("/main.js")
def legacy_main_js():
    return send_from_directory(os.path.join(STATIC_DIR, "js"), "main.js")

@app.route("/auth.js")
def legacy_auth_js():
    return send_from_directory(os.path.join(STATIC_DIR, "js"), "auth.js")

@app.route("/game.js")
def legacy_game_js():
    return send_from_directory(os.path.join(STATIC_DIR, "js"), "game.js")

@app.route("/assets/<path:filename>")
def legacy_assets(filename):
    return send_from_directory(os.path.join(STATIC_DIR, "media"), filename)

# -------------------------------------------------------------
# PWA & Offline Engine Routes
# -------------------------------------------------------------
@app.route("/manifest.json")
def serve_manifest():
    response = send_from_directory(STATIC_DIR, "manifest.json", mimetype="application/manifest+json")
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response

@app.route("/sw.js")
def serve_service_worker():
    response = send_from_directory(STATIC_DIR, "sw.js", mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response

# -------------------------------------------------------------
# API Endpoints: Health & Observability
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """Liveness & readiness probe for load balancers, orchestrators, and monitoring."""
    db_ok = False
    db_err = None
    try:
        from backend.database import get_connection
        conn = get_connection()
        row = conn.execute("SELECT 1").fetchone()
        conn.close()
        if row and row[0] == 1:
            db_ok = True
    except Exception as e:
        db_err = str(e)

    uptime_sec = round(time.time() - SERVER_START_TIME, 2)
    status_code = 200 if db_ok else 503
    return jsonify({
        "status": "healthy" if db_ok else "unhealthy",
        "service": "ArChess Authoritative Backend",
        "version": "2.0.0",
        "database": "connected" if db_ok else f"disconnected: {db_err}",
        "uptime_seconds": uptime_sec,
        "active_run": run_dir.replace(os.sep, "/") if run_dir else "",
        "timestamp": time.time()
    }), status_code


@app.route("/api/openapi.json", methods=["GET"])
@app.route("/api/schemas", methods=["GET"])
def get_openapi_schema():
    """Return the authoritative OpenAPI 3.1.0 JSON specification for all API schemas."""
    schema_path = os.path.join(os.path.dirname(__file__), "openapi_schema.json")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            return jsonify(json.load(f)), 200
    return jsonify({"error": "Schema specification not found."}), 404

# -------------------------------------------------------------
# API Endpoints: Authentication & Account Management
# -------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    username = data.get("username", "")
    email = data.get("email", "")
    password = data.get("password", "")

    if not isinstance(username, str) or not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"success": False, "error": "Username, email, and password must be valid strings."}), 400

    success, result = register_user(username, email, password)
    if success:
        session["user_id"] = result["id"]
        session["token_version"] = result.get("token_version", 1)
        return jsonify({"success": True, "user": result}), 201
    return jsonify({"success": False, "error": result}), 400

# Rate limiting for authentication attempts (15 attempts/minute per IP)
_login_rate_limiter = {}
_login_rate_limit_lock = threading.Lock()
LOGIN_ATTEMPTS_LIMIT_PER_MINUTE = 15

def _is_login_rate_limited(ip: str) -> bool:
    if app.config.get("TESTING") and not getattr(app, "_force_login_rate_limit_test", False):
        return False
    now = time.time()
    cutoff = now - 60.0
    with _login_rate_limit_lock:
        timestamps = _login_rate_limiter.get(ip, [])
        valid_ts = [t for t in timestamps if t > cutoff]
        if len(valid_ts) >= LOGIN_ATTEMPTS_LIMIT_PER_MINUTE:
            _login_rate_limiter[ip] = valid_ts
            return True
        valid_ts.append(now)
        _login_rate_limiter[ip] = valid_ts
        return False

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    client_ip = request.remote_addr or "127.0.0.1"
    if _is_login_rate_limited(client_ip):
        get_metrics_engine().inc_security_event("login_rate_limited")
        return jsonify({"success": False, "error": "Too many login attempts. Please wait 1 minute."}), 429

    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    username_or_email = data.get("username_or_email") or data.get("identifier") or data.get("username") or data.get("email") or ""
    password = data.get("password", "")

    if not isinstance(username_or_email, str) or not isinstance(password, str):
        return jsonify({"success": False, "error": "Invalid credentials format."}), 400

    success, result = authenticate_user(username_or_email, password)
    if success:
        session["user_id"] = result["id"]
        session["token_version"] = result.get("token_version", 1)
        return jsonify({"success": True, "user": result}), 200
    return jsonify({"success": False, "error": result}), 401


@app.route("/api/auth/me", methods=["GET"])
def api_me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False, "user": None}), 200
    user = get_user_by_id(user_id)
    if user:
        return jsonify({"authenticated": True, "user": user}), 200
    return jsonify({"authenticated": False, "user": None}), 200

@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@app.route("/api/auth/revoke_sessions", methods=["POST"])
def api_revoke_sessions():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    success, result = revoke_all_user_sessions(user_id)
    if success:
        session.clear()
        get_metrics_engine().inc_security_event("session_revocation")
        return jsonify({"success": True, "message": result}), 200
    return jsonify({"success": False, "error": result}), 400

# -------------------------------------------------------------
# API Endpoints: Account Management & Google Auth
# -------------------------------------------------------------
@app.route("/api/auth/profile", methods=["GET", "PUT"])
def api_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    if request.method == "GET":
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        stats_data = get_user_stats(user["username"])
        return jsonify({"success": True, "user": user, "stats": stats_data.get("stats") if stats_data else None}), 200

    # PUT: Update profile (username, avatar)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    username = data.get("username")
    avatar = data.get("avatar")
    success, result = update_user_profile(user_id, username=username, avatar=avatar)
    if success:
        return jsonify({"success": True, "user": result}), 200
    return jsonify({"success": False, "error": result}), 400


@app.route("/api/auth/password", methods=["PUT"])
def api_update_password():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    success, result = update_user_password(user_id, current_password, new_password)
    if success:
        u = get_user_by_id(user_id)
        if u and "token_version" in u:
            session["token_version"] = u["token_version"]
        return jsonify({"success": True, "message": result}), 200
    return jsonify({"success": False, "error": result}), 400


@app.route("/api/auth/account", methods=["DELETE"])
def api_delete_account():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    success, result = delete_user_account(user_id)
    if success:
        session.pop("user_id", None)
        return jsonify({"success": True, "message": result}), 200
    return jsonify({"success": False, "error": result}), 400


from functools import wraps
import urllib.request
import urllib.parse

def _verify_google_id_token(credential: str, expected_client_id: str = "") -> tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Cryptographically verify Google ID token against Google's public tokeninfo endpoint."""
    if not credential:
        return False, None, "Missing Google ID token."
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
        req = urllib.request.Request(url, headers={"User-Agent": "ArChess-Production-Auth/1.0"})
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            if resp.status == 200:
                claims = json.loads(resp.read().decode("utf-8"))
                if expected_client_id and claims.get("aud") != expected_client_id:
                    return False, None, "Google token audience mismatch."
                if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
                    return False, None, "Invalid Google token issuer."
                if claims.get("email_verified") not in (True, "true"):
                    return False, None, "Google email address has not been verified."
                return True, claims, None
            return False, None, f"Google token verification endpoint returned HTTP {resp.status}."
    except Exception as e:
        return False, None, f"Google token verification connection failed: {str(e)}"

@app.route("/api/auth/google", methods=["POST"])
def api_google_auth():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    credential = data.get("credential")
    google_id = data.get("sub") or data.get("google_id")
    email = data.get("email")
    name = data.get("name")
    avatar = data.get("avatar")

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    is_testing_env = bool(app.config.get("TESTING") or app.config.get("ALLOW_INSECURE_TEST_AUTH") or data.get("demo") is True)

    if credential and isinstance(credential, str):
        # In production with GOOGLE_CLIENT_ID, enforce cryptographic verification with Google's API
        if not is_testing_env and google_client_id:
            valid, claims, err = _verify_google_id_token(credential, google_client_id)
            if not valid or not claims:
                get_metrics_engine().inc_security_event("google_auth_failed")
                return jsonify({"success": False, "error": err or "Google credential verification failed."}), 401
            email = claims.get("email")
            google_id = claims.get("sub")
            name = claims.get("name", name)
        else:
            # Fallback parser for testing / local sandbox environments
            try:
                import base64
                parts = credential.split(".")
                if len(parts) >= 2:
                    payload_part = parts[1]
                    payload_part += "=" * ((4 - len(payload_part) % 4) % 4)
                    payload_bytes = base64.urlsafe_b64decode(payload_part)
                    claims = json.loads(payload_bytes.decode("utf-8"))
                    email = claims.get("email", email)
                    name = claims.get("name", name)
                    google_id = claims.get("sub", google_id)
            except Exception:
                pass

    if not google_id:
        if email and is_testing_env:
            google_id = f"g_{hashlib.sha256(email.encode('utf-8')).hexdigest()[:16]}"
        else:
            return jsonify({"success": False, "error": "Google authentication failed: missing credentials or email."}), 400

    if not email:
        return jsonify({"success": False, "error": "Google authentication requires a valid email."}), 400

    success, result = get_or_create_google_user(google_id, email, name=name, avatar=avatar)
    if success:
        session["user_id"] = result["id"]
        session["token_version"] = result.get("token_version", 1)
        return jsonify({"success": True, "user": result}), 200
    return jsonify({"success": False, "error": result}), 400

# -------------------------------------------------------------
# Admin Access Control & Management Endpoints
# -------------------------------------------------------------
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        uid = session.get("user_id")
        if not uid:
            if request.path.startswith("/api/"):
                return jsonify({"success": False, "error": "Unauthorized: Authentication required."}), 401
            from flask import redirect
            return redirect("/play")
        user = get_user_by_id(uid)
        if not user or not user.get("is_admin"):
            if request.path.startswith("/api/"):
                return jsonify({"success": False, "error": "Forbidden: Administrator privileges required."}), 403
            return render_template("index.html"), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route("/admin")
@admin_required
def serve_admin():
    return render_template("admin.html")

@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def api_admin_stats():
    stats = get_admin_system_stats()
    stats["active_rooms_count"] = len(room_manager.rooms)
    stats["uptime_seconds"] = round(time.time() - SERVER_START_TIME, 1)
    return jsonify({"success": True, "stats": stats}), 200

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def api_admin_users():
    page = request.args.get("page", 1)
    search = request.args.get("search", "")
    data = list_users_admin(page=page, per_page=20, search=search)
    return jsonify({"success": True, **data}), 200

@app.route("/api/admin/users/<int:target_user_id>/role", methods=["POST"])
@admin_required
def api_admin_toggle_role(target_user_id):
    current_uid = session.get("user_id")
    body = request.get_json(silent=True) or {}
    is_admin_flag = bool(body.get("is_admin", False))
    if target_user_id == current_uid and not is_admin_flag:
        return jsonify({"success": False, "error": "Cannot revoke your own administrative privileges."}), 400
    ok, res = set_user_admin_status(target_user_id, is_admin_flag)
    if ok:
        return jsonify({"success": True, "user": res}), 200
    return jsonify({"success": False, "error": res}), 400

@app.route("/api/admin/users/<int:target_user_id>", methods=["DELETE"])
@admin_required
def api_admin_delete_user(target_user_id):
    current_uid = session.get("user_id")
    if target_user_id == current_uid:
        return jsonify({"success": False, "error": "Cannot delete your own administrative account."}), 400
    ok, res = delete_user_account(target_user_id)
    if ok:
        return jsonify({"success": True, "message": res}), 200
    return jsonify({"success": False, "error": res}), 400

@app.route("/api/admin/rooms", methods=["GET"])
@admin_required
def api_admin_rooms():
    rooms = [r.get_summary() for r in room_manager.rooms.values()]
    return jsonify({"success": True, "rooms": rooms}), 200

@app.route("/api/admin/rooms/<room_id>/terminate", methods=["POST"])
@admin_required
def api_admin_terminate_room(room_id):
    room = room_manager.get_room(room_id)
    if not room:
        return jsonify({"success": False, "error": "Room not found."}), 404
    room.status = "finished"
    room.winner = "draw"
    room.broadcast({"type": "game_over", "winner": "draw", "reason": "admin_terminated"})
    return jsonify({"success": True, "message": f"Room {room_id} terminated."}), 200

@app.route("/api/admin/tournament/reset", methods=["POST"])
@admin_required
def api_admin_tournament_reset():
    tournament_engine.initialize_season()
    return jsonify({"success": True, "season": tournament_engine.season, "bracket": tournament_engine.get_summary()}), 200

# -------------------------------------------------------------
# API Endpoints: Leaderboards
# -------------------------------------------------------------
@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    try:
        raw_limit = request.args.get("limit", default=25, type=int)
        if raw_limit is None:
            raw_limit = 25
        limit = max(1, min(raw_limit, 100))
    except (ValueError, TypeError):
        limit = 25

    leaderboard_data = get_leaderboard(limit=limit)
    return jsonify({"success": True, "leaderboard": leaderboard_data}), 200

@app.route("/api/users/<username>/stats", methods=["GET"])
def api_user_stats(username):
    stats_data = get_user_stats(username)
    if not stats_data:
        return jsonify({"success": False, "error": f"Player '{username}' not found."}), 404
    return jsonify({"success": True, **stats_data}), 200


# Rate limiting state for unauthenticated match recording (60 requests/min per IP)
_unauth_match_rate_limiter = {}
_unauth_rate_limit_lock = threading.Lock()
UNAUTH_MATCH_LIMIT_PER_MINUTE = 60
_MAX_RATE_LIMIT_ENTRIES = 5000

def _is_unauth_rate_limited(ip: str) -> bool:
    if app.config.get("TESTING"):
        return False
    now = time.time()
    with _unauth_rate_limit_lock:
        if len(_unauth_match_rate_limiter) > _MAX_RATE_LIMIT_ENTRIES:
            stale_keys = [k for k, v in _unauth_match_rate_limiter.items() if not v or (now - v[-1] > 60)]
            for k in stale_keys:
                _unauth_match_rate_limiter.pop(k, None)
            if len(_unauth_match_rate_limiter) > _MAX_RATE_LIMIT_ENTRIES:
                excess = len(_unauth_match_rate_limiter) - _MAX_RATE_LIMIT_ENTRIES
                for _ in range(excess):
                    _unauth_match_rate_limiter.pop(next(iter(_unauth_match_rate_limiter)), None)

        timestamps = _unauth_match_rate_limiter.get(ip, [])
        cutoff = now - 60
        timestamps = [t for t in timestamps if t > cutoff]
        if len(timestamps) >= UNAUTH_MATCH_LIMIT_PER_MINUTE:
            _unauth_match_rate_limiter[ip] = timestamps
            return True
        timestamps.append(now)
        _unauth_match_rate_limiter[ip] = timestamps
        return False


# -------------------------------------------------------------
# API Endpoints: Match Settlement
# -------------------------------------------------------------
@app.route("/api/matches/record", methods=["POST"])
def api_record_match():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    white = str(data.get("white_username", "Player1")).strip()
    black = str(data.get("black_username", "Player2")).strip()
    winner = str(data.get("winner", "draw")).strip().lower()

    if winner not in ["white", "black", "draw"]:
        return jsonify({"success": False, "error": "Invalid winner value. Must be 'white', 'black', or 'draw'."}), 400

    try:
        white_dmg = max(0, int(data.get("white_damage", 0)))
        black_dmg = max(0, int(data.get("black_damage", 0)))
        turns = max(0, int(data.get("turns", 0)))
        duration = max(0, int(data.get("duration_sec", 0)))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Damage, turns, and duration must be non-negative integers."}), 400

    # Authoritative Anti-Cheat & Physical Bounds Verification
    if white_dmg > 1200 or black_dmg > 1200:
        get_metrics_engine().inc_security_event("anti_cheat_damage")
        return jsonify({"success": False, "error": "Damage values exceed physical simulation boundaries."}), 400

    if turns == 0 and (white_dmg > 0 or black_dmg > 0):
        get_metrics_engine().inc_security_event("anti_cheat_turns")
        return jsonify({"success": False, "error": "Damage cannot be inflicted in zero turns."}), 400

    if turns > 25 and duration < 2:
        get_metrics_engine().inc_security_event("anti_cheat_duration")
        return jsonify({"success": False, "error": "Match duration is too short for the recorded turns."}), 400

    # Rate limiting & authorization check
    guest_white_names = {"Player1", "Guest", "Local"}
    guest_black_names = {"Player2", "ArChess Bot", "Bot", "Local"}
    is_guest_match = (
        white in guest_white_names
        or black in guest_black_names
        or white.lower().startswith("guest")
        or black.lower().startswith("guest")
    )

    user_id = session.get("user_id")
    if user_id:
        current_user = get_user_by_id(user_id)
        if current_user:
            logged_username = current_user["username"]
            is_participant = (logged_username in (white, black))
            if not is_participant and not is_guest_match:
                return jsonify({"success": False, "error": "Unauthorized: Cannot record match results on behalf of other players."}), 403
    else:
        # Rate limit unauthenticated submissions to prevent automated leaderboard manipulation
        client_ip = request.remote_addr or "unknown"
        if _is_unauth_rate_limited(client_ip):
            get_metrics_engine().inc_security_event("match_rate_limited")
            return jsonify({"success": False, "error": "Rate limit exceeded. Please log in or wait before recording more matches."}), 429

    settlement = record_match_result(white, black, winner, white_dmg, black_dmg, turns, duration)
    get_metrics_engine().inc_matches_settled(winner)

    # Evaluate newly unlocked achievements for winner & participants
    white_winner = (winner == "white")
    black_winner = (winner == "black")
    white_unlocked = evaluate_match_achievements(white, {
        "is_winner": white_winner,
        "turns": turns,
        "sudden_death": bool(data.get("sudden_death", False)),
        "is_multiplayer": bool(data.get("is_multiplayer", False)),
        "opponent": black,
        "opponent_elo": int(data.get("black_elo", 0) or 0)
    })
    black_unlocked = evaluate_match_achievements(black, {
        "is_winner": black_winner,
        "turns": turns,
        "sudden_death": bool(data.get("sudden_death", False)),
        "is_multiplayer": bool(data.get("is_multiplayer", False)),
        "opponent": white,
        "opponent_elo": int(data.get("white_elo", 0) or 0)
    })

    return jsonify({
        "success": True,
        "settlement": settlement,
        "newly_unlocked_achievements": white_unlocked + black_unlocked,
        "message": "Match recorded and ELO updated"
    }), 200

# -------------------------------------------------------------
# API Endpoints: Commander Achievements & Badges (v3.2.0)
# -------------------------------------------------------------
@app.route("/api/achievements", methods=["GET"])
def api_achievements():
    return jsonify({"success": True, "achievements": get_all_achievements()}), 200

@app.route("/api/users/<username>/achievements", methods=["GET"])
def api_user_achievements(username):
    user_achs = get_user_achievements(username)
    return jsonify({"success": True, "username": username, "achievements": user_achs}), 200

@app.route("/api/matches/<int:match_id>", methods=["GET"])
def api_get_match(match_id):
    match_data = get_match_by_id(match_id)
    if not match_data:
        return jsonify({"success": False, "error": f"Match #{match_id} not found."}), 404
    return jsonify({"success": True, "match": match_data}), 200

@app.route("/api/matches/<int:match_id>/pgn", methods=["GET"])
def api_get_match_pgn(match_id):
    match_data = get_match_by_id(match_id)
    if not match_data:
        return jsonify({"success": False, "error": f"Match #{match_id} not found."}), 404
    pgn_text = generate_pgn(match_data)
    if request.args.get("format") == "json":
        return jsonify({"success": True, "match_id": match_id, "pgn": pgn_text}), 200
    res = Response(pgn_text, mimetype="text/plain; charset=utf-8")
    res.headers["Content-Disposition"] = f'attachment; filename="archess_match_{match_id}.pgn"'
    return res

@app.route("/api/matches/<int:match_id>/fen", methods=["GET"])
def api_get_match_fen(match_id):
    match_data = get_match_by_id(match_id)
    if not match_data:
        return jsonify({"success": False, "error": f"Match #{match_id} not found."}), 404
    fen_str = generate_fen(match_data.get("winner", "white"), match_data.get("turns", 1))
    return jsonify({"success": True, "match_id": match_id, "fen": fen_str}), 200

# -------------------------------------------------------------
# API Endpoints: Telemetry Persistence
# -------------------------------------------------------------
@app.route("/api/telemetry", methods=["POST"])
def api_telemetry():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    corr_id = getattr(request, "corr_id", str(uuid.uuid4()))
    event_type = str(data.get("event_type", "tactical_event"))[:64]
    payload = data.get("payload", {})

    log_telemetry_event(corr_id, event_type, payload)
    return jsonify({"success": True, "recorded": True}), 200

# -------------------------------------------------------------
# Real-Time Multiplayer Room & Matchmaking REST Endpoints
# -------------------------------------------------------------
@app.route("/api/multiplayer/rooms/create", methods=["POST"])
def api_create_room():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "Commander"))[:30]
    room = room_manager.create_room(username)
    return jsonify({"success": True, "room_id": room.room_id, "room": room.get_summary()}), 201

@app.route("/api/multiplayer/rooms/<room_id>", methods=["GET"])
def api_get_room(room_id):
    room = room_manager.get_room(room_id.upper())
    if not room:
        return jsonify({"success": False, "error": f"Room {room_id} not found."}), 404
    return jsonify({"success": True, "room": room.get_summary()}), 200

@app.route("/api/multiplayer/quick_match", methods=["POST"])
def api_quick_match():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "Commander"))[:30]
    room = room_manager.find_quick_match(username)
    role = "black" if room.white_player and room.white_player.get("username") != username else "white"
    return jsonify({"success": True, "room_id": room.room_id, "role": role, "room": room.get_summary()}), 200

# -------------------------------------------------------------
# Live Matchmaking Queue REST Endpoints
# -------------------------------------------------------------
@app.route("/api/matchmaking/join", methods=["POST"])
def api_matchmaking_join():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    username = str(data.get("username", "Commander"))[:30]
    elo = data.get("elo", 1200)
    mode = str(data.get("mode", "3d-arena"))
    pref_role = data.get("preferred_role")

    ticket = matchmaking_queue.join_queue(username, elo=elo, mode=mode, preferred_role=pref_role)
    return jsonify({"success": True, "ticket": ticket.to_dict()}), 200

@app.route("/api/matchmaking/ticket/<ticket_id>", methods=["GET"])
def api_matchmaking_ticket(ticket_id):
    ticket_data = matchmaking_queue.get_ticket(ticket_id)
    if not ticket_data:
        return jsonify({"success": False, "error": "Ticket not found or expired"}), 404
    return jsonify({"success": True, "ticket": ticket_data}), 200

@app.route("/api/matchmaking/ticket/<ticket_id>", methods=["DELETE"])
def api_matchmaking_cancel(ticket_id):
    cancelled = matchmaking_queue.cancel_ticket(ticket_id)
    return jsonify({"success": True, "cancelled": cancelled}), 200

@app.route("/api/matchmaking/stats", methods=["GET"])
def api_matchmaking_stats():
    return jsonify({"success": True, "stats": matchmaking_queue.get_stats()}), 200

# -------------------------------------------------------------
# Knockout Tournament Championship Bracket Endpoints (v3.1.0)
# -------------------------------------------------------------
@app.route("/api/tournament/bracket", methods=["GET"])
def api_tournament_bracket():
    return jsonify({"success": True, "tournament": tournament_engine.get_summary()}), 200

@app.route("/api/tournament/simulate", methods=["POST"])
def api_tournament_simulate():
    summary = tournament_engine.advance_round()
    return jsonify({"success": True, "tournament": summary, "message": f"Advanced to {summary['status'].upper()}"}), 200

@app.route("/api/tournament/reset", methods=["POST"])
def api_tournament_reset():
    data = request.get_json(silent=True) or {}
    season_num = data.get("season")
    tournament_engine.initialize_season(season_num)
    return jsonify({"success": True, "tournament": tournament_engine.get_summary(), "message": "Season reset"}), 200

# -------------------------------------------------------------
# Real-Time Multiplayer WebSocket Stream
# -------------------------------------------------------------
def handle_combat_websocket(ws, room_id):
    clean_rid = str(room_id).upper()
    room = room_manager.get_room(clean_rid)
    if not room:
        try:
            ws.send(json.dumps({"type": "error", "message": f"Room {clean_rid} not found."}))
            ws.close()
        except Exception:
            pass
        return

    # Await initial join handshake: {"type": "join", "username": "...", "preferred_role": "..."}
    assigned_role = "spectator"
    username = "Anonymous"
    try:
        raw_initial = ws.receive(timeout=10.0)
        if not raw_initial:
            return
        init_data = json.loads(raw_initial)
        username = str(init_data.get("username", "Commander"))[:30]
        pref_role = init_data.get("preferred_role")
        assigned_role = room.add_connection(ws, username, pref_role)
        get_metrics_engine().inc_websocket_connections()
    except Exception:
        return

    # Broadcast room state to all room occupants
    room.broadcast({
        "type": "room_state",
        "room": room.get_summary(),
        "event": f"{username} joined as {assigned_role.upper()}"
    })

    # Direct handshake confirmation to the connected client
    try:
        ws.send(json.dumps({
            "type": "handshake_ok",
            "role": assigned_role,
            "username": username,
            "room_id": clean_rid,
            "room": room.get_summary()
        }))
    except Exception:
        pass

    # Message listening loop
    try:
        while True:
            msg_raw = ws.receive()
            if msg_raw is None:
                break
            room.handle_message(ws, assigned_role, msg_raw)
    except Exception:
        pass
    finally:
        get_metrics_engine().dec_websocket_connections()
        departed = room.remove_connection(ws)
        if departed in ("white", "black"):
            room.broadcast({
                "type": "opponent_disconnected",
                "role": departed,
                "room": room.get_summary()
            })


def ws_combat(ws, room_id):
    return handle_combat_websocket(ws, room_id)

sock.route("/ws/combat/<room_id>")(ws_combat)

# -------------------------------------------------------------
# Enterprise Observability & Prometheus Metrics Endpoint
# -------------------------------------------------------------
@app.route("/metrics", methods=["GET"])
def serve_prometheus_metrics():
    """Expose server performance, room, and game metrics in standard Prometheus exposition format."""
    metrics_text = get_metrics_engine().export_metrics()
    return Response(metrics_text, mimetype="text/plain; version=0.0.4; charset=utf-8")


# -------------------------------------------------------------
# AI, Agentic AI, RAG & Prompt Engineering Routes
# -------------------------------------------------------------
@app.route("/api/ai/status", methods=["GET"])
def api_ai_status():
    return jsonify({
        "success": True,
        "status": "online",
        "rag_documents_indexed": len(global_rag_engine.documents),
        "available_personas": list(PromptCatalog.PERSONAS.keys()),
        "active_model": global_coach_agent.llm.model_name
    }), 200


@app.route("/api/ai/personas", methods=["GET"])
def api_ai_personas():
    return jsonify({
        "success": True,
        "personas": PromptCatalog.PERSONAS
    }), 200


@app.route("/api/ai/coach/recommend", methods=["POST"])
def api_ai_coach_recommend():
    data = request.get_json(silent=True) or {}
    board_state = data.get("board_state", [])
    active_turn = data.get("turn", "white")
    persona = data.get("persona", "magnus")
    difficulty = int(data.get("difficulty", 3))
    
    if not isinstance(board_state, list):
        return jsonify({"success": False, "error": "board_state must be a list of pieces"}), 400
    
    recommendation = global_coach_agent.recommend_move(
        board_state,
        active_turn=active_turn,
        persona=persona,
        difficulty=difficulty
    )
    return jsonify(recommendation), 200 if recommendation.get("success", False) else 400


@app.route("/api/ai/rag/query", methods=["POST"])
def api_ai_rag_query():
    data = request.get_json(silent=True) or {}
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"success": False, "error": "Missing or empty query parameter"}), 400
    
    top_k = min(10, max(1, int(data.get("top_k", 3))))
    results = global_rag_engine.search(query, top_k=top_k)
    return jsonify({
        "success": True,
        "query": query,
        "count": len(results),
        "results": results
    }), 200


@app.route("/api/ai/match/debrief", methods=["POST"])
def api_ai_match_debrief():
    data = request.get_json(silent=True) or {}
    match_id = data.get("match_id")
    match_data = None
    if match_id:
        match_data = get_match_by_id(match_id)
    if not match_data:
        match_data = data.get("match_data") or data
    
    persona = data.get("persona", "magnus")
    debrief = global_debrief_agent.generate_debrief(match_data, persona=persona)
    return jsonify(debrief), 200


@app.route("/api/ai/shoutcast", methods=["POST"])
def api_ai_shoutcast():
    data = request.get_json(silent=True) or {}
    event = data.get("event") or data
    commentary = global_shoutcaster_agent.generate_commentary(event)
    return jsonify({
        "success": True,
        "commentary": commentary
    }), 200


# -------------------------------------------------------------
# Global API Error Handlers
# -------------------------------------------------------------
@app.errorhandler(404)
def handle_404_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "API route not found"}), 404
    return render_template("index.html"), 404

@app.errorhandler(500)
def handle_500_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "Internal server error"}), 500
    return render_template("index.html"), 500

