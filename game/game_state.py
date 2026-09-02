"""Opening state helper. Browser physics remains intentionally client-side."""

from dataclasses import dataclass, field

from .constants import BACK_RANK
from .models import PieceState
from .observability_events import game_event


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
        state = cls(pieces=pieces)
        game_event(
            "GAME_STATE_CREATED",
            fields={
                "current_player": state.current_player,
                "piece_count": len(state.pieces),
                "white_piece_count": sum(1 for piece in state.pieces if piece.team == "white"),
                "black_piece_count": sum(1 for piece in state.pieces if piece.team == "black"),
            },
        )
        return state

    def snapshot(self) -> dict:
        snapshot = {
            "currentPlayer": self.current_player,
            "pieces": [piece.to_dict() for piece in self.pieces],
        }
        game_event(
            "GAME_STATE_SNAPSHOT",
            fields={
                "current_player": self.current_player,
                "piece_count": len(self.pieces),
                "alive_piece_count": sum(1 for piece in self.pieces if getattr(piece, "alive", True)),
            },
        )
        return snapshot
