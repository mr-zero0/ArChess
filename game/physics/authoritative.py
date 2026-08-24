"""Deterministic server-authoritative combat simulation primitives."""
from __future__ import annotations

from dataclasses import dataclass
import math

from game.constants import BOARD_SIZE, GAME_CONFIG, PIECE_STATS


@dataclass
class ServerPiece:
    id: str
    type: str
    team: str
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    hp: int = 0
    alive: bool = True

    def __post_init__(self):
        stats = PIECE_STATS[self.type]
        if not self.hp:
            self.hp = stats["hp"]

    @property
    def power(self):
        return PIECE_STATS[self.type]["power"]

    @property
    def mass(self):
        return PIECE_STATS[self.type]["mass"]

    @property
    def radius(self):
        return PIECE_STATS[self.type]["radius"]

    @property
    def damage_mul(self):
        return PIECE_STATS[self.type]["damageMul"]

    @property
    def collision_mul(self):
        return PIECE_STATS[self.type]["collisionMul"]

    @property
    def restitution(self):
        return PIECE_STATS[self.type]["restitution"]


class AuthoritativeSimulation:
    """Small deterministic 2D simulation used by the multiplayer authority."""

    def __init__(self, pieces: list[ServerPiece], current_team: str = "white"):
        self.pieces = pieces
        self.current_team = current_team
        self.sim_time = 0.0
        self._hit_pairs: dict[tuple[str, str], float] = {}
        self.game_over = False

    def validate_launch(self, team: str, piece_id: str, vx: float, vy: float) -> tuple[bool, str | None]:
        if self.game_over:
            return False, "match_over"
        if team != self.current_team:
            return False, "not_your_turn"
        piece = next((p for p in self.pieces if p.id == piece_id), None)
        if piece is None:
            return False, "piece_not_found"
        if not piece.alive:
            return False, "piece_dead"
        if piece.team != team:
            return False, "piece_not_owned"
        if not math.isfinite(vx) or not math.isfinite(vy):
            return False, "invalid_vector"
        speed = math.hypot(vx, vy)
        if speed > GAME_CONFIG["maxLaunchSpeed"] + 1e-9:
            return False, "speed_exceeded"
        return True, None

    def launch(self, team: str, piece_id: str, vx: float, vy: float) -> tuple[bool, str | None]:
        valid, reason = self.validate_launch(team, piece_id, vx, vy)
        if not valid:
            return False, reason
        piece = next(p for p in self.pieces if p.id == piece_id)
        piece.vx = vx
        piece.vy = vy
        self.current_team = "black" if team == "white" else "white"
        return True, None

    def step(self, dt: float) -> list[dict]:
        if dt <= 0 or not math.isfinite(dt):
            raise ValueError("dt must be positive and finite")
        self.sim_time += dt
        events: list[dict] = []
        for piece in self.pieces:
            if not piece.alive:
                continue
            piece.x += piece.vx * dt
            piece.y += piece.vy * dt
            decay = GAME_CONFIG["friction"] ** (dt * 60.0)
            piece.vx *= decay
            piece.vy *= decay
            self._bounce(piece)

        for i, a in enumerate(self.pieces):
            if not a.alive:
                continue
            for b in self.pieces[i + 1:]:
                if not b.alive:
                    continue
                event = self._collide(a, b)
                if event:
                    events.append(event)

        for piece in self.pieces:
            if piece.alive and math.hypot(piece.vx, piece.vy) < GAME_CONFIG["minVelocity"]:
                piece.vx = piece.vy = 0.0
        return events

    def _bounce(self, piece: ServerPiece):
        lo, hi = piece.radius, BOARD_SIZE - piece.radius
        if piece.x < lo:
            piece.x = lo
            if piece.vx < 0:
                piece.vx *= -piece.restitution
        elif piece.x > hi:
            piece.x = hi
            if piece.vx > 0:
                piece.vx *= -piece.restitution
        if piece.y < lo:
            piece.y = lo
            if piece.vy < 0:
                piece.vy *= -piece.restitution
        elif piece.y > hi:
            piece.y = hi
            if piece.vy > 0:
                piece.vy *= -piece.restitution

    def _collide(self, a: ServerPiece, b: ServerPiece) -> dict | None:
        dx, dy = b.x - a.x, b.y - a.y
        distance = math.hypot(dx, dy)
        minimum = a.radius + b.radius
        if distance >= minimum:
            return None
        if distance < 1e-9:
            dx, dy, distance = 1.0, 0.0, 1.0
        nx, ny = dx / distance, dy / distance
        overlap = minimum - distance
        inv_a, inv_b = 1 / a.mass, 1 / b.mass
        total = inv_a + inv_b
        a.x -= nx * overlap * inv_a / total
        a.y -= ny * overlap * inv_a / total
        b.x += nx * overlap * inv_b / total
        b.y += ny * overlap * inv_b / total

        rvx, rvy = b.vx - a.vx, b.vy - a.vy
        normal_velocity = rvx * nx + rvy * ny
        if normal_velocity >= 0:
            return None
        impact = -normal_velocity
        restitution = (a.restitution + b.restitution) * 0.5
        impulse = -(1 + restitution) * normal_velocity / total
        ix, iy = impulse * nx, impulse * ny
        a.vx -= ix * inv_a
        a.vy -= iy * inv_a
        b.vx += ix * inv_b
        b.vy += iy * inv_b

        if impact < GAME_CONFIG["minDamageImpact"]:
            return {"type": "collision", "impact": impact, "damaged": False}

        key = tuple(sorted((a.id, b.id)))
        last = self._hit_pairs.get(key, -math.inf)
        if self.sim_time - last < GAME_CONFIG["collisionCooldown"]:
            return {"type": "collision", "impact": impact, "damaged": False, "cooldown": True}
        self._hit_pairs[key] = self.sim_time

        damage_a = self._damage(b, impact)
        damage_b = self._damage(a, impact)
        a.hp = max(0, a.hp - damage_a)
        b.hp = max(0, b.hp - damage_b)
        if a.hp == 0:
            a.alive = False
        if b.hp == 0:
            b.alive = False
        if any(p.type == "king" and not p.alive for p in self.pieces):
            self.game_over = True
        return {"type": "collision", "impact": impact, "damaged": True, "damageToA": damage_a, "damageToB": damage_b}

    @staticmethod
    def _damage(attacker: ServerPiece, impact: float) -> int:
        normalized = min(1.6, impact * attacker.collision_mul / GAME_CONFIG["impactReferenceSpeed"])
        raw = attacker.power * normalized * GAME_CONFIG["damageMultiplier"] * attacker.damage_mul
        return max(1, min(GAME_CONFIG["maxCollisionDamage"], round(raw)))

    def snapshot(self) -> dict:
        return {
            "currentTeam": self.current_team,
            "gameOver": self.game_over,
            "pieces": [
                {"id": p.id, "type": p.type, "team": p.team, "x": p.x, "y": p.y,
                 "vx": p.vx, "vy": p.vy, "hp": p.hp, "alive": p.alive}
                for p in self.pieces
            ],
        }
