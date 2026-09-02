from flask import jsonify, request
from flask.signals import appcontext_pushed
import json


def register_ranked_routes():
    from core.extensions import db
    from game.leaderboard import get_leaderboard, ranked_profile
    from game.models import Room, User
    from game.progression import equip_cosmetic, progression_profile
    from game.ranked import TIERS
    from game.telemetry import record_event

    def _register(sender, **_):
        if sender.extensions.get("archess_ranked_routes_registered"):
            return

        def leaderboard():
            raw_limit = request.args.get("limit", "50")
            try:
                limit = int(raw_limit)
            except (TypeError, ValueError):
                return jsonify({"error": "invalid_limit", "message": "limit must be an integer"}), 400
            if limit < 1 or limit > 100:
                return jsonify({"error": "invalid_limit", "message": "limit must be between 1 and 100"}), 400
            return jsonify({"items": get_leaderboard(limit)}), 200

        def profile(guest_id):
            user = User.query.filter_by(guest_id=guest_id).first()
            if user is None:
                return jsonify({"error": "user_not_found"}), 404
            return jsonify(ranked_profile(user)), 200

        def tiers():
            return jsonify({
                "tiers": [
                    {"minMmr": 0 if index == 0 else int(TIERS[index - 1][0]), "name": name}
                    for index, (_, name) in enumerate(TIERS)
                ]
            }), 200

        def progression(guest_id):
            user = User.query.filter_by(guest_id=guest_id).first()
            if user is None:
                return jsonify({"error": "user_not_found"}), 404
            return jsonify(progression_profile(user)), 200

        def equip():
            payload = request.get_json(silent=True) or {}
            guest_id = payload.get("guestId")
            cosmetic_id = payload.get("cosmeticId")
            if not isinstance(guest_id, str) or not guest_id.strip():
                return jsonify({"error": "invalid_guest_id"}), 400
            if not isinstance(cosmetic_id, str) or not cosmetic_id.strip():
                return jsonify({"error": "invalid_cosmetic_id"}), 400
            user = User.query.filter_by(guest_id=guest_id.strip()).first()
            if user is None:
                return jsonify({"error": "user_not_found"}), 404
            try:
                result = equip_cosmetic(user, cosmetic_id.strip())
            except ValueError as exc:
                reason = str(exc)
                status = 404 if reason == "unknown_cosmetic" else 403
                return jsonify({"error": reason}), status
            record_event("cosmetic_equip", guest_id=user.guest_id, payload={"cosmeticId": cosmetic_id.strip()}, commit=False)
            db.session.commit()
            return jsonify(result), 200

        def disconnect(room_code):
            payload = request.get_json(silent=True) or {}
            guest_id = payload.get("guestId")
            reason = payload.get("reason") or "abandonment"
            if not isinstance(guest_id, str) or not guest_id.strip() or len(guest_id) > 100:
                return jsonify({"error": "invalid_guest_id", "message": "A valid guestId is required"}), 400
            if reason not in {"surrender", "timeout", "abandonment"}:
                return jsonify({"error": "invalid_reason", "message": "Invalid disconnect reason"}), 400
            room = Room.query.filter_by(room_code=room_code).first()
            if room is None:
                return jsonify({"error": "room_not_found"}), 404
            if room.status != "active":
                return jsonify({"error": "room_not_active"}), 409
            user = User.query.filter_by(guest_id=guest_id.strip()).first()
            if user is None or user.room_id != room.id:
                return jsonify({"error": "unauthorized"}), 403
            user.room_id = None
            room.status = "finished"
            disconnect_record = json.dumps({"type": "ranked_disconnect", "guestId": guest_id.strip(), "reason": reason}, separators=(",", ":"))
            room.match_log = disconnect_record if not room.match_log else room.match_log + "\n" + disconnect_record
            db.session.commit()
            return jsonify({"status": "disconnected", "reason": reason, "room": room.to_dict()}), 200

        sender.add_url_rule("/api/ranked/leaderboard", endpoint="ranked_leaderboard", view_func=leaderboard, methods=["GET"])
        sender.add_url_rule("/api/ranked/profile/<guest_id>", endpoint="ranked_profile", view_func=profile, methods=["GET"])
        sender.add_url_rule("/api/ranked/tiers", endpoint="ranked_tiers", view_func=tiers, methods=["GET"])
        sender.add_url_rule("/api/progression/profile/<guest_id>", endpoint="progression_profile", view_func=progression, methods=["GET"])
        sender.add_url_rule("/api/progression/equip", endpoint="progression_equip", view_func=equip, methods=["POST"])
        sender.add_url_rule("/api/rooms/<room_code>/disconnect", endpoint="room_disconnect", view_func=disconnect, methods=["POST"])
        sender.extensions["archess_ranked_routes_registered"] = True

    appcontext_pushed.connect(_register, weak=False)


register_ranked_routes()
