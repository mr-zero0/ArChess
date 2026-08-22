"""Small serializable state models."""
from dataclasses import asdict, dataclass
from uuid import uuid4
from .constants import PIECE_STATS

@dataclass(slots=True)
class PieceState:
    id: str
    type: str
    team: str
    x: float
    y: float
    vx: float
    vy: float
    hp: int
    max_hp: int
    power: int
    radius: float
    mass: float
    alive: bool = True

    @classmethod
    def create(cls, piece_type: str, team: str, x: float, y: float) -> "PieceState":
        stats = PIECE_STATS[piece_type]
        return cls(
            id=str(uuid4()),
            type=piece_type,
            team=team,
            x=x,
            y=y,
            vx=0.0,
            vy=0.0,
            hp=stats["hp"],
            max_hp=stats["hp"],
            power=stats["power"],
            radius=stats["radius"],
            mass=stats["mass"],
        )

    def to_dict(self) -> dict:
        data = asdict(self)
        data["maxHp"] = data.pop("max_hp")
        return data