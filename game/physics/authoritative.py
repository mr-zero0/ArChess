"""Deterministic server-authoritative combat simulation primitives."""
from __future__ import annotations

from dataclasses import dataclass
import math

from game.constants import BOARD_SIZE, GAME_CONFIG, PIECE_STATS
from game.physics.state_hash import shot_hash, state_hash


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
    """Deterministic 2D combat simulation used by multiplayer authority."""

    def __init__(self, pieces: list[ServerPiece], current_team: str = "white"):
        self.pieces = pieces
        self.current_team = current_team
        self.sim_time = 0.0
        self._hit_pairs: dict[tuple[str, str], float] = {}
        self._pending_integrity: dict | None = None
        self.last_integrity: dict | None = None
        self.game_over = any(p.type == "king" and not p.alive for p in pieces)

    @classmethod
    def new_match(cls) -> "AuthoritativeSimulation":
        pieces: list[ServerPiece] = []
        back_rank = ("rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook")
        from uuid import uuid4
        for col, piece_type in enumerate(back_rank):
            pieces.append(ServerPiece(str(uuid4()), piece_type, "black", col + 0.5, 0.5))
            pieces.append(ServerPiece(str(uuid4()), "pawn", "black", col + 0.5, 1.5))
            pieces.append(ServerPiece(str(uuid4()), "pawn", "white", col + 0.5, 6.5))
            pieces.append(ServerPiece(str(uuid4()), piece_type, "white", col + 0.5, 7.5))
        return cls(pieces)

    @classmethod
    def from_snapshot(cls, snapshot: dict) -> "AuthoritativeSimulation":
        pieces = []
        for item in snapshot.get("pieces", []):
            piece_type = str(item["type"])
            pieces.append(
                ServerPiece(
                    id=str(item["id"]),
                    type=piece_type,
                    team=str(item["team"]),
                    x=float(item["x"]),
                    y=float(item["y"]),
                    vx=float(item.get("vx", 0.0)),
                    vy=float(item.get("vy", 0.0)),
                    hp=int(item.get("hp", PIECE_STATS[piece_type]["hp"])),
                    alive=bool(item.get("alive", True)),
                )
            )
        simulation = cls(pieces, str(snapshot.get("currentTeam", "white")))
        simulation.game_over = bool(snapshot.get("gameOver", simulation.game_over))
        simulation.last_integrity = snapshot.get("integrity")
        return simulation

    def _prepare_integrity(self, intent: dict) -> None:
        self._pending_integrity = {
            "pre": self.snapshot(include_integrity=False),
            "intent": intent,
        }
        self.last_integrity = None

    def _finalize_integrity(self) -> dict | None:
        if not self._pending_integrity:
            return None
        post_state = self.snapshot(include_integrity=False)
        pre_state = self._pending_integrity["pre"]
        intent = self._pending_integrity["intent"]
        integrity = {
            "preHash": state_hash(pre_state),
            "postHash": state_hash(post_state),
            "shotHash": shot_hash(pre_state, intent, post_state),
            "intent": intent,
        }
        self.last_integrity = integrity
        self._pending_integrity = None
        return integrity

    def validate_launch(self, team: str, piece_id: str, vx: float, vy: float) -> tuple[bool, str | None]:
        if self.game_over:
            return False, "match_over"
        if team not in {"white", "black"}:
            return False, "invalid_team"
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
        if speed <= 0:
            return False, "zero_velocity"
        if speed > GAME_CONFIG["maxLaunchSpeed"] + 1e-9:
            return False, "speed_exceeded"
        return True, None

    def resolve_drag(self, team: str, piece_id: str, dx: float, dy: float) -> tuple[tuple[float, float] | None, str | None]:
        if not math.isfinite(dx) or not math.isfinite(dy):
            return None, "invalid_drag"
        distance = math.hypot(dx, dy)
        if distance < GAME_CONFIG.get("minDragDistance", 0.10):
            return None, "zero_drag"
        piece = next((p for p in self.pieces if p.id == piece_id), None)
        if piece is None:
            return None, "piece_not_found"
        clamped = min(distance, GAME_CONFIG["maxDragDistance"])
        scale = clamped / distance
        launch_mul = PIECE_STATS[piece.type].get("launchMul", 1.0)
        vx = dx * scale * GAME_CONFIG["launchStrength"] * launch_mul
        vy = dy * scale * GAME_CONFIG["launchStrength"] * launch_mul
        speed = math.hypot(vx, vy)
        if speed > GAME_CONFIG["maxLaunchSpeed"]:
            speed_scale = GAME_CONFIG["maxLaunchSpeed"] / speed
            vx *= speed_scale
            vy *= speed_scale
        return (vx, vy), None

    def launch_intent(self, team: str, piece_id: str, dx: float, dy: float) -> tuple[bool, str | None]:
        vector, reason = self.resolve_drag(team, piece_id, dx, dy)
        if vector is None:
            return False, reason
        self._prepare_integrity({"mode": "drag", "team": team, "pieceId": piece_id, "dx": dx, "dy": dy})
        return self.launch(team, piece_id, vector[0], vector[1], _record_integrity=False)

    def launch(self, team: str, piece_id: str, vx: float, vy: float, _record_integrity: bool = True) -> tuple[bool, str | None]:
        """Apply a pre-resolved velocity; retained for compatibility with legacy vector clients/tests."""
        valid, reason = self.validate_launch(team, piece_id, vx, vy)
        if not valid:
            return False, reason
        if _record_integrity:
            self._prepare_integrity({"mode": "vector", "team": team, "pieceId": piece_id, "vx": vx, "vy": vy})
        piece = next(p for p in self.pieces if p.id == piece_id)
        piece.vx = vx
        piece.vy = vy
        self.current_team = "black" if team == "white" else "white"
        return True, None

    def advance_until_settled(self, dt: float = 1.0 / 120.0, max_steps: int = 720) -> list[dict]:
        events: list[dict] = []
        for _ in range(max_steps):
            events.extend(self.step(dt))
            active = any(p.alive and math.hypot(p.vx, p.vy) >= GAME_CONFIG["minVelocity"] for p in self.pieces)
            if not active or self.game_over:
                break
        integrity = self._finalize_integrity()
        if integrity:
            events.append({"type": "integrity", **integrity})
        return events

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
            decay = PIECE_STATS[piece.type]["friction"] ** (dt * 60.0)
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
        destroyed = []
        if a.hp == 0:
            a.alive = False
            a.vx = a.vy = 0.0
            destroyed.append(a.id)
        if b.hp == 0:
            b.alive = False
            b.vx = b.vy = 0.0
            destroyed.append(b.id)
        if any(p.type == "king" and not p.alive for p in self.pieces):
            self.game_over = True
        return {
            "type": "collision",
            "impact": impact,
            "damaged": True,
            "damageToA": damage_a,
            "damageToB": damage_b,
            "destroyed": destroyed,
        }

    @staticmethod
    def _damage(attacker: ServerPiece, impact: float) -> int:
        normalized = min(1.6, impact * attacker.collision_mul / GAME_CONFIG["impactReferenceSpeed"])
        raw = attacker.power * normalized * GAME_CONFIG["damageMultiplier"] * attacker.damage_mul
        return max(1, min(GAME_CONFIG["maxCollisionDamage"], round(raw)))

    def snapshot(self, include_integrity: bool = True) -> dict:
        snapshot = {
            "currentTeam": self.current_team,
            "gameOver": self.game_over,
            "pieces": [
                {
                    "id": p.id,
                    "type": p.type,
                    "team": p.team,
                    "x": p.x,
                    "y": p.y,
                    "vx": p.vx,
                    "vy": p.vy,
                    "hp": p.hp,
                    "maxHp": PIECE_STATS[p.type]["hp"],
                    "alive": p.alive,
                }
                for p in self.pieces
            ],
        }
        if include_integrity and self.last_integrity:
            snapshot["integrity"] = self.last_integrity
        return snapshot
