"""Opening state helper. Browser physics remains intentionally client-side."""

from dataclasses import dataclass, field

from .constants import BACK_RANK
from .models import PieceState


@dataclass(slots=True)
class GameState:
    current_player: str = "white"
    pieces: list[PieceState] = field(default_factory=list)

    @classmethod
    def new(cls) -> "GameState":
        pieces: list[PieceState] = []
        for col, piece_type in enumerate(BACK_RANK):
            pieces.append(PieceState.create(piece_type, "black", col + 0.5, 0.5))
            pieces.append(PieceState.create("pawn", "black", col + 0.5, 1.5))
            pieces.append(PieceState.create("pawn", "white", col + 0.5, 6.5))
            pieces.append(PieceState.create(piece_type, "white", col + 0.5, 7.5))
        return cls(pieces=pieces)

    def snapshot(self) -> dict:
        return {
            "currentPlayer": self.current_player,
            "pieces": [piece.to_dict() for piece in self.pieces],
        }
