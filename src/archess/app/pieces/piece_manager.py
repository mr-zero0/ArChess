"""
Piece manager for Archess game.
Handles piece lifecycle, grouping, and piece-related queries.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from collections import defaultdict

from archess.app.core.game_state import GameStateManager, Piece
from archess.app.config import piece_config
from archess.app.bootstrap.logging import get_logger


@dataclass
class PieceStats:
    """Statistics for a group of pieces."""
    count: int
    total_hp: int
    average_hp: float
    type_distribution: dict  # piece_type -> count


class PieceManager:
    """
    Piece manager for Archess game.
    Handles piece lifecycle, grouping, and piece-related queries.
    """

    def __init__(self, game_state: GameStateManager):
        self.logger = get_logger()
        self.game_state = game_state
        self.logger.info("piece_manager_created")

    def get_pieces_by_player(self, player_id: int) -> Dict[str, Piece]:
        """
        Get all pieces belonging to a specific player.

        Args:
            player_id: ID of the player (0 or 1)

        Returns:
            Dict[str, Piece]: Dictionary mapping piece IDs to pieces
        """
        if player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0 or 1, got {player_id}")

        all_pieces = self.game_state.get_pieces()
        return {
            piece_id: piece for piece_id, piece in all_pieces.items()
            if piece.player_id == player_id
        }

    def get_active_pieces_by_player(self, player_id: int) -> Dict[str, Piece]:
        """
        Get all active pieces belonging to a specific player.

        Args:
            player_id: ID of the player (0 or 1)

        Returns:
            Dict[str, Piece]: Dictionary mapping piece IDs to active pieces
        """
        if player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0 or 1, got {player_id}")

        active_pieces = self.game_state.get_active_pieces()
        return {
            piece_id: piece for piece_id, piece in active_pieces.items()
            if piece.player_id == player_id
        }

    def get_pieces_by_type(self, piece_type: str) -> Dict[str, Piece]:
        """
        Get all pieces of a specific type.

        Args:
            piece_type: Type of piece to filter by

        Returns:
            Dict[str, Piece]: Dictionary mapping piece IDs to pieces
        """
        all_pieces = self.game_state.get_pieces()
        return {
            piece_id: piece for piece_id, piece in all_pieces.items()
            if piece.piece_type == piece_type
        }

    def get_king_piece(self, player_id: int) -> Optional[Piece]:
        """
        Get the king piece for a specific player.

        Args:
            player_id: ID of the player (0 or 1)

        Returns:
            Optional[Piece]: King piece if found and active, None otherwise
        """
        if player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0 or 1, got {player_id}")

        pieces = self.get_pieces_by_player(player_id)
        for piece in pieces.values():
            if piece.piece_type == "king" and piece.is_active:
                return piece
        return None

    def get_piece_stats(self, player_id: Optional[int] = None) -> PieceStats:
        """
        Get statistics for pieces, optionally filtered by player.

        Args:
            player_id: Optional player ID to filter by (None for all players)

        Returns:
            PieceStats: Statistics about the pieces
        """
        if player_id is not None and player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0, 1, or None, got {player_id}")

        # Get pieces based on filter
        if player_id is None:
            pieces_dict = self.game_state.get_pieces()
        else:
            pieces_dict = self.get_pieces_by_player(player_id)

        # Calculate statistics
        count = len(pieces_dict)
        total_hp = sum(piece.hp for piece in pieces_dict.values())
        average_hp = total_hp / count if count > 0 else 0.0

        # Type distribution
        type_distribution = defaultdict(int)
        for piece in pieces_dict.values():
            type_distribution[piece.piece_type] += 1

        return PieceStats(
            count=count,
            total_hp=total_hp,
            average_hp=average_hp,
            type_distribution=dict(type_distribution)
        )

    def is_piece_alive(self, piece_id: str) -> bool:
        """
        Check if a piece is alive (has HP > 0 and is active).

        Args:
            piece_id: ID of the piece to check

        Returns:
            bool: True if piece is alive, False otherwise
        """
        piece = self.game_state.get_piece(piece_id)
        if not piece:
            return False
        return piece.hp > 0 and piece.is_active

    def get_living_piece_count(self, player_id: Optional[int] = None) -> int:
        """
        Get the count of living pieces, optionally filtered by player.

        Args:
            player_id: Optional player ID to filter by (None for all players)

        Returns:
            int: Number of living pieces
        """
        if player_id is not None and player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0, 1, or None, got {player_id}")

        if player_id is None:
            pieces = self.game_state.get_pieces().values()
        else:
            pieces = self.get_pieces_by_player(player_id).values()

        return sum(1 for piece in pieces if self.is_piece_alive(piece.id))

    def cleanup(self) -> None:
        """Clean up piece manager resources."""
        self.logger.info("piece_manager_cleaning_up")


if __name__ == "__main__":
    # For testing purposes
    print("PieceManager module loaded successfully")