import json
import logging
import os
import shutil
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from logging.handlers import TimedRotatingFileHandler


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def setup_logging_retention():
    base_logs = os.path.join(os.getcwd(), "logs")
    if not os.path.isdir(base_logs):
        return
    cutoff = datetime.now() - timedelta(days=7)
    for year in os.listdir(base_logs):
        year_path = os.path.join(base_logs, year)
        if not os.path.isdir(year_path):
            continue
        for month in os.listdir(year_path):
            month_path = os.path.join(year_path, month)
            if not os.path.isdir(month_path):
                continue
            for day in os.listdir(month_path):
                day_path = os.path.join(month_path, day)
                if not os.path.isdir(day_path):
                    continue
                try:
                    if datetime.fromtimestamp(os.path.getmtime(day_path)) < cutoff:
                        shutil.rmtree(day_path, ignore_errors=True)
                except OSError:
                    # Retention cleanup must never affect application startup.
                    logging.getLogger(__name__).warning(
                        "Unable to inspect log directory: %s", day_path, exc_info=True
                    )


def _install_function_tracer(logger):
    """Trace ArChess application calls without tracing the logging machinery itself."""
    enabled = os.environ.get(
        "ARCHESS_TRACE_FUNCTIONS",
        "1" if logger.isEnabledFor(logging.DEBUG) else "0",
    )
    if enabled != "1" or getattr(sys, "_archess_function_tracer", False):
        return

    # Flask debug reloader starts a parent process plus a serving child.
    # Trace only the serving process to avoid duplicate traces and duplicate setup.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "false":
        return

    application_roots = ("game", "core", "config", "match_sessions")
    local = threading.local()
    local.suspended = False
    ignored_modules = (
        "core.logging_config",
        "logging",
        "werkzeug",
        "urllib3",
        "sqlalchemy",
        "flask",
        "click",
        "threading",
    )

    def trace_log(level, message, *args, **kwargs):
        if sys.is_finalizing() or getattr(local, "suspended", False):
            return
        try:
            local.suspended = True
            for handler in logger.handlers:
                stream = getattr(handler, "stream", None)
                if stream is not None and getattr(stream, "closed", False):
                    return
            getattr(logger, level)(message, *args, **kwargs)
        except (ValueError, OSError, RuntimeError):
            return
        finally:
            local.suspended = False

    def trace(frame, event, arg):
        if sys.is_finalizing() or getattr(sys, "_archess_tracer_shutting_down", False):
            return None

        module = frame.f_globals.get("__name__", "") or ""
        if module in ignored_modules or module.startswith(tuple(f"{x}." for x in ignored_modules)):
            return trace
        if not module.startswith(application_roots):
            return trace

        depth = getattr(local, "depth", 0)
        if event == "call":
            trace_log(
                "debug",
                "FUNCTION_ENTER name=%s.%s depth=%d",
                module,
                frame.f_code.co_name,
                depth,
            )
            local.depth = depth + 1
        elif event == "return":
            local.depth = max(0, depth - 1)
            trace_log(
                "debug",
                "FUNCTION_EXIT name=%s.%s depth=%d",
                module,
                frame.f_code.co_name,
                depth,
            )
        elif event == "exception" and arg:
            exc = arg[1]
            trace_log(
                "debug",
                "FUNCTION_EXCEPTION name=%s.%s error=%s",
                module,
                frame.f_code.co_name,
                exc,
            )
        return trace

    def disable_on_shutdown():
        setattr(sys, "_archess_tracer_shutting_down", True)
        try:
            sys.setprofile(None)
            threading.setprofile(None)
        except (RuntimeError, AttributeError):
            pass

    sys.setprofile(trace)
    threading.setprofile(trace)
    sys._archess_function_tracer = True
    sys._archess_tracer_shutting_down = False
    logger.info("Full Python function tracing enabled (shutdown-safe)")
    return disable_on_shutdown


def configure_logging(application):
    logging.raiseExceptions = False

    log_dir = os.path.join(os.getcwd(), "logs", datetime.now().strftime("%Y/%m/%d"))
    os.makedirs(log_dir, exist_ok=True)
    setup_logging_retention()

    file_handler = TimedRotatingFileHandler(
        os.path.join(log_dir, "run.log"),
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setFormatter(JsonFormatter())
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(JsonFormatter())

    application.logger.handlers.clear()
    application.logger.addHandler(file_handler)
    application.logger.addHandler(stream_handler)
    application.logger.setLevel(logging.DEBUG if application.debug else logging.INFO)
    application.logger.propagate = False

    @application.before_request
    def _request_started():
        from flask import g, request

        request_id = os.urandom(8).hex()
        g.archess_request_id = request_id
        g.archess_started_at = time.perf_counter()
        application.logger.info(
            "REQUEST_START id=%s method=%s path=%s remote=%s",
            request_id,
            request.method,
            request.path,
            request.remote_addr,
        )

    @application.after_request
    def _request_finished(response):
        from flask import g

        elapsed_ms = (
            time.perf_counter() - getattr(g, "archess_started_at", time.perf_counter())
        ) * 1000
        request_id = getattr(g, "archess_request_id", "unknown")
        response.headers["X-ArChess-Request-ID"] = request_id
        application.logger.info(
            "REQUEST_END id=%s status=%s duration_ms=%.2f",
            request_id,
            response.status_code,
            elapsed_ms,
        )
        return response

    @application.teardown_request
    def _request_teardown(error=None):
        if error and not sys.is_finalizing():
            application.logger.error(
                "REQUEST_TEARDOWN_ERROR",
                exc_info=(type(error), error, error.__traceback__),
            )

    @application.errorhandler(Exception)
    def _handle_unexpected_error(error):
        from flask import g, jsonify, request
        from werkzeug.exceptions import HTTPException

        if isinstance(error, HTTPException):
            application.logger.warning(
                "HTTP_ERROR id=%s status=%s path=%s",
                getattr(g, "archess_request_id", "unknown"),
                error.code,
                request.path,
            )
            return error

        request_id = getattr(g, "archess_request_id", "unknown")
        application.logger.error(
            "UNHANDLED_REQUEST_ERROR id=%s method=%s path=%s",
            request_id,
            request.method,
            request.path,
            exc_info=(type(error), error, error.__traceback__),
        )
        return jsonify(
            {
                "error": "internal_server_error",
                "message": "ArChess encountered an unexpected server error.",
                "requestId": request_id,
            }
        ), 500

    def _uncaught_thread_exception(args):
        if sys.is_finalizing():
            return
        try:
            application.logger.critical(
                "UNCAUGHT_THREAD_EXCEPTION thread=%s",
                getattr(args.thread, "name", "unknown"),
                exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
            )
        except (ValueError, OSError, RuntimeError):
            return

    threading.excepthook = _uncaught_thread_exception
    _install_function_tracer(application.logger)
    application.logger.info("Structured observability initialized")
