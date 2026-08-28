from __future__ import annotations

import json
import logging
from pathlib import Path

from flask import Flask

import core.logging_config as lc


def test_retention_keeps_only_ten_newest_runs_per_day(tmp_path):
    day_dir = tmp_path / "Logs" / "2026" / "Aug" / "28_Logs"
    for number in range(1, 13):
        run_dir = day_dir / f"Run{number:02d}"
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "application.log").write_text(str(number), encoding="utf-8")

    lc.setup_logging_retention(tmp_path / "Logs", days=365, max_runs_per_day=10)

    remaining = sorted(path.name for path in day_dir.iterdir() if path.is_dir())
    assert remaining == [f"Run{number:02d}" for number in range(3, 13)]


def test_default_runtime_does_not_emit_function_enter_exit_flood(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ARCHESS_TRACE_FUNCTIONS", "1")
    monkeypatch.delenv("ARCHESS_TRACE_FUNCTIONS_VERBOSE", raising=False)

    app = Flask("logging-volume")
    lc.configure_logging(app)

    @app.get("/health")
    def health():
        return {"ok": True}

    client = app.test_client()
    assert client.get("/health").status_code == 200

    application_log = Path(lc._ACTIVE_RUN_DIR) / "application.log"
    records = [
        json.loads(line)
        for line in application_log.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    events = {record["event"] for record in records}
    assert "FUNCTION_ENTER" not in events
    assert "FUNCTION_EXIT" not in events
    assert "REQUEST_START" in events
    assert "REQUEST_END" in events


def test_verbose_function_trace_can_be_explicitly_enabled(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ARCHESS_TRACE_FUNCTIONS", "1")
    monkeypatch.setenv("ARCHESS_TRACE_FUNCTIONS_VERBOSE", "1")

    logger = logging.getLogger("logging-volume-verbose")
    logger.handlers.clear()
    run_dir = lc.configure_logging(Flask("logging-volume-verbose"))
    assert run_dir.exists()
