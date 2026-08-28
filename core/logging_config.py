from __future__ import annotations

import contextvars
import json
import logging
import os
import re
import shutil
import sys
import threading
import time
import traceback
from datetime import datetime, timedelta, timezone
from logging import Handler, LogRecord
from pathlib import Path

from flask import jsonify, request
from werkzeug.exceptions import HTTPException

_RUN_ID = contextvars.ContextVar("archess_run_id", default="uninitialized")
_REQUEST_ID = contextvars.ContextVar("archess_request_id", default="unknown")
_CORRELATION_ID = contextvars.ContextVar("archess_correlation_id", default="unknown")
_GAME_ID = contextvars.ContextVar("archess_game_id", default=None)
_ROOM_ID = contextvars.ContextVar("archess_room_id", default=None)

_ACTIVE_RUN_ID = "uninitialized"
_ACTIVE_RUN_DIR: Path | None = None
_BROWSER_LOG_PATH: Path | None = None
_BROWSER_LOG_LOCK = threading.RLock()

_REDACT_KEYS = re.compile(r"password|passwd|secret|token|authorization|cookie|session|credential|private.?key", re.IGNORECASE)
_APPLICATION_ROOTS = ("game", "core", "config", "match_sessions")
_IGNORED_MODULES = ("core.logging_config", "logging", "werkzeug", "urllib3", "sqlalchemy", "flask", "click", "threading")


def _sanitize(value):
    if isinstance(value, dict):
        return {str(key): "[REDACTED]" if _REDACT_KEYS.search(str(key)) else _sanitize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_sanitize(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


class JsonFormatter(logging.Formatter):
    def format(self, record: LogRecord) -> str:
        run_id = _RUN_ID.get()
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "run_id": run_id if run_id != "uninitialized" else _ACTIVE_RUN_ID,
            "request_id": _REQUEST_ID.get(),
            "correlation_id": _CORRELATION_ID.get(),
            "game_id": _GAME_ID.get(),
            "room_id": _ROOM_ID.get(),
            "event": getattr(record, "event_name", record.getMessage()),
            "message": record.getMessage(),
            "module": getattr(record, "source_module", record.module),
            "file": getattr(record, "source_file", record.pathname),
            "function": getattr(record, "source_function", record.funcName),
            "line": getattr(record, "source_line", record.lineno),
            "process_id": os.getpid(),
            "thread": threading.current_thread().name,
        }
        if getattr(record, "duration_ms", None) is not None:
            payload["duration_ms"] = round(float(record.duration_ms), 3)
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict) and fields:
            payload["fields"] = _sanitize(fields)
        if record.exc_info:
            payload["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Exception",
                "message": str(record.exc_info[1]) if record.exc_info[1] else "",
                "stacktrace": "".join(traceback.format_exception(*record.exc_info)),
            }
        return json.dumps(payload, default=str, ensure_ascii=False)


class RunFileHandler(Handler):
    def __init__(self, path: Path) -> None:
        super().__init__()
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._stream = self.path.open("a", encoding="utf-8", buffering=1)

    def emit(self, record: LogRecord) -> None:
        try:
            rendered = self.format(record)
            with self._lock:
                if not self._stream.closed:
                    self._stream.write(rendered + "\n")
        except (OSError, ValueError, RuntimeError):
            return

    def close(self) -> None:
        with self._lock:
            try:
                if not self._stream.closed:
                    self._stream.flush()
                    self._stream.close()
            except (OSError, ValueError, RuntimeError):
                pass
        super().close()


def _next_run_directory(base_logs: Path) -> tuple[str, Path]:
    now = datetime.now().astimezone()
    day_dir = base_logs / now.strftime("%Y") / now.strftime("%b") / now.strftime("%d_Logs")
    day_dir.mkdir(parents=True, exist_ok=True)
    numbers = []
    for child in day_dir.iterdir():
        if child.is_dir() and re.fullmatch(r"Run\d{2}", child.name):
            try:
                numbers.append(int(child.name[3:]))
            except ValueError:
                continue
    number = max(numbers, default=0) + 1
    run_id = f"Run{number:02d}"
    run_dir = day_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_id, run_dir


def setup_logging_retention(base_logs: Path, days: int = 7) -> None:
    cutoff = datetime.now().astimezone() - timedelta(days=days)
    if not base_logs.exists():
        return
    for year in base_logs.iterdir():
        if not year.is_dir() or not year.name.isdigit():
            continue
        for month in year.iterdir():
            if not month.is_dir():
                continue
            for day_dir in month.iterdir():
                if not day_dir.is_dir() or not day_dir.name.endswith("_Logs"):
                    continue
                try:
                    if datetime.fromtimestamp(day_dir.stat().st_mtime).astimezone() < cutoff:
                        shutil.rmtree(day_dir, ignore_errors=True)
                except OSError:
                    continue


def set_context(*, request_id=None, correlation_id=None, game_id=None, room_id=None):
    tokens = {}
    if request_id is not None:
        tokens["request_id"] = _REQUEST_ID.set(str(request_id))
    if correlation_id is not None:
        tokens["correlation_id"] = _CORRELATION_ID.set(str(correlation_id))
    if game_id is not None:
        tokens["game_id"] = _GAME_ID.set(str(game_id))
    if room_id is not None:
        tokens["room_id"] = _ROOM_ID.set(str(room_id))
    return tokens


def reset_context(tokens):
    if not tokens:
        return
    mapping = {"request_id": _REQUEST_ID, "correlation_id": _CORRELATION_ID, "game_id": _GAME_ID, "room_id": _ROOM_ID}
    for key, token in list(tokens.items())[::-1]:
        tokens.pop(key, None)
        if token is None:
            continue
        try:
            mapping[key].reset(token)
        except (RuntimeError, ValueError):
            continue


def get_observability_context() -> dict:
    run_id = _RUN_ID.get()
    return {"run_id": run_id if run_id != "uninitialized" else _ACTIVE_RUN_ID, "request_id": _REQUEST_ID.get(), "correlation_id": _CORRELATION_ID.get(), "game_id": _GAME_ID.get(), "room_id": _ROOM_ID.get()}


def log_event(logger: logging.Logger, level: int, event: str, message: str | None = None, *, fields=None, duration_ms=None, exc_info=None, source=None) -> None:
    extra = {"event_name": event, "fields": _sanitize(fields or {})}
    if duration_ms is not None:
        extra["duration_ms"] = round(float(duration_ms), 3)
    if isinstance(source, dict):
        for field, key in (("module", "source_module"), ("file", "source_file"), ("function", "source_function"), ("line", "source_line")):
            if source.get(field):
                extra[key] = source[field]
    try:
        logger.log(level, message or event, extra=extra, exc_info=exc_info)
    except (OSError, ValueError, RuntimeError):
        return


def audit_event(logger: logging.Logger, event: str, message: str | None = None, *, fields=None) -> None:
    log_event(logger, logging.INFO, f"AUDIT_{event}", message, fields=fields)


def _install_function_tracer(logger: logging.Logger, enabled: bool = True):
    if not enabled or getattr(sys, "_archess_function_tracer", False):
        return None
    local = threading.local()

    def get_started():
        started = getattr(local, "started", None)
        if started is None:
            started = {}
            local.started = started
        return started

    def safe_trace(level, event, frame, *, fields=None, duration_ms=None, exc_info=None):
        if sys.is_finalizing() or getattr(local, "disabled", False) or getattr(sys, "_archess_tracer_shutting_down", False):
            return
        try:
            local.disabled = True
            log_event(logger, level, event, fields=fields, duration_ms=duration_ms, exc_info=exc_info, source={"module": frame.f_globals.get("__name__", "unknown"), "file": frame.f_code.co_filename, "function": frame.f_code.co_name, "line": frame.f_lineno})
        except Exception:
            pass
        finally:
            local.disabled = False

    def trace(frame, event, arg):
        if sys.is_finalizing() or getattr(local, "disabled", False) or getattr(sys, "_archess_tracer_shutting_down", False):
            return None
        module = frame.f_globals.get("__name__", "") or ""
        if module in _IGNORED_MODULES or module.startswith(tuple(f"{name}." for name in _IGNORED_MODULES)):
            return trace
        if not module.startswith(_APPLICATION_ROOTS):
            return trace
        started = get_started()
        key = id(frame)
        function_name = f"{module}.{frame.f_code.co_name}"
        if event == "call":
            started[key] = time.perf_counter()
            safe_trace(logging.DEBUG, "FUNCTION_ENTER", frame, fields={"function_name": function_name})
        elif event == "return":
            start = started.pop(key, None)
            safe_trace(logging.DEBUG, "FUNCTION_EXIT", frame, fields={"function_name": function_name}, duration_ms=(time.perf_counter() - start) * 1000 if start else None)
        elif event == "exception" and arg:
            exc_type, exc_value, exc_tb = arg
            safe_trace(logging.ERROR, "FUNCTION_EXCEPTION", frame, fields={"function_name": function_name, "exception_type": getattr(exc_type, "__name__", str(exc_type)), "exception_message": str(exc_value)}, exc_info=(exc_type, exc_value, exc_tb))
        return trace

    def disable_on_shutdown():
        setattr(sys, "_archess_tracer_shutting_down", True)
        try:
            sys.settrace(None)
            threading.settrace(None)
        except (RuntimeError, AttributeError):
            pass

    sys.settrace(trace)
    threading.settrace(trace)
    sys._archess_function_tracer = True
    sys._archess_tracer_shutting_down = False
    log_event(logger, logging.INFO, "FUNCTION_TRACING_ENABLED", "Application-wide function tracing enabled")
    return disable_on_shutdown


def _write_browser_record(payload: dict) -> None:
    if _BROWSER_LOG_PATH is None:
        return
    record = {"timestamp": datetime.now(timezone.utc).isoformat(), "level": str(payload.get("level", "INFO")).upper(), "logger": "game.browser", "run_id": _ACTIVE_RUN_ID, "request_id": payload.get("requestId", "unknown"), "correlation_id": payload.get("correlationId", "unknown"), "game_id": payload.get("gameId"), "room_id": payload.get("roomId"), "event": payload.get("event", "BROWSER_EVENT"), "message": payload.get("message", ""), "module": payload.get("source", "browser"), "function": payload.get("function"), "line": payload.get("line"), "fields": _sanitize(payload)}
    with _BROWSER_LOG_LOCK:
        try:
            with _BROWSER_LOG_PATH.open("a", encoding="utf-8") as stream:
                stream.write(json.dumps(record, default=str, ensure_ascii=False) + "\n")
        except (OSError, ValueError, RuntimeError):
            return


def append_browser_log(application, payload: dict) -> None:
    del application
    _write_browser_record(_sanitize(payload))


def _install_browser_log_endpoint(application: object) -> None:
    @application.post("/api/observability/browser")
    def _browser_logs():
        started = time.perf_counter()
        try:
            payload = request.get_json(silent=True)
            if not isinstance(payload, dict):
                return jsonify({"error": "invalid_log_payload"}), 400
            events = payload.get("events", [])
            if not isinstance(events, list):
                return jsonify({"error": "events_must_be_list"}), 400
            accepted = 0
            for event in events[:50]:
                if isinstance(event, dict):
                    _write_browser_record(_sanitize(event))
                    accepted += 1
            log_event(application.logger, logging.DEBUG, "BROWSER_LOG_BATCH", fields={"count": accepted}, duration_ms=(time.perf_counter() - started) * 1000)
            return jsonify({"accepted": accepted, "runId": _ACTIVE_RUN_ID}), 202
        except Exception as error:
            log_event(application.logger, logging.ERROR, "BROWSER_LOG_ENDPOINT_ERROR", fields={"path": request.path}, exc_info=(type(error), error, error.__traceback__))
            return jsonify({"error": "browser_log_failed", "runId": _ACTIVE_RUN_ID}), 500


def configure_logging(application):
    global _ACTIVE_RUN_ID, _ACTIVE_RUN_DIR, _BROWSER_LOG_PATH
    logging.raiseExceptions = False
    base_logs = Path(os.getcwd()) / "Logs"
    setup_logging_retention(base_logs)
    _ACTIVE_RUN_ID, _ACTIVE_RUN_DIR = _next_run_directory(base_logs)
    _RUN_ID.set(_ACTIVE_RUN_ID)
    _BROWSER_LOG_PATH = _ACTIVE_RUN_DIR / "browser.log"
    _BROWSER_LOG_PATH.touch(exist_ok=True)

    handlers = [RunFileHandler(_ACTIVE_RUN_DIR / "application.log"), RunFileHandler(_ACTIVE_RUN_DIR / "error.log"), RunFileHandler(_ACTIVE_RUN_DIR / "audit.log")]

    class LevelRange(logging.Filter):
        def __init__(self, minimum, maximum=None):
            self.minimum = minimum
            self.maximum = maximum
        def filter(self, record):
            return record.levelno >= self.minimum and (self.maximum is None or record.levelno < self.maximum)

    class AuditFilter(logging.Filter):
        def filter(self, record):
            return str(getattr(record, "event_name", "")).startswith("AUDIT_")

    handlers[0].addFilter(LevelRange(logging.DEBUG, logging.ERROR))
    handlers[1].addFilter(LevelRange(logging.ERROR))
    handlers[2].addFilter(AuditFilter())
    for handler in handlers:
        handler.setFormatter(JsonFormatter())

    for old_handler in list(application.logger.handlers):
        application.logger.removeHandler(old_handler)
        try:
            old_handler.close()
        except Exception:
            pass
    for handler in handlers:
        application.logger.addHandler(handler)

    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(JsonFormatter())
    application.logger.addHandler(console)
    application.logger.setLevel(logging.DEBUG if application.debug else logging.INFO)
    application.logger.propagate = False

    _install_browser_log_endpoint(application)

    @application.before_request
    def _request_started():
        from flask import g
        request_id = os.urandom(8).hex()
        correlation_id = request.headers.get("X-ArChess-Correlation-ID") or os.urandom(8).hex()
        g.archess_context_tokens = set_context(request_id=request_id, correlation_id=correlation_id)
        g.archess_request_id = request_id
        g.archess_correlation_id = correlation_id
        g.archess_started_at = time.perf_counter()
        log_event(application.logger, logging.INFO, "REQUEST_START", fields={"method": request.method, "path": request.path, "remote": request.remote_addr})

    @application.after_request
    def _request_finished(response):
        from flask import g
        elapsed_ms = (time.perf_counter() - getattr(g, "archess_started_at", time.perf_counter())) * 1000
        response.headers["X-ArChess-Request-ID"] = getattr(g, "archess_request_id", "unknown")
        response.headers["X-ArChess-Correlation-ID"] = getattr(g, "archess_correlation_id", "unknown")
        log_event(application.logger, logging.INFO, "REQUEST_END", fields={"status": response.status_code}, duration_ms=elapsed_ms)
        return response

    @application.teardown_request
    def _request_teardown(error=None):
        from flask import g
        if error and not sys.is_finalizing():
            log_event(application.logger, logging.ERROR, "REQUEST_TEARDOWN_ERROR", exc_info=(type(error), error, error.__traceback__))
        reset_context(getattr(g, "archess_context_tokens", None))

    @application.errorhandler(Exception)
    def _handle_unexpected_error(error):
        from flask import g
        if isinstance(error, HTTPException):
            status = int(error.code or 500)
            slug = "not_found" if status == 404 else "http_error"
            message = "Resource not found" if status == 404 else (error.description or "HTTP error")
            log_event(application.logger, logging.WARNING, "HTTP_ERROR", fields={"status": status, "path": request.path, "description": error.description})
            return jsonify({"error": slug, "message": message}), status
        request_id = getattr(g, "archess_request_id", "unknown")
        log_event(application.logger, logging.ERROR, "UNHANDLED_REQUEST_ERROR", fields={"method": request.method, "path": request.path}, exc_info=(type(error), error, error.__traceback__))
        return jsonify({"error": "internal_server_error", "message": "ArChess encountered an unexpected server error.", "requestId": request_id}), 500

    def _uncaught_thread_exception(args):
        if sys.is_finalizing():
            return
        log_event(application.logger, logging.CRITICAL, "UNCAUGHT_THREAD_EXCEPTION", fields={"thread": getattr(args.thread, "name", "unknown")}, exc_info=(args.exc_type, args.exc_value, args.exc_traceback))

    threading.excepthook = _uncaught_thread_exception
    trace_enabled = os.environ.get("ARCHESS_TRACE_FUNCTIONS", "1") == "1"
    _install_function_tracer(application.logger, enabled=trace_enabled)

    application.config["ARCHESS_LOG_RUN_ID"] = _ACTIVE_RUN_ID
    application.config["ARCHESS_LOG_RUN_DIR"] = str(_ACTIVE_RUN_DIR)
    application.config["ARCHESS_BROWSER_LOGGER"] = "game.browser"
    log_event(application.logger, logging.INFO, "OBSERVABILITY_READY", "Structured observability initialized", fields={"run_id": _ACTIVE_RUN_ID, "log_dir": str(_ACTIVE_RUN_DIR)})
    return _ACTIVE_RUN_DIR
