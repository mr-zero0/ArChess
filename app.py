import os

from flask import Flask, jsonify, render_template, request

from config import DevelopmentConfig, ProductionConfig
from extensions import db, migrate
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

    @application.post("/api/rooms")
    def create_game_room():
        payload = request.get_json(silent=True) or {}
        guest_id = payload.get("guestId")
        if not isinstance(guest_id, str) or not guest_id.strip() or len(guest_id) > 100:
            return jsonify({"error": "invalid_guest_id", "message": "A valid guestId is required"}), 400
        return jsonify(create_room(guest_id.strip())), 201

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
