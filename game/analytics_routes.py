import os

from flask import jsonify, request
from flask.signals import appcontext_pushed


def register_analytics_routes():
    from game.telemetry import summary

    def _register(sender, **_):
        if sender.extensions.get("archess_analytics_routes_registered"):
            return

        def analytics_summary():
            configured_key = sender.config.get("ANALYTICS_API_KEY") or os.environ.get("ANALYTICS_API_KEY")
            supplied_key = request.headers.get("X-Analytics-Key")
            if not configured_key or supplied_key != configured_key:
                return jsonify({"error": "analytics_unauthorized"}), 401
            raw_days = request.args.get("days", "7")
            try:
                days = int(raw_days)
            except (TypeError, ValueError):
                return jsonify({"error": "invalid_days"}), 400
            if days < 1 or days > 90:
                return jsonify({"error": "invalid_days"}), 400
            return jsonify(summary(days)), 200

        sender.add_url_rule(
            "/api/analytics/summary",
            endpoint="analytics_summary",
            view_func=analytics_summary,
            methods=["GET"],
        )
        sender.extensions["archess_analytics_routes_registered"] = True

    appcontext_pushed.connect(_register, weak=False)


register_analytics_routes()
