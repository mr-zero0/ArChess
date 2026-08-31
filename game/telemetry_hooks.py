import time

from flask import g, request
from flask.signals import got_request_exception, request_finished, request_started
from sqlalchemy import event

from game.telemetry import record_event


def register_telemetry_hooks(room_model):
    if getattr(room_model, "_archess_telemetry_hooks", False):
        return

    @event.listens_for(room_model, "after_update")
    def room_status_telemetry(mapper, connection, target):
        if target.status == "active":
            record_event("room_started", room_id=target.id, payload={"status": "active"})
        elif target.status == "finished":
            record_event("room_finished", room_id=target.id, payload={"status": "finished"})

    @request_started.connect
    def _request_started(sender, **_):
        g.archess_request_started = time.perf_counter()

    @request_finished.connect
    def _request_finished(sender, response, **_):
        path = request.path
        if path.startswith("/static/") or path.startswith("/api/analytics/"):
            return response
        started = getattr(g, "archess_request_started", None)
        if started is not None:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            if duration_ms >= 1000 and path.startswith("/api/"):
                record_event(
                    "game_error",
                    payload={"kind": "slow_request", "path": path, "method": request.method, "durationMs": duration_ms},
                    commit=True,
                )
        return response

    @got_request_exception.connect
    def _request_exception(sender, exception, **_):
        path = request.path
        if path.startswith("/api/analytics/") or path.startswith("/static/"):
            return
        record_event(
            "game_error",
            payload={"kind": "exception", "path": path, "method": request.method, "exception": type(exception).__name__},
            commit=True,
        )

    room_model._archess_telemetry_hooks = True
