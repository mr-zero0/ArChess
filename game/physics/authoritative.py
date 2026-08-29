"""Deterministic server-authoritative combat simulation primitives."""
from __future__ import annotations

from dataclasses import dataclass
import logging
import math

from core.logging_config import log_event
from game.constants import BOARD_SIZE, GAME_CONFIG, PIECE_STATS
from game.physics.state_hash import shot_hash, state_hash


_OBSERVABILITY_LOGGER = logging.getLogger("archess_app")


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

    def _domain_event(self, level: int, event: str, *, message: str | None = None, fields: dict | None = None) -> None:
        """Emit a compact causal event without making observability part of simulation state."""
        try:
            log_event(
                _OBSERVABILITY_LOGGER,
                level,
                event,
                message,
                fields={
                    "simulation_time": round(self.sim_time, 6),
                    "current_team": self.current_team,
                    "game_over": self.game_over,
                    **(fields or {}),
                },
            )
        except Exception:
            return

    @classmethod
    def new_match(cls) -> "AuthoritativeSimulation":
        pieces: list[ServerPiece] = []
        back_rank = ("rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook")
        for col, piece_type in enumerate(back_rank):
            pieces.append(ServerPiece(f"black-{piece_type}-{col}", piece_type, "black", col + 0.5, 0.5))
            pieces.append(ServerPiece(f"black-pawn-{col}", "pawn", "black", col + 0.5, 1.5))
            pieces.append(ServerPiece(f"white-pawn-{col}", "pawn", "white", col + 0.5, 6.5))
            pieces.append(ServerPiece(f"white-{piece_type}-{col}", piece_type, "white", col + 0.5, 7.5))
        simulation = cls(pieces)
        simulation._domain_event(logging.INFO, "MATCH_CREATED", fields={"piece_count": len(pieces)})
        return simulation

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
        simulation._domain_event(logging.DEBUG, "MATCH_REHYDRATED", fields={"piece_count": len(pieces)})
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
        self._domain_event(logging.DEBUG, "SHOT_INTEGRITY_FINALIZED", fields={"shot_hash": integrity["shotHash"]})
        return integrity

    def validate_launch(self, team: str, piece_id: str, vx: float, vy: float) -> tuple[bool, str | None]:
        reason = None
        if self.game_over:
            reason = "match_over"
        elif team not in {"white", "black"}:
            reason = "invalid_team"
        elif team != self.current_team:
            reason = "not_your_turn"
        else:
            piece = next((p for p in self.pieces if p.id == piece_id), None)
            if piece is None:
                reason = "piece_not_found"
            elif not piece.alive:
                reason = "piece_dead"
            elif piece.team != team:
                reason = "piece_not_owned"
            elif not math.isfinite(vx) or not math.isfinite(vy):
                reason = "invalid_vector"
            else:
                speed = math.hypot(vx, vy)
                if speed <= 0:
                    reason = "zero_velocity"
                elif speed > GAME_CONFIG["maxLaunchSpeed"] + 1e-9:
                    reason = "speed_exceeded"
        if reason:
            self._domain_event(logging.WARNING, "LAUNCH_REJECTED", fields={"team": team, "piece_id": piece_id, "vx": vx, "vy": vy, "reason": reason})
            return False, reason
        return True, None

    def resolve_drag(self, team: str, piece_id: str, dx: float, dy: float) -> tuple[tuple[float, float] | None, str | None]:
        if not math.isfinite(dx) or not math.isfinite(dy):
            self._domain_event(logging.WARNING, "DRAG_REJECTED", fields={"team": team, "piece_id": piece_id, "dx": dx, "dy": dy, "reason": "invalid_drag"})
            return None, "invalid_drag"
        distance = math.hypot(dx, dy)
        if distance < GAME_CONFIG.get("minDragDistance", 0.10):
            self._domain_event(logging.DEBUG, "DRAG_REJECTED", fields={"team": team, "piece_id": piece_id, "dx": dx, "dy": dy, "reason": "zero_drag"})
            return None, "zero_drag"
        piece = next((p for p in self.pieces if p.id == piece_id), None)
        if piece is None:
            self._domain_event(logging.WARNING, "DRAG_REJECTED", fields={"team": team, "piece_id": piece_id, "reason": "piece_not_found"})
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
        self._domain_event(logging.DEBUG, "DRAG_RESOLVED", fields={"team": team, "piece_id": piece_id, "piece_type": piece.type, "dx": dx, "dy": dy, "vx": vx, "vy": vy, "speed": math.hypot(vx, vy)})
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
        previous_team = self.current_team
        self.current_team = "black" if team == "white" else "white"
        self._domain_event(logging.INFO, "LAUNCH_ACCEPTED", fields={"team": team, "piece_id": piece_id, "piece_type": piece.type, "vx": vx, "vy": vy, "speed": math.hypot(vx, vy), "previous_team": previous_team, "next_team": self.current_team})
        return True, None

    def advance_until_settled(self, dt: float = 1.0 / 120.0, max_steps: int = 720) -> list[dict]:
        events: list[dict] = []
        for step_number in range(max_steps):
            events.extend(self.step(dt))
            active = any(p.alive and math.hypot(p.vx, p.vy) >= GAME_CONFIG["minVelocity"] for p in self.pieces)
            if not active or self.game_over:
                self._domain_event(logging.INFO, "PHYSICS_SETTLED", fields={"step_count": step_number + 1, "event_count": len(events), "game_over": self.game_over, "moving_piece_count": sum(1 for p in self.pieces if p.alive and math.hypot(p.vx, p.vy) >= GAME_CONFIG["minVelocity"])})
                break
        else:
            self._domain_event(logging.WARNING, "PHYSICS_SETTLE_TIMEOUT", fields={"max_steps": max_steps, "event_count": len(events)})
        integrity = self._finalize_integrity()
        if integrity:
            events.append({"type": "integrity", **integrity})
        return events

    def step(self, dt: float) -> list[dict]:
        if dt <= 0 or not math.isfinite(dt):
            self._domain_event(logging.ERROR, "PHYSICS_STEP_REJECTED", fields={"dt": dt, "reason": "invalid_dt"})
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
            self._domain_event(logging.DEBUG, "COLLISION_SEPARATED_NO_IMPACT", fields={"piece_a": a.id, "piece_b": b.id, "overlap": overlap})
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
            event = {"type": "collision", "impact": impact, "damaged": False}
            self._domain_event(logging.INFO, "COLLISION_RESOLVED", fields={"piece_a": a.id, "piece_b": b.id, "impact": impact, "damaged": False})
            return event

        key = tuple(sorted((a.id, b.id)))
        last = self._hit_pairs.get(key, -math.inf)
        if self.sim_time - last < GAME_CONFIG["collisionCooldown"]:
            self._domain_event(logging.DEBUG, "COLLISION_COOLDOWN", fields={"piece_a": a.id, "piece_b": b.id, "impact": impact, "elapsed_since_hit": self.sim_time - last})
            return {"type": "collision", "impact": impact, "damaged": False, "cooldown": True}
        self._hit_pairs[key] = self.sim_time

        damage_a = self._damage(b, impact)
        damage_b = self._damage(a, impact)
        hp_before_a, hp_before_b = a.hp, b.hp
        a.hp = max(0, a.hp - damage_a)
        b.hp = max(0, b.hp - damage_b)
        destroyed: list[dict] = []
        if a.hp == 0 and a.alive:
            a.alive = False
            a.vx = a.vy = 0.0
            destroyed.append({"type": "destroyed", "piece": a.id, "killer": b.team})
        if b.hp == 0 and b.alive:
            b.alive = False
            b.vx = b.vy = 0.0
            destroyed.append({"type": "destroyed", "piece": b.id, "killer": a.team})
        if a.type == "king" and not a.alive or b.type == "king" and not b.alive:
            self.game_over = True
        self._domain_event(logging.INFO, "COLLISION_DAMAGE", fields={"piece_a": a.id, "piece_b": b.id, "impact": impact, "damage_a": damage_a, "damage_b": damage_b, "hp_before_a": hp_before_a, "hp_before_b": hp_before_b, "hp_after_a": a.hp, "hp_after_b": b.hp})
        return {"type": "collision", "impact": impact, "damaged": True, "pieceA": a.id, "pieceB": b.id, "damageA": damage_a, "damageB": damage_b, "destroyed": destroyed}

    def _damage(self, attacker: ServerPiece, impact: float) -> int:
        stats = PIECE_STATS[attacker.type]
        impact_force = impact * GAME_CONFIG["collisionMultiplier"] * stats["collisionMul"]
        normalized = min(1.6, impact_force / GAME_CONFIG["impactReferenceSpeed"])
        raw = stats["power"] * normalized * GAME_CONFIG["damageMultiplier"] * stats["damageMul"]
        return max(1, min(GAME_CONFIG["maxCollisionDamage"], round(raw)))

    def snapshot(self, *, include_integrity: bool = True) -> dict:
        payload = {
            "currentTeam": self.current_team,
            "gameOver": self.game_over,
            "pieces": [
                {"id": p.id, "type": p.type, "team": p.team, "x": p.x, "y": p.y, "vx": p.vx, "vy": p.vy, "hp": p.hp, "alive": p.alive}
                for p in self.pieces
            ],
        }
        if include_integrity and self.last_integrity:
            payload["integrity"] = self.last_integrity
        return payload
