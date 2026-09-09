"""
ARCHESS - Structured Logging Engine
Conforms to ArChess tracker logging standard:
  Logs/YYYY/MMM/DD_Logs/RunXX/
  1 application process = 1 RunXX
"""

import os
import re
import sys
import logging
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_ROOT_DIR = os.path.join(BASE_DIR, "Logs")

_ACTIVE_RUN_DIR = None
_ACTIVE_LOGGER = None

def get_run_directory(base_logs_dir=LOGS_ROOT_DIR, force_new=False):
    """
    Creates and returns the next RunXX folder under:
    Logs/YYYY/MMM/DD_Logs/RunXX/
    Reuses existing run directory for current process unless force_new=True.
    """
    global _ACTIVE_RUN_DIR
    if _ACTIVE_RUN_DIR and not force_new:
        return _ACTIVE_RUN_DIR

    now = datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%b")
    day_folder = f"{now.strftime('%d')}_Logs"

    date_dir = os.path.join(base_logs_dir, year, month, day_folder)
    os.makedirs(date_dir, exist_ok=True)

    # Discover existing RunXX directories to auto-increment
    existing_runs = []
    run_pattern = re.compile(r"^Run(\d+)$")
    if os.path.exists(date_dir):
        for name in os.listdir(date_dir):
            match = run_pattern.match(name)
            if match and os.path.isdir(os.path.join(date_dir, name)):
                existing_runs.append(int(match.group(1)))

    next_index = max(existing_runs, default=0) + 1
    run_dir_name = f"Run{next_index:02d}"
    full_run_dir = os.path.join(date_dir, run_dir_name)
    os.makedirs(full_run_dir, exist_ok=True)
    _ACTIVE_RUN_DIR = full_run_dir
    return full_run_dir

class TrackerJsonFormatter(logging.Formatter):
    """
    Emits structured JSON lines:
    {"timestamp":"...", "level":"INFO", "logger":"ArChess", "message":...}
    """
    def format(self, record):
        import json
        timestamp = datetime.now().astimezone().isoformat()
        msg = record.getMessage().strip()
        if (msg.startswith("{") and msg.endswith("}")) or (msg.startswith("[") and msg.endswith("]")):
            msg_json = msg
        else:
            msg_json = json.dumps(msg)
        return f'{{"timestamp":"{timestamp}", "level":"{record.levelname}", "logger":"{record.name}", "message":{msg_json}}}'

def setup_logging(app_name="ArChess", force_new=False):
    global _ACTIVE_LOGGER
    if _ACTIVE_LOGGER and not force_new:
        return _ACTIVE_LOGGER, _ACTIVE_RUN_DIR

    run_dir = get_run_directory(force_new=force_new)
    log_file_path = os.path.join(run_dir, "app.log")

    logger = logging.getLogger(app_name)
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers
    if not logger.handlers:
        file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(TrackerJsonFormatter())
        logger.addHandler(file_handler)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            "[{asctime}] [{levelname}] {message}",
            datefmt="%H:%M:%S",
            style="{"
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    logger.info(f'{{"event":"run_initialized", "run_dir":"{run_dir.replace(os.sep, "/")}"}}')
    _ACTIVE_LOGGER = logger
    return logger, run_dir
