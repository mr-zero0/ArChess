"""
Main entry point for Archess game.
Allows running the game with: python -m archess
"""
import sys
import asyncio

from archess.app.bootstrap.app import ArchessApplication


def main() -> int:
    """Main entry point."""
    app = ArchessApplication()
    return asyncio.run(app.run())


if __name__ == "__main__":
    sys.exit(main())