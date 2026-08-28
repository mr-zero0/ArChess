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


_RUN_ID = contextvars.ContextVar("archess_run_id", default="uninitialized")
_REQUEST_ID = contextvars.ContextVar("archess_request_id", default="unknown")
_CORRELATION_ID = contextvars.ContextVar("archess_correlation_id", default="unknown")
_GAME_ID = contextvars.ContextVar("archess_game_id", default=None)
_ROOM_ID = contextvars.ContextVar("archess_room_id", default=None)

_REDACT_KEYS = re.compile(r"password|passwd|secret|token|authorization|cookie|session", re.IGNORECASE)
_APPLICATION_ROOTS = ("game", "core", "config", "match_sessions")
_IGNORED_MODULES = (
    "core.logging_config",
    "logging",
    "werkzeug",
    "urllib3",
    "sqlalchemy",
    "flask",
    "click",
    "threading",
)


class JsonFormatter(logging.Formatter):
    """Emit deterministic structured JSON with source and correlation context."""

    def format(self, record: LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        payload = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "run_id": _RUN_ID.get(),
            "request_id": _REQUEST_ID.get(),
            "correlation_id": _CORRELATION_ID.get(),
            "game_id": _GAME_ID.get(),
            "room_id": _ROOM_ID.get(),
            "event": getattr(record, "event_name", record.msg if isinstance(record.msg, str) else record.getMessage()),
            "message": record.getMessage(),
            "module": record.module,
            "file": record.pathname,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": os.getpid(),
            "thread": threading.current_thread().name,
        }

        duration_ms = getattr(record, "duration_ms", None)
        if duration_ms is not None:
            payload["duration_ms"] = duration_ms

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
    """File handler isolated to one immutable RunXX directory."""

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
                if self._stream.closed:
                    return
                self._stream.write(rendered + "\n")
        except (OSError, ValueError, RuntimeError):
            self.handleError(record)

    def close(self) -> None:
        with self._lock:
            try:
                if not self._stream.closed:
                    self._stream.flush()
                    self._stream.close()
            except (OSError, ValueError, RuntimeError):
                pass
        super().close()


class BrowserLogHandler(RunFileHandler):
    pass


def _sanitize(value):
    if isinstance(value, dict):
        return {
            str(key): "[REDACTED]" if _REDACT_KEYS.search(str(key)) else _sanitize(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_sanitize(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _next_run_directory(base_logs: Path) -> tuple[str, Path]:
    now = datetime.now().astimezone()
    year = now.strftime("%Y")
    month = now.strftime("%b")
    day = now.strftime("%d_Logs")
    day_dir = base_logs / year / month / day
    day_dir.mkdir(parents=True, exist_ok=True)
    existing = []
    for child in day_dir.iterdir():
        if child.is_dir() and re.fullmatch(r"Run\d{2}", child.name):
            try:
                existing.append(int(child.name[3:]))
            except ValueError:
                continue
    number = (max(existing) + 1) if existing else 1
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
                    modified = datetime.fromtimestamp(day_dir.stat().st_mtime).astimezone()
                    if modified < cutoff:
                        shutil.rmtree(day_dir, ignore_errors=True)
                except OSError:
                    logging.getLogger(__name__).warning(
                        "Unable to inspect log directory",
                        extra={"event_name": "LOG_RETENTION_INSPECT_ERROR", "fields": {"path": str(day_dir)}},
                        exc_info=True,
                    )


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
    mapping = {
        "request_id": _REQUEST_ID,
        "correlation_id": _CORRELATION_ID,
        "game_id": _GAME_ID,
        "room_id": _ROOM_ID,
    }
    for key, token in reversed(list(tokens.items())):
        mapping[key].reset(token)


def get_observability_context() -> dict:
    return {
        "run_id": _RUN_ID.get(),
        "request_id": _REQUEST_ID.get(),
        "correlation_id": _CORRELATION_ID.get(),
        "game_id": _GAME_ID.get(),
        "room_id": _ROOM_ID.get(),
    }


def log_event(logger: logging.Logger, level: int, event: str, message: str | None = None, *, fields=None, duration_ms=None, exc_info=None) -> None:
    extra = {
        "event_name": event,
        "fields": _sanitize(fields or {}),
    }
    if duration_ms is not None:
        extra["duration_ms"] = round(float(duration_ms), 3)
    try:
        logger.log(level, message or event, extra=extra, exc_info=exc_info)
    except (OSError, ValueError, RuntimeError):
        return


def audit_event(logger: logging.Logger, event: str, message: str | None = None, *, fields=None) -> None:
    log_event(logger, logging.INFO, event, message, fields=fields)


def browser_event(logger: logging.Logger, payload: dict) -> None:
    log_event(logger, logging.INFO, payload.get("event", "BROWSER_EVENT"), payload.get("message"), fields=payload)


def _install_function_tracer(logger: logging.Logger, allow_reloader_parent: bool = False):
    """Trace every ArChess application function without tracing logging/framework internals."""
    enabled = os.environ.get("ARCHESS_TRACE_FUNCTIONS", "1")
    if enabled != "1" or getattr(sys, "_archess_function_tracer", False):
        return None

    if not allow_reloader_parent and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return None

    local = threading.local()
    local.disabled = False
    local.stack = {}

    def safe_log(level: int, event: str, frame, **fields):
        if sys.is_finalizing() or local.disabled or getattr(sys, "_archess_tracer_shutting_down", False):
            return
        module = frame.f_globals.get("__name__", "")
        function = frame.f_code.co_name
        try:
            local.disabled = True
            log_event(
                logger,
                level,
                event,
                fields={"module": module, "function": function, **fields},
            )
        finally:
            local.disabled = False

    def trace(frame, event, arg):
        if sys.is_finalizing() or local.disabled or getattr(sys, "_archess_tracer_shutting_down", False):
            return None

        module = frame.f_globals.get("__name__", "") or ""
        if module in _IGNORED_MODULES or module.startswith(tuple(f"{name}." for name in _IGNORED_MODULES)):
            return trace
        if not module.startswith(_APPLICATION_ROOTS):
            return trace

        key = id(frame)
        if event == "call":
            local.stack[key] = time.perf_counter()
            safe_log(logging.DEBUG, "FUNCTION_ENTER", frame)
        elif event == "return":
            started = local.stack.pop(key, None)
            safe_log(
                logging.DEBUG,
                "FUNCTION_EXIT",
                frame,
                duration_ms=(time.perf_counter() - started) * 1000 if started else None,
            )
        elif event == "exception" and arg:
            exc_type, exc_value, _ = arg
            safe_log(
                logging.ERROR,
                "FUNCTION_EXCEPTION",
                frame,
                exception_type=getattr(exc_type, "__name__", str(exc_type)),
                exception_message=str(exc_value),
            )
        return trace

    def disable_on_shutdown():
        setattr(sys, "_archess_tracer_shutting_down", True)
        try:
            sys.settrace(None)
            threading.settrace(None)
            sys.setprofile(None)
            threading.setprofile(None)
        except (RuntimeError, AttributeError):
            pass

    sys.settrace(trace)
    threading.settrace(trace)
    sys._archess_function_tracer = True
    sys._archess_tracer_shutting_down = False
    log_event(logger, logging.INFO, "FUNCTION_TRACING_ENABLED", "Application-wide Python function tracing enabled")
    return disable_on_shutdown


def configure_logging(application):
    """Install run-scoped structured logging and correlation-aware request instrumentation."""
    logging.raiseExceptions = False

    base_logs = Path(os.getcwd()) / "Logs"
    run_id, run_dir = _next_run_directory(base_logs)
    _RUN_ID.set(run_id)
    setup_logging_retention(base_logs)

    application_handler = RunFileHandler(run_dir / "application.log")
    error_handler = RunFileHandler(run_dir / "error.log")
    audit_handler = RunFileHandler(run_dir / "audit.log")
    browser_handler = BrowserLogHandler(run_dir / "browser.log")
    for handler in (application_handler, error_handler, audit_handler, browser_handler):
        handler.setFormatter(JsonFormatter())

    class _StreamFilter(logging.Filter):
        def __init__(self, minimum: int, maximum: int | None = None):
            self.minimum = minimum
            self.maximum = maximum

        def filter(self, record: LogRecord) -> bool:
            if record.levelno < self.minimum:
                return False
            if self.maximum is not None and record.levelno >= self.maximum:
                return False
            return True

    class _NamedStreamFilter(logging.Filter):
        def filter(self, record: LogRecord) -> bool:
            return record.name.startswith(("game.browser", "archess.browser"))

    application_handler.addFilter(_StreamFilter(logging.DEBUG, logging.ERROR))
    error_handler.addFilter(_StreamFilter(logging.ERROR))
    audit_handler.addFilter(lambda_record_filter("AUDIT"))
    browser_handler.addFilter(_NamedStreamFilter())

    application.logger.handlers.clear()
    application.logger.addHandler(application_handler)
    application.logger.addHandler(error_handler)
    application.logger.addHandler(audit_handler)
    application.logger.setLevel(logging.DEBUG if application.debug else logging.INFO)
    application.logger.propagate = False
    application.logger.info("Structured observability initialized", extra={"event_name": "OBSERVABILITY_READY"})

    @application.before_request
    def _request_started():
        from flask import g, request

        request_id = os.urandom(8).hex()
        correlation_id = request.headers.get("X-ArChess-Correlation-ID") or os.urandom(8).hex()
        g.archess_context_tokens = set_context(request_id=request_id, correlation_id=correlation_id)
        g.archess_request_id = request_id
        g.archess_correlation_id = correlation_id
        g.archess_started_at = time.perf_counter()
        log_event(
            application.logger,
            logging.INFO,
            "REQUEST_START",
            fields={"method": request.method, "path": request.path, "remote": request.remote_addr},
        )

    @application.after_request
    def _request_finished(response):
        from flask import g

        elapsed_ms = (time.perf_counter() - getattr(g, "archess_started_at", time.perf_counter())) * 1000
        response.headers["X-ArChess-Request-ID"] = getattr(g, "archess_request_id", "unknown")
        response.headers["X-ArChess-Correlation-ID"] = getattr(g, "archess_correlation_id", "unknown")
        log_event(
            application.logger,
            logging.INFO,
            "REQUEST_END",
            fields={"status": response.status_code},
            duration_ms=elapsed_ms,
        )
        return response

    @application.teardown_request
    def _request_teardown(error=None):
        if error and not sys.is_finalizing():
            log_event(application.logger, logging.ERROR, "REQUEST_TEARDOWN_ERROR", exc_info=(type(error), error, error.__traceback__))
        from flask import g
        tokens = getattr(g, "archess_context_tokens", None)
        if tokens:
            reset_context(tokens)

    @application.errorhandler(Exception)
    def _handle_unexpected_error(error):
        from flask import g, jsonify, request
        from werkzeug.exceptions import HTTPException

        if isinstance(error, HTTPException):
            log_event(
                application.logger,
                logging.WARNING,
                "HTTP_ERROR",
                fields={"status": error.code, "path": request.path, "description": error.description},
            )
            return error

        log_event(
            application.logger,
            logging.ERROR,
            "UNHANDLED_REQUEST_ERROR",
            fields={"method": request.method, "path": request.path},
            exc_info=(type(error), error, error.__traceback__),
        )
        return jsonify(
            {
                "error": "internal_server_error",
                "message": "ArChess encountered an unexpected server error.",
                "requestId": getattr(g, "archess_request_id", "unknown"),
            }
        ), 500

    def _uncaught_thread_exception(args):
        if sys.is_finalizing():
            return
        log_event(
            application.logger,
            logging.CRITICAL,
            "UNCAUGHT_THREAD_EXCEPTION",
            fields={"thread": getattr(args.thread, "name", "unknown")},
            exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
        )

    threading.excepthook = _uncaught_thread_exception

    reloader_active = application.debug and "WERKZEUG_RUN_MAIN" in os.environ
    _install_function_tracer(application.logger, allow_reloader_parent=not reloader_active)
    application.config["ARCHESS_LOG_RUN_ID"] = run_id
    application.config["ARCHESS_LOG_RUN_DIR"] = str(run_dir)
    application.config["ARCHESS_BROWSER_LOGGER"] = "game.browser"

    application.logger.info(
        "ArChess observability initialized",
        extra={
            "event_name": "OBSERVABILITY_READY",
            "fields": {"run_id": run_id, "log_dir": str(run_dir)},
        },
    )
    return run_dir


def lambda_record_filter(event_name: str):
    class _Filter(logging.Filter):
        def filter(self, record: LogRecord) -> bool:
            return getattr(record, "event_name", None) == event_name
    return _Filter()


def get_run_directory(application) -> Path | None:
    configured = application.config.get("ARCHESS_LOG_RUN_DIR")
    return Path(configured) if configured else None


def append_browser_log(application, payload: dict) -> None:
    """Persist browser diagnostics into the current run without logging recursive request noise."""
    run_dir = get_run_directory(application)
    if run_dir is None:
        return
    browser_path = run_dir / "browser.log"
    handler = RunFileHandler(browser_path)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("game.browser")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        logger.addHandler(handler)
        logger.propagate = False
    tokens = set_context(correlation_id=payload.get("correlationId"), game_id=payload.get("gameId"), room_id=payload.get("roomId"))
    try:
        browser_event(logger, payload)
    finally:
        reset_context(tokens)
