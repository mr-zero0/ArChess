"""
ARCHESS - Vercel Serverless WSGI Entry Point
Exposes Flask WSGI application callable for Vercel Python Runtime.
"""

import os
import sys

# Ensure project root is present in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import app

# Export callable for Vercel
app = app
