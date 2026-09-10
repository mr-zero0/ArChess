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
    print(f"[*] Launching ArChess Server on http://{host}:{port} ...")
    app.run(host=host, port=port, debug=True)
