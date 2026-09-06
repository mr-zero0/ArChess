"""
Pieces system for Archess game.
Handles piece creation, management, and piece-specific behaviors.
"""
from __future__ import annotations

from .piece_factory import PieceFactory
from .piece_manager import PieceManager

__all__ = ["PieceFactory", "PieceManager"]