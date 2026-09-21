"""
ARCHESS - Application Server Entrypoint
Starts the ArChess authoritative web application & REST APIs.
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
except ImportError:
    pass

from backend.app import app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")  # nosec B104
    debug_mode = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true")
    is_prod = (
        os.environ.get("FLASK_ENV") == "production"
        or os.environ.get("PRODUCTION", "0").lower() in ("1", "true")
        or "--production" in sys.argv
    )

    if is_prod and not debug_mode:
        print(f"[*] Launching ArChess Production Server on http://{host}:{port} ...")
        print("[*] WebSocket & REST API routes active.")
        print("[*] Note: In Linux container/VPS deployments, launch via Gunicorn:")
        print("    gunicorn -w 1 -k gthread --threads 16 -b 0.0.0.0:5000 run:app")
        app.run(host=host, port=port, debug=False)
    else:
        print(f"[*] Launching ArChess Development Server on http://{host}:{port} (debug={debug_mode}) ...")
        app.run(host=host, port=port, debug=debug_mode)

