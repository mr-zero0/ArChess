from __future__ import annotations

import json
import logging
from pathlib import Path

import pytest
from flask import Flask

import core.logging_config as lc


@pytest.fixture
def isolated_observability(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ARCHESS_TRACE_FUNCTIONS", "0")
    original_run_id = lc._ACTIVE_RUN_ID
    original_run_dir = lc._ACTIVE_RUN_DIR
    original_browser_path = lc._BROWSER_LOG_PATH
    lc._ACTIVE_RUN_ID = "uninitialized"
    lc._ACTIVE_RUN_DIR = None
    lc._BROWSER_LOG_PATH = None
    try:
        yield tmp_path
    finally:
        lc._ACTIVE_RUN_ID = original_run_id
        lc._ACTIVE_RUN_DIR = original_run_dir
        lc._BROWSER_LOG_PATH = original_browser_path


def test_run_directory_contract(isolated_observability):
    app = Flask("observability-test")
    run_dir = lc.configure_logging(app)
    assert run_dir.name == "Run01"
    assert run_dir.parent.name.endswith("_Logs")
    assert run_dir.parent.parent.name.isalpha()
    assert run_dir.parent.parent.parent.name.isdigit()
    assert (run_dir / "application.log").exists()
    assert (run_dir / "error.log").exists()
    assert (run_dir / "audit.log").exists()
    assert (run_dir / "browser.log").exists()


def test_second_run_gets_incremented_id(isolated_observability):
    base = isolated_observability / "Logs" / "2026" / "Aug" / "28_Logs"
    (base / "Run01").mkdir(parents=True)
    (base / "Run09").mkdir()
    run_id, run_dir = lc._next_run_directory(isolated_observability / "Logs")
    assert run_id == "Run10"
    assert run_dir.name == "Run10"


def test_formatter_preserves_exact_source_location_and_context():
    logger = logging.getLogger("observability.test")
    record = logger.makeRecord(
        logger.name,
        logging.ERROR,
        "/actual/game/physics.py",
        42,
        "collision failed",
        (),
        None,
        "resolve_piece_collision",
    )
    record.event_name = "FUNCTION_EXCEPTION"
    record.fields = {"secret": "do-not-write"}
    record.source_module = "game.physics.engine"
    record.source_file = "/actual/game/physics.py"
    record.source_function = "resolve_piece_collision"
    record.source_line = 42
    rendered = json.loads(lc.JsonFormatter().format(record))
    assert rendered["module"] == "game.physics.engine"
    assert rendered["file"] == "/actual/game/physics.py"
    assert rendered["function"] == "resolve_piece_collision"
    assert rendered["line"] == 42
    assert rendered["fields"]["secret"] == "[REDACTED]"


def test_request_and_browser_correlation(isolated_observability):
    app = Flask("observability-test")
    lc.configure_logging(app)
    client = app.test_client()
    response = client.post(
        "/api/observability/browser",
        headers={"X-ArChess-Correlation-ID": "corr-test"},
        json={"events": [{"event": "BROWSER_ERROR", "message": "boom", "correlationId": "corr-test"}]},
    )
    assert response.status_code == 202
    payload = response.get_json()
    assert payload["accepted"] == 1
    assert payload["runId"] == "Run01"
    assert response.headers["X-ArChess-Correlation-ID"] == "corr-test"

    browser_log = Path(lc._ACTIVE_RUN_DIR) / "browser.log"
    lines = [json.loads(line) for line in browser_log.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert any(item["event"] == "BROWSER_ERROR" and item["correlation_id"] == "corr-test" for item in lines)


def test_unhandled_exception_contains_request_id(isolated_observability):
    app = Flask("observability-test")
    lc.configure_logging(app)

    @app.get("/explode")
    def explode():
        raise RuntimeError("intentional failure")

    client = app.test_client()
    response = client.get("/explode", headers={"X-ArChess-Correlation-ID": "corr-error"})
    assert response.status_code == 500
    payload = response.get_json()
    assert payload["requestId"]
    assert response.headers["X-ArChess-Correlation-ID"] == "corr-error"

    error_log = Path(lc._ACTIVE_RUN_DIR) / "error.log"
    lines = [json.loads(line) for line in error_log.read_text(encoding="utf-8").splitlines() if line.strip()]
    event = next(item for item in lines if item["event"] == "UNHANDLED_REQUEST_ERROR")
    assert event["exception"]["type"] == "RuntimeError"
    assert "intentional failure" in event["exception"]["stacktrace"]
    assert event["correlation_id"] == "corr-error"
    assert event["request_id"] == payload["requestId"]


def test_tracing_surface_covers_application_roots():
    assert "game" in lc._APPLICATION_ROOTS
    assert "core" in lc._APPLICATION_ROOTS
    assert "config" in lc._APPLICATION_ROOTS
    assert "match_sessions" in lc._APPLICATION_ROOTS
    assert "scripts" in lc._APPLICATION_ROOTS
    assert "migrations" in lc._APPLICATION_ROOTS
    for ignored in lc._IGNORED_MODULES:
        assert ignored == "core.logging_config" or not ignored.startswith("game")
