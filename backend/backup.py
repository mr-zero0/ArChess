"""
ARCHESS - Automated Database Backup Utility
Performs online, transactionally consistent backups of the SQLite database
using SQLite's online backup API (no server downtime or table locking).
"""

import os
import glob
import sqlite3
import datetime
from backend.database import get_connection, DB_PATH

def perform_backup(backup_dir=None, retention_count=10):
    """
    Perform a live, online backup of the active database into a timestamped file.
    Rotates old backups to maintain the retention_count limit.
    
    Returns:
        dict: Metadata with backup path, size_bytes, timestamp, and status.
    """
    if backup_dir is None:
        data_dir = os.path.dirname(os.path.abspath(DB_PATH))
        backup_dir = os.path.join(data_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    backup_filename = f"archess_backup_{timestamp}.db"
    dest_path = os.path.join(backup_dir, backup_filename)

    src_conn = get_connection()
    try:
        dest_conn = sqlite3.connect(dest_path)
        try:
            # Native SQLite non-blocking page-by-page online backup
            with dest_conn:
                src_conn.backup(dest_conn, pages=100)
        finally:
            dest_conn.close()
    finally:
        src_conn.close()

    file_size = os.path.getsize(dest_path)

    # Backup rotation / retention
    backups = sorted(
        glob.glob(os.path.join(backup_dir, "archess_backup_*.db")),
        key=os.path.getmtime
    )
    if len(backups) > retention_count:
        for old_backup in backups[:-retention_count]:
            try:
                os.remove(old_backup)
            except OSError:
                pass

    return {
        "status": "success",
        "backup_path": dest_path,
        "backup_filename": backup_filename,
        "size_bytes": file_size,
        "timestamp": timestamp,
        "total_backups_retained": min(len(backups), retention_count)
    }

def main():
    """CLI entrypoint for database backup execution."""
    result = perform_backup()
    print(f"[*] ArChess Backup Complete: {result['backup_filename']} ({result['size_bytes']} bytes)")
    return result

if __name__ == "__main__":
    main()
