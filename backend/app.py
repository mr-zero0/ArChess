"""
ARCHESS - Full Flask Backend Application
Serves the Minimalist Multi-Page Web Application, REST APIs for Authentication,
Leaderboards, Game Match Settlement, Telemetry, and Tracker-Compliant Structured Logging.
"""

import os
import uuid
import time
from flask import Flask, request, jsonify, session, render_template, send_from_directory
from flask_cors import CORS

from backend.logger import setup_logging
from backend.database import (
    init_db,
    register_user,
    authenticate_user,
    get_user_by_id,
    get_leaderboard,
    record_match_result,
    log_telemetry_event
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

logger, run_dir = setup_logging("ArChess")

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)
app.secret_key = os.environ.get("SECRET_KEY", "archess_tactical_secret_key_2026_x9")
CORS(app, supports_credentials=True)

# Initialize database schema and seeds
init_db()

# Request correlation and logging middleware
@app.before_request
def before_request_logging():
    request.start_time = time.time()
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    corr_id = request.headers.get("X-Correlation-ID") or req_id
    request.req_id = req_id
    request.corr_id = corr_id

@app.after_request
def after_request_logging(response):
    response.headers["X-Request-ID"] = getattr(request, "req_id", "")
    response.headers["X-Correlation-ID"] = getattr(request, "corr_id", "")
    latency_ms = round((time.time() - getattr(request, "start_time", time.time())) * 1000, 2)
    
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
# API Endpoints: Health & Observability
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "ArChess Authoritative Backend",
        "version": "2.0.0",
        "active_run": run_dir.replace(os.sep, "/")
    })

# -------------------------------------------------------------
# API Endpoints: Authentication & Account Management
# -------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json() or {}
    username = data.get("username", "")
    email = data.get("email", "")
    password = data.get("password", "")

    success, result = register_user(username, email, password)
    if success:
        session["user_id"] = result["id"]
        return jsonify({"success": True, "user": result}), 201
    return jsonify({"success": False, "error": result}), 400

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    username_or_email = data.get("username_or_email") or data.get("identifier") or ""
    password = data.get("password", "")

    success, result = authenticate_user(username_or_email, password)
    if success:
        session["user_id"] = result["id"]
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
    session.pop("user_id", None)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

# -------------------------------------------------------------
# API Endpoints: Leaderboards
# -------------------------------------------------------------
@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    limit = request.args.get("limit", default=25, type=int)
    leaderboard_data = get_leaderboard(limit=min(limit, 100))
    return jsonify({"success": True, "leaderboard": leaderboard_data}), 200

# -------------------------------------------------------------
# API Endpoints: Match Settlement
# -------------------------------------------------------------
@app.route("/api/matches/record", methods=["POST"])
def api_record_match():
    data = request.get_json() or {}
    white = data.get("white_username", "Player1")
    black = data.get("black_username", "Player2")
    winner = data.get("winner", "draw")
    white_dmg = data.get("white_damage", 0)
    black_dmg = data.get("black_damage", 0)
    turns = data.get("turns", 0)
    duration = data.get("duration_sec", 0)

    record_match_result(white, black, winner, white_dmg, black_dmg, turns, duration)
    return jsonify({"success": True, "message": "Match recorded and ELO updated"}), 200

# -------------------------------------------------------------
# API Endpoints: Telemetry Persistence
# -------------------------------------------------------------
@app.route("/api/telemetry", methods=["POST"])
def api_telemetry():
    data = request.get_json() or {}
    corr_id = getattr(request, "corr_id", str(uuid.uuid4()))
    event_type = data.get("event_type", "tactical_event")
    payload = data.get("payload", {})

    log_telemetry_event(corr_id, event_type, payload)
    return jsonify({"success": True, "recorded": True}), 200
