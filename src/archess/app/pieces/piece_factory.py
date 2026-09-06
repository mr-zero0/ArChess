"""
Piece factory for Archess game.
Handles creation of pieces with proper configuration and initialization.
"""
from __future__ import annotations

import uuid
from typing import Dict, Tuple, Optional
from dataclasses import dataclass

from archess.app.core.game_state import Piece
from archess.app.config import piece_config
from archess.app.bootstrap.logging import get_logger


@dataclass
class PieceSpawnData:
    """Data needed to spawn a piece."""
    piece_type: str
    player_id: int
    position: Tuple[float, float, float]
    velocity: Tuple[float, float, float] = (0.0, 0.0, 0.0)


class PieceFactory:
    """
    Piece factory for Archess game.
    Handles creation of pieces with proper configuration and initialization.
    """

    def __init__(self):
        self.logger = get_logger()
        self.logger.info("piece_factory_created")

    def create_piece(self, piece_type: str, player_id: int,
                    position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
                    velocity: Tuple[float, float, float] = (0.0, 0.0, 0.0)) -> Piece:
        """
        Create a new piece with the specified parameters.

        Args:
            piece_type: Type of piece to create (king, queen, rook, etc.)
            player_id: ID of the player who owns this piece (0 or 1)
            position: Initial position (x, y, z)
            velocity: Initial velocity (vx, vy, vz)

        Returns:
            Piece: Newly created piece
        """
        # Validate inputs
        if player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0 or 1, got {player_id}")

        if piece_type not in piece_config.piece_types:
            self.logger.warning(
                "unknown_piece_type",
                piece_type=piece_type,
                defaulting_to="pawn"
            )
            piece_type = "pawn"

        # Get piece configuration
        piece_config_data = piece_config.piece_types[piece_type]

        # Get HP and mass from config or use defaults
        hp = piece_config_data.get("hp",
                                 piece_config.king_hp if piece_type == "king"
                                 else piece_config.piece_hp)
        mass = piece_config_data.get("mass",
                                   piece_config.king_mass if piece_type == "king"
                                   else piece_config.piece_mass)

        # Create unique ID
        piece_id = str(uuid.uuid4())

        # Create the piece
        piece = Piece(
            id=piece_id,
            piece_type=piece_type,
            player_id=player_id,
            hp=hp,
            max_hp=hp,
            mass=mass,
            position=position,
            velocity=velocity
        )

        self.logger.debug(
            "piece_created",
            piece_id=piece_id,
            piece_type=piece_type,
            player_id=player_id,
            hp=hp,
            mass=mass
        )

        return piece

    def create_standard_set(self, player_id: int,
                          base_position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
                          spacing: float = 2.0) -> Dict[str, Piece]:
        """
        Create a standard set of pieces for a player.

        Args:
            player_id: ID of the player (0 or 1)
            base_position: Base position to start placing pieces
            spacing: Spacing between pieces

        Returns:
            Dict[str, Piece]: Dictionary mapping piece IDs to pieces
        """
        if player_id not in [0, 1]:
            raise ValueError(f"Player ID must be 0 or 1, got {player_id}")

        pieces = {}
        pos_x, pos_y, pos_z = base_position

        # Create pieces in standard chess arrangement
        # Back row: rook, knight, bishop, king, queen, bishop, knight, rook
        back_row = ["rook", "knight", "bishop", "king", "queen", "bishop", "knight", "rook"]
        # Front row: 8 pawns
        front_row = ["pawn"] * 8

        # Place back row
        for i, piece_type in enumerate(back_row):
            position = (pos_x + i * spacing, pos_y, pos_z)
            piece = self.create_piece(piece_type, player_id, position)
            pieces[piece.id] = piece

        # Place front row
        for i, piece_type in enumerate(front_row):
            position = (pos_x + i * spacing, pos_y + spacing, pos_z)
            piece = self.create_piece(piece_type, player_id, position)
            pieces[piece.id] = piece

        self.logger.info(
            "standard_piece_set_created",
            player_id=player_id,
            piece_count=len(pieces)
        )

        return pieces

    def cleanup(self) -> None:
        """Clean up piece factory resources."""
        self.logger.info("piece_factory_cleaning_up")


if __name__ == "__main__":
    # For testing purposes
    print("PieceFactory module loaded successfully")