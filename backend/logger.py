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

def cleanup_old_logs(
    base_logs_dir=LOGS_ROOT_DIR,
    retention_days=7,
    max_runs_per_day=15,
    max_total_size_mb=30,
    current_run_dir=None
):
    """
    Automated log retention and pruning engine.
    - Purges run directories older than retention_days.
    - Capped at max_runs_per_day runs per day folder (keeping most recent).
    - Enforces max_total_size_mb across all log files (oldest pruned first).
    - Removes empty day/month/year folders.
    - Protects the currently active run directory from deletion.
    """
    import shutil
    from datetime import timedelta

    stats = {"deleted_runs": 0, "reclaimed_bytes": 0}
    if not os.path.exists(base_logs_dir):
        return stats

    now = datetime.now()
    cutoff_date = now - timedelta(days=retention_days)
    run_pattern = re.compile(r"^Run(\d+)$")
    day_pattern = re.compile(r"^(\d{2})_Logs$")

    all_runs = []

    # Traverse Logs/YYYY/MMM/DD_Logs/RunXX
    try:
        for year in os.listdir(base_logs_dir):
            year_path = os.path.join(base_logs_dir, year)
            if not os.path.isdir(year_path) or not year.isdigit():
                continue
            for month in os.listdir(year_path):
                month_path = os.path.join(year_path, month)
                if not os.path.isdir(month_path):
                    continue
                for day_folder in os.listdir(month_path):
                    day_match = day_pattern.match(day_folder)
                    if not day_match:
                        continue
                    day_path = os.path.join(month_path, day_folder)
                    if not os.path.isdir(day_path):
                        continue

                    # Try parsing date
                    try:
                        folder_date = datetime.strptime(f"{year}-{month}-{day_match.group(1)}", "%Y-%b-%d")
                    except Exception:
                        folder_date = now

                    # Discover runs in this day folder
                    day_runs = []
                    for run_name in os.listdir(day_path):
                        run_match = run_pattern.match(run_name)
                        if not run_match:
                            continue
                        run_path = os.path.join(day_path, run_name)
                        if not os.path.isdir(run_path):
                            continue

                        # Calculate size
                        run_size = 0
                        mtime = os.path.getmtime(run_path)
                        for root, _, files in os.walk(run_path):
                            for f in files:
                                fp = os.path.join(root, f)
                                try:
                                    run_size += os.path.getsize(fp)
                                    mtime = max(mtime, os.path.getmtime(fp))
                                except OSError:
                                    pass

                        run_info = {
                            "path": run_path,
                            "name": run_name,
                            "index": int(run_match.group(1)),
                            "day_path": day_path,
                            "date": folder_date,
                            "mtime": mtime,
                            "size": run_size,
                            "is_current": bool(current_run_dir and os.path.abspath(run_path) == os.path.abspath(current_run_dir))
                        }
                        day_runs.append(run_info)
                        all_runs.append(run_info)
    except (OSError, ValueError):
        pass

    runs_to_delete = set()

    # Rule 1: Purge by age
    for r in all_runs:
        if r["is_current"]:
            continue
        if r["date"] < cutoff_date:
            runs_to_delete.add(r["path"])

    # Rule 2: Per-day run cap (keep newest N runs)
    runs_by_day = {}
    for r in all_runs:
        runs_by_day.setdefault(r["day_path"], []).append(r)
    for day_path, day_runs in runs_by_day.items():
        if len(day_runs) > max_runs_per_day:
            day_runs.sort(key=lambda x: x["index"], reverse=True)
            for r in day_runs[max_runs_per_day:]:
                if not r["is_current"]:
                    runs_to_delete.add(r["path"])

    # Rule 3: Enforce maximum total size across remaining logs
    remaining_runs = [r for r in all_runs if r["path"] not in runs_to_delete]
    max_size_bytes = max_total_size_mb * 1024 * 1024
    total_size = sum(r["size"] for r in remaining_runs)

    if total_size > max_size_bytes:
        # Sort oldest first by mtime
        remaining_runs.sort(key=lambda x: x["mtime"])
        for r in remaining_runs:
            if total_size <= max_size_bytes:
                break
            if not r["is_current"]:
                runs_to_delete.add(r["path"])
                total_size -= r["size"]

    # Execute deletion
    for run_path in runs_to_delete:
        try:
            # Tally size before removal
            reclaimed = 0
            for root, _, files in os.walk(run_path):
                for f in files:
                    try:
                        reclaimed += os.path.getsize(os.path.join(root, f))
                    except OSError:
                        pass
            shutil.rmtree(run_path, ignore_errors=True)
            stats["deleted_runs"] += 1
            stats["reclaimed_bytes"] += reclaimed
        except OSError:
            pass

    # Prune empty parent directories
    try:
        for year in os.listdir(base_logs_dir):
            yp = os.path.join(base_logs_dir, year)
            if not os.path.isdir(yp):
                continue
            for month in os.listdir(yp):
                mp = os.path.join(yp, month)
                if not os.path.isdir(mp):
                    continue
                for day_folder in os.listdir(mp):
                    dp = os.path.join(mp, day_folder)
                    if os.path.isdir(dp) and not os.listdir(dp):
                        try:
                            os.rmdir(dp)
                        except OSError:
                            pass
                if not os.listdir(mp):
                    try:
                        os.rmdir(mp)
                    except OSError:
                        pass
            if not os.listdir(yp):
                try:
                    os.rmdir(yp)
                except OSError:
                    pass
    except OSError:
        pass

    return stats


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
    
    # Run automated log retention and disk cleanup
    try:
        cleanup_stats = cleanup_old_logs(base_logs_dir=LOGS_ROOT_DIR, current_run_dir=run_dir)
        if cleanup_stats["deleted_runs"] > 0:
            logger.info(
                f'{{"event":"logs_cleaned", "deleted_runs":{cleanup_stats["deleted_runs"]}, "reclaimed_bytes":{cleanup_stats["reclaimed_bytes"]}}}'
            )
    except Exception as cleanup_err:
        logger.warning(f'{{"event":"logs_cleanup_warning", "error":"{str(cleanup_err)}"}}')

    _ACTIVE_LOGGER = logger
    return logger, run_dir
