"""
ARCHESS - Full Flask Backend Application
Serves the Minimalist Multi-Page Web Application, REST APIs for Authentication,
Leaderboards, Game Match Settlement, Telemetry, and Tracker-Compliant Structured Logging.
"""

import os
import uuid
import time
import json
from flask import Flask, request, jsonify, session, render_template, send_from_directory, Response
from flask_cors import CORS
from flask_sock import Sock

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
    log_telemetry_event
)
from backend.multiplayer import room_manager
from backend.tournament import tournament_engine
from backend.achievements import (
    get_all_achievements,
    get_user_achievements,
    evaluate_match_achievements
)
from backend.notation import generate_pgn, generate_fen

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
sock = Sock(app)

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
        return jsonify({"success": True, "user": result}), 201
    return jsonify({"success": False, "error": result}), 400

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "Invalid JSON payload."}), 400

    username_or_email = data.get("username_or_email") or data.get("identifier") or ""
    password = data.get("password", "")

    if not isinstance(username_or_email, str) or not isinstance(password, str):
        return jsonify({"success": False, "error": "Invalid credentials format."}), 400

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

    # Authorization check: prevent unauthorized tampering with third-party registered ratings
    user_id = session.get("user_id")
    if user_id:
        current_user = get_user_by_id(user_id)
        if current_user:
            logged_username = current_user["username"]
            is_participant = (logged_username in (white, black))
            is_guest_match = (white in ("Player1", "Guest", "Local") or black in ("Player2", "ArChess Bot", "Bot", "Local"))
            if not is_participant and not is_guest_match:
                return jsonify({"success": False, "error": "Unauthorized: Cannot record match results on behalf of other players."}), 403

    settlement = record_match_result(white, black, winner, white_dmg, black_dmg, turns, duration)

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

