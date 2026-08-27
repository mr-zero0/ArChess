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
        payload = {"timestamp": datetime.now(timezone.utc).isoformat(), "level": record.levelname, "logger": record.name, "message": record.getMessage(), "module": record.module, "function": record.funcName, "line": record.lineno}
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
        if not os.path.isdir(year_path): continue
        for month in os.listdir(year_path):
            month_path = os.path.join(year_path, month)
            if not os.path.isdir(month_path): continue
            for day in os.listdir(month_path):
                day_path = os.path.join(month_path, day)
                if not os.path.isdir(day_path): continue
                try:
                    if datetime.fromtimestamp(os.path.getmtime(day_path)) < cutoff:
                        shutil.rmtree(day_path, ignore_errors=True)
                except OSError:
                    logging.getLogger(__name__).warning("Unable to inspect log directory: %s", day_path, exc_info=True)


def _install_function_tracer(logger):
    """Trace application Python function calls when ARCHESS_TRACE_FUNCTIONS=1."""
    if os.environ.get("ARCHESS_TRACE_FUNCTIONS", "0") != "1" or getattr(sys, "_archess_function_tracer", False):
        return
    ignored = ("logging", "werkzeug", "urllib3", "sqlalchemy", "flask", "click")
    local = threading.local()

    def trace(frame, event, arg):
        module = frame.f_globals.get("__name__", "")
        if module.startswith(ignored): return trace
        depth = getattr(local, "depth", 0)
        if event == "call":
            logger.debug("FUNCTION_ENTER name=%s.%s depth=%d", module, frame.f_code.co_name, depth)
            local.depth = depth + 1
        elif event == "return":
            local.depth = max(0, depth - 1)
            logger.debug("FUNCTION_EXIT name=%s.%s depth=%d", module, frame.f_code.co_name, depth)
        elif event == "exception":
            exc = arg[1]
            logger.error("FUNCTION_EXCEPTION name=%s.%s error=%s", module, frame.f_code.co_name, exc, exc_info=(type(exc), exc, exc.__traceback__))
        return trace

    sys.setprofile(trace)
    threading.setprofile(trace)
    sys._archess_function_tracer = True
    logger.info("Full Python function tracing enabled")


def configure_logging(application):
    log_dir = os.path.join(os.getcwd(), "logs", datetime.now().strftime("%Y/%m/%d"))
    os.makedirs(log_dir, exist_ok=True)
    setup_logging_retention()

    file_handler = TimedRotatingFileHandler(os.path.join(log_dir, "run.log"), when="midnight", interval=1, backupCount=7, encoding="utf-8")
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
        application.logger.info("REQUEST_START id=%s method=%s path=%s remote=%s", request_id, request.method, request.path, request.remote_addr)

    @application.after_request
    def _request_finished(response):
        from flask import g
        elapsed_ms = (time.perf_counter() - getattr(g, "archess_started_at", time.perf_counter())) * 1000
        request_id = getattr(g, "archess_request_id", "unknown")
        response.headers["X-ArChess-Request-ID"] = request_id
        application.logger.info("REQUEST_END id=%s status=%s duration_ms=%.2f", request_id, response.status_code, elapsed_ms)
        return response

    @application.teardown_request
    def _request_teardown(error=None):
        if error:
            application.logger.error("REQUEST_TEARDOWN_ERROR", exc_info=(type(error), error, error.__traceback__))

    @application.errorhandler(Exception)
    def _handle_unexpected_error(error):
        from flask import g, jsonify, request
        from werkzeug.exceptions import HTTPException
        if isinstance(error, HTTPException):
            application.logger.warning("HTTP_ERROR id=%s status=%s path=%s", getattr(g, "archess_request_id", "unknown"), error.code, request.path)
            return error
        request_id = getattr(g, "archess_request_id", "unknown")
        application.logger.error("UNHANDLED_REQUEST_ERROR id=%s method=%s path=%s", request_id, request.method, request.path, exc_info=(type(error), error, error.__traceback__))
        return jsonify({"error":"internal_server_error","message":"ArChess encountered an unexpected server error.","requestId":request_id}), 500

    def _uncaught_thread_exception(args):
        application.logger.critical("UNCAUGHT_THREAD_EXCEPTION thread=%s", getattr(args.thread, "name", "unknown"), exc_info=(args.exc_type, args.exc_value, args.exc_traceback))

    threading.excepthook = _uncaught_thread_exception
    _install_function_tracer(application.logger)
    application.logger.info("Structured observability initialized")
