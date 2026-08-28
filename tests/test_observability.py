from __future__ import annotations

import json
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest
from flask import Flask

import core.logging_config as lc

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "templates" / "index.html"
OBSERVABILITY_JS = ROOT / "static/js/observability.js"


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
    now = datetime.now().astimezone()
    assert run_dir.name == "Run01"
    assert run_dir.parent.name == now.strftime("%d_Logs")
    assert run_dir.parent.parent.name == now.strftime("%b")
    assert run_dir.parent.parent.parent.name == now.strftime("%Y")
    assert sorted(path.name for path in run_dir.iterdir()) == ["application.log", "audit.log", "browser.log", "error.log"]


def test_second_run_gets_incremented_id(isolated_observability):
    now = datetime.now().astimezone()
    base = isolated_observability / "Logs" / now.strftime("%Y") / now.strftime("%b") / now.strftime("%d_Logs")
    (base / "Run01").mkdir(parents=True)
    (base / "Run09").mkdir()
    run_id, run_dir = lc._next_run_directory(isolated_observability / "Logs")
    assert run_id == "Run10"
    assert run_dir.name == "Run10"


def test_formatter_preserves_exact_source_location_and_redacts_secrets():
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
    record.fields = {"secret": "do-not-write", "piece_id": "p1"}
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
    assert rendered["fields"]["piece_id"] == "p1"


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
    assert response.headers["X-ArChess-Request-ID"]

    browser_log = Path(lc._ACTIVE_RUN_DIR) / "browser.log"
    lines = [json.loads(line) for line in browser_log.read_text(encoding="utf-8").splitlines() if line.strip()]
    event = next(item for item in lines if item["event"] == "BROWSER_ERROR")
    assert event["correlation_id"] == "corr-test"
    assert event["run_id"] == "Run01"


def test_unhandled_exception_contains_request_and_correlation(isolated_observability):
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


def test_python_logging_config_is_syntax_valid():
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", "core/logging_config.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_browser_observability_is_syntax_valid():
    result = subprocess.run(
        ["node", "--check", str(OBSERVABILITY_JS)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_browser_observability_contract_is_present_before_main_runtime():
    template = TEMPLATE.read_text(encoding="utf-8")
    observation_index = template.find("static/js/observability.js")
    main_index = template.find("static/js/main.js")
    assert observation_index >= 0
    assert main_index >= 0
    assert observation_index < main_index
    observer = OBSERVABILITY_JS.read_text(encoding="utf-8")
    assert "/api/observability/browser" in observer
    assert "GAME_STATE_TRANSITION" in observer
    assert "CONSOLE_EVENT" in observer


def test_application_python_roots_are_in_tracing_surface():
    for root in ("game", "core", "config", "match_sessions"):
        assert root in lc._APPLICATION_ROOTS
    assert "core.logging_config" in lc._IGNORED_MODULES
    assert not any(name.startswith("logging") for name in lc._APPLICATION_ROOTS)
