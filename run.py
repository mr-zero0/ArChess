"""
ARCHESS - Application Server Entrypoint
Starts the ArChess authoritative web application & REST APIs.
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")  # nosec B104
    debug_mode = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true")
    print(f"[*] Launching ArChess Server on http://{host}:{port} (debug={debug_mode}) ...")
    app.run(host=host, port=port, debug=debug_mode)

