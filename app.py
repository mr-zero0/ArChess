import os

from flask import Flask, jsonify, render_template, request

from config import DevelopmentConfig, ProductionConfig
from extensions import db, migrate, limiter
from game import BOARD_SIZE, GAME_CONFIG, PIECE_STATS
from logging_config import configure_logging
from rooms import create_room

VERSION = "v0.5.2"


def create_app(config_object=DevelopmentConfig):
    application = Flask(__name__)
    application.config.from_object(config_object)
    if config_object is ProductionConfig and not os.environ.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY must be set in production")
    
    # Initialize extensions
    db.init_app(application)
    migrate.init_app(application, db)
    limiter.init_app(application)

    
    configure_logging(application)

    @application.get("/")
    def index():
        return render_template("index.html")

    @application.get("/api/game/config")
    def game_config():
        return jsonify(
            {
                "version": VERSION,
                "boardSize": BOARD_SIZE,
                "pieceStats": PIECE_STATS,
                "gameConfig": GAME_CONFIG,
            }
        )

    @application.get("/api/version")
    def get_version():
        return jsonify({"version": VERSION})

    @application.get("/api/health")
    def health_check():
        return jsonify({"status": "ok", "version": VERSION})
    @limiter.limit("5 per minute")


    @application.post("/api/rooms")
    def create_game_room():
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        if not isinstance(guest_id, str) or not guest_id.strip() or len(guest_id) > 100:
            return jsonify({"error": "invalid_guest_id", "message": "A valid guestId is required"}), 400
        return jsonify(create_room(guest_id.strip())), 201

    @application.route("/api/rooms/<room_code>/hp", methods=['POST', 'GET'])
    def hp_sync_handler(room_code):
        if request.method == 'POST':
            return sync_hp(room_code)
        return get_hp_state(room_code)

    @application.post("/api/rooms/<room_code>/hp")
    def sync_hp(room_code):
        from game.models import Room
        payload = request.get_json(silent=True) or {}
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404

        # Update piece HP state
        room.last_hp_state = str(payload.get("hpState", {}))
        db.session.commit()
        return jsonify({"status": "hp_synchronized"}), 200

    @application.get("/api/rooms/<room_code>/hp")
    def get_hp_state(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404

        return jsonify({"hpState": room.last_hp_state}), 200


    @application.route("/api/rooms/<room_code>/destruction", methods=['POST', 'GET'])
    def destruction_sync_handler(room_code):
        if request.method == 'POST':
            return sync_destruction(room_code)
        return get_destruction_state(room_code)

    @application.post("/api/rooms/<room_code>/destruction")
    def sync_destruction(room_code):
        from game.models import Room
        payload = request.get_json(silent=True) or {}
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        # Log destruction event for synchronization
        room.last_destruction_event = str(payload.get("destructionEvent", {}))
        db.session.commit()
        return jsonify({"status": "destruction_synchronized"}), 200

    @application.get("/api/rooms/<room_code>/destruction")
    def get_destruction_state(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        return jsonify({"destructionEvent": room.last_destruction_event}), 200

    @application.route("/api/rooms/<room_code>/sync", methods=['POST', 'GET'])
    def sync_physics_handler(room_code):
        if request.method == 'POST':
            return sync_physics(room_code)
        return get_physics_state(room_code)

    @application.post("/api/rooms/<room_code>/sync")
    def sync_physics(room_code):
        # Accepts physics snapshot and broadcasts to room
        # For MVP, we'll store the last state in the room
        from game.models import Room
        payload = request.get_json(silent=True) or {}
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        # Store state (simplified as JSON)
        room.last_physics_state = str(payload.get("state", {}))
        # Keep canonical state snapshot for replay validation
        room.canonical_state = room.last_physics_state
        db.session.commit()
        return jsonify({"status": "synchronized"}), 200

    @application.get("/api/rooms/<room_code>/sync")
    def get_physics_state(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        return jsonify({"state": room.last_physics_state}), 200

    @application.post("/api/rooms/<room_code>/launch")
    def launch_piece(room_code):
        from game.models import Room, User
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        launch_data = payload.get("launchData") # e.g., {'pieceId': '...', 'vector': {...}}

        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        # Verify it's the player's turn
        user = User.query.filter_by(guest_id=guest_id).first()
        if not user or user.room_id != room.id:
            return jsonify({"error": "unauthorized"}), 403
            
        team = 'white' if user.id == room.white_player_id else 'black'
        if room.current_turn != team:
            return jsonify({"error": "not_your_turn"}), 403
        
        # Validate launch data to prevent cheating
        import math
        import json
        
        def log_invalid_action(reason):
            log_entry = json.dumps({"reason": reason, "guestId": guest_id, "data": launch_data})
            room.invalid_action_log = (room.invalid_action_log + "\n" + log_entry) if room.invalid_action_log else log_entry
            db.session.commit()
            return jsonify({"error": "invalid_action", "reason": reason}), 400

        if not launch_data or not isinstance(launch_data, dict):
            return log_invalid_action("Missing or invalid launchData")
            
        piece_id = launch_data.get("pieceId")
        if not isinstance(piece_id, str):
            return log_invalid_action("Invalid pieceId")
            
        if not piece_id.startswith(f"{team}_"):
            return log_invalid_action(f"Cannot launch opponent piece: {piece_id}")
            
        vector = launch_data.get("vector")
        if not isinstance(vector, dict) or "x" not in vector or ("y" not in vector and "z" not in vector):
            return log_invalid_action("Invalid launch vector format")
            
        vx = float(vector.get("x", 0))
        vz = float(vector.get("z", vector.get("y", 0)))
        
        speed = math.sqrt(vx*vx + vz*vz)
        if speed > GAME_CONFIG["maxLaunchSpeed"] + 0.1: # 0.1 epsilon
            return log_invalid_action(f"Launch speed {speed} exceeds maximum {GAME_CONFIG['maxLaunchSpeed']}")
            
        room.current_turn = 'black' if room.current_turn == 'white' else 'white'
        
        # Log valid shot
        shot_log = json.dumps({"guestId": guest_id, "pieceId": piece_id, "vx": vx, "vz": vz})
        room.match_log = (room.match_log + "\n" + shot_log) if room.match_log else shot_log
        
        db.session.commit()
        
        return jsonify({"status": "success", "nextTurn": room.current_turn}), 200

    @application.route("/api/rooms/<room_code>/gameover", methods=['POST', 'GET'])
    def gameover_sync_handler(room_code):
        if request.method == 'POST':
            return sync_gameover(room_code)
        return get_gameover_state(room_code)

    @application.post("/api/rooms/<room_code>/gameover")
    def sync_gameover(room_code):
        from game.models import Room
        payload = request.get_json(silent=True) or {}
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        # Log game-over event for synchronization
        room.status = 'finished'
        room.last_gameover_event = str(payload.get("gameOverEvent", {}))
        db.session.commit()
        return jsonify({"status": "gameover_synchronized"}), 200

    @application.get("/api/rooms/<room_code>/gameover")
    def get_gameover_state(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        return jsonify({"gameOverEvent": room.last_gameover_event}), 200

    @application.get("/api/rooms/<room_code>/turn")
    def get_turn(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        return jsonify({"currentTeam": room.current_turn}), 200

    @application.post("/api/rooms/<room_code>/start")
    def start_game_room(room_code):
        from game.models import Room
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        if len(room.players) < 2:
            return jsonify({"error": "insufficient_players"}), 400
            
        room.status = 'active'
        db.session.commit()
        
        return jsonify(room.to_dict()), 200

    @application.post("/api/rooms/<room_code>/join")
    def join_game_room(room_code):
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        if not isinstance(guest_id, str) or not guest_id.strip() or len(guest_id) > 100:
            return jsonify({"error": "invalid_guest_id", "message": "A valid guestId is required"}), 400
        
        # logic to join room
        from game.models import Room, User
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
             return jsonify({"error": "room_not_found"}), 404
        
        user = User.query.filter_by(guest_id=guest_id).first()
        if not user:
            user = User(guest_id=guest_id)
            db.session.add(user)
            db.session.flush()
        
        if len(room.players) >= 2:
            return jsonify({"error": "room_full"}), 403
            
        user.room = room
        if not room.black_player_id:
            room.black_player_id = user.id
        db.session.commit()
        
        return jsonify(room.to_dict()), 200

    @application.post("/api/rooms/<room_code>/reconnect")
    def reconnect_room(room_code):
        from game.models import Room, User
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        user = User.query.filter_by(guest_id=guest_id).first()
        if not user or user.room_id != room.id:
            return jsonify({"error": "unauthorized"}), 403
            
        return jsonify({
            "status": "reconnected",
            "room": room.to_dict(),
            "physicsState": room.last_physics_state,
            "hpState": room.last_hp_state,
            "destructionEvent": room.last_destruction_event,
            "gameOverEvent": room.last_gameover_event,
            "currentTurn": room.current_turn
        }), 200

    @application.post("/api/rooms/<room_code>/rematch")
    def rematch_room(room_code):
        from game.models import Room, User
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
        
        user = User.query.filter_by(guest_id=guest_id).first()
        if not user or user.room_id != room.id:
            return jsonify({"error": "unauthorized"}), 403
            
        room.status = 'active'
        room.current_turn = 'white'
        room.last_physics_state = None
        room.last_hp_state = None
        room.last_destruction_event = None
        room.last_gameover_event = None
        db.session.commit()
        
        return jsonify({"status": "rematch_started", "room": room.to_dict()}), 200

    @application.post("/api/rooms/<room_code>/disconnect")
    def disconnect_room(room_code):
        from game.models import Room, User
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        room = Room.query.filter_by(room_code=room_code).first()
        if not room:
            return jsonify({"error": "room_not_found"}), 404
            
        user = User.query.filter_by(guest_id=guest_id).first()
        if user and user.room_id == room.id:
            user.room_id = None
            room.status = 'finished'
            db.session.commit()
            return jsonify({"status": "disconnected"}), 200
        
        return jsonify({"error": "unauthorized"}), 403

    @application.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "not_found", "message": "Resource not found"}), 404

    @application.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "internal_server_error", "message": "Internal server error"}), 500

    @application.errorhandler(413)
    def request_too_large(error):
        return jsonify({"error": "request_too_large", "message": "Request payload is too large"}), 413

    @application.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

    @application.before_request
    def validate_api_request():
        if request.content_length and request.content_length > application.config["MAX_CONTENT_LENGTH"]:
            return jsonify({"error": "request_too_large", "message": "Request payload is too large"}), 413
        if request.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH"}:
            if request.content_length and not request.is_json:
                return jsonify({"error": "json_required", "message": "JSON request body required"}), 415
        return None

    # Backward-compatible alias for the starter project.
    @application.get("/api/config")
    def legacy_config():
        return game_config()

    return application


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
