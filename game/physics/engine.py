"""Deterministic 2D physics engine for ArChess server-side state."""
from __future__ import annotations

import math
from typing import Any

from game.constants import BOARD_SIZE, GAME_CONFIG


class PhysicsEngine:
    """Deterministic combat physics operating directly on GameState/PieceState."""

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or GAME_CONFIG
        self._sim_time = 0.0
        self._hit_pairs: dict[tuple[str, str], float] = {}

    @property
    def sim_time(self) -> float:
        return self._sim_time

    def reset(self) -> None:
        self._sim_time = 0.0
        self._hit_pairs.clear()

    def step(self, state, dt: float) -> list[dict[str, Any]]:
        """Advance the state by ``dt`` and return collision/damage events."""
        if not math.isfinite(dt) or dt <= 0:
            raise ValueError("dt must be positive and finite")

        substeps = max(1, min(8, int(self.config.get("physicsSubsteps", 1))))
        step_dt = dt / substeps
        events: list[dict[str, Any]] = []

        for _ in range(substeps):
            self._sim_time += step_dt
            for piece in state.pieces:
                if not piece.alive:
                    continue
                self._integrate(piece, step_dt)
                self._resolve_boundary(piece)

            for i, first in enumerate(state.pieces):
                if not first.alive:
                    continue
                for second in state.pieces[i + 1 :]:
                    if not second.alive:
                        continue
                    event = self._resolve_piece_collision(first, second)
                    if event is not None:
                        events.append(event)

            for piece in state.pieces:
                if piece.alive and math.hypot(piece.vx, piece.vy) < self.config["minVelocity"]:
                    piece.vx = 0.0
                    piece.vy = 0.0

        return events

    def _integrate(self, piece, dt: float) -> None:
        piece.x += piece.vx * dt
        piece.y += piece.vy * dt

        friction = max(0.0, min(1.0, piece_friction(piece, self.config)))
        decay = friction ** (dt * 60.0)
        piece.vx *= decay
        piece.vy *= decay

        speed = math.hypot(piece.vx, piece.vy)
        max_speed = float(self.config["maxLaunchSpeed"])
        if speed > max_speed and speed > 0:
            scale = max_speed / speed
            piece.vx *= scale
            piece.vy *= scale

    def _resolve_boundary(self, piece) -> None:
        radius = max(0.0, float(getattr(piece, "radius", 0.0)))
        lo = radius
        hi = BOARD_SIZE - radius
        restitution = float(getattr(piece, "restitution", self.config.get("bounceFactor", 0.82)))
        restitution = max(0.0, min(1.0, restitution))

        if piece.x < lo:
            piece.x = lo
            if piece.vx < 0:
                piece.vx = -piece.vx * restitution
        elif piece.x > hi:
            piece.x = hi
            if piece.vx > 0:
                piece.vx = -piece.vx * restitution

        if piece.y < lo:
            piece.y = lo
            if piece.vy < 0:
                piece.vy = -piece.vy * restitution
        elif piece.y > hi:
            piece.y = hi
            if piece.vy > 0:
                piece.vy = -piece.vy * restitution

    def _resolve_piece_collision(self, a, b) -> dict[str, Any] | None:
        dx = b.x - a.x
        dy = b.y - a.y
        distance = math.hypot(dx, dy)
        minimum = float(a.radius) + float(b.radius)
        if distance >= minimum:
            return None

        if distance < 1e-9:
            seed = (stable_index(a.id) * 31 + stable_index(b.id) * 17) % 360
            angle = math.radians(seed)
            nx, ny = math.cos(angle), math.sin(angle)
            distance = 1.0
        else:
            nx, ny = dx / distance, dy / distance

        overlap = minimum - distance
        inv_a = 1.0 / max(1e-9, float(a.mass))
        inv_b = 1.0 / max(1e-9, float(b.mass))
        total_inv_mass = inv_a + inv_b

        a.x -= nx * overlap * (inv_a / total_inv_mass)
        a.y -= ny * overlap * (inv_a / total_inv_mass)
        b.x += nx * overlap * (inv_b / total_inv_mass)
        b.y += ny * overlap * (inv_b / total_inv_mass)
        self._resolve_boundary(a)
        self._resolve_boundary(b)

        relative_vx = b.vx - a.vx
        relative_vy = b.vy - a.vy
        normal_velocity = relative_vx * nx + relative_vy * ny

        if normal_velocity >= 0:
            return {
                "type": "contact",
                "a": a.id,
                "b": b.id,
                "impact": 0.0,
                "damaged": False,
            }

        impact = -normal_velocity
        restitution = (
            float(getattr(a, "restitution", self.config.get("bounceFactor", 0.82)))
            + float(getattr(b, "restitution", self.config.get("bounceFactor", 0.82)))
        ) * 0.5
        restitution = max(0.0, min(1.0, restitution))

        impulse = (1.0 + restitution) * impact / total_inv_mass
        ix = impulse * nx
        iy = impulse * ny
        a.vx -= ix * inv_a
        a.vy -= iy * inv_a
        b.vx += ix * inv_b
        b.vy += iy * inv_b

        if impact < float(self.config["minDamageImpact"]):
            return {
                "type": "collision",
                "a": a.id,
                "b": b.id,
                "impact": impact,
                "damaged": False,
            }

        key = tuple(sorted((a.id, b.id)))
        last_hit = self._hit_pairs.get(key, -math.inf)
        cooldown = float(self.config["collisionCooldown"])
        if self._sim_time - last_hit < cooldown:
            return {
                "type": "collision",
                "a": a.id,
                "b": b.id,
                "impact": impact,
                "damaged": False,
                "cooldown": True,
            }

        self._hit_pairs[key] = self._sim_time
        damage_to_a = self.calculate_damage(b, impact)
        damage_to_b = self.calculate_damage(a, impact)
        a.hp = max(0, a.hp - damage_to_a)
        b.hp = max(0, b.hp - damage_to_b)

        if a.hp == 0:
            a.alive = False
            a.vx = a.vy = 0.0
        if b.hp == 0:
            b.alive = False
            b.vx = b.vy = 0.0

        return {
            "type": "collision",
            "a": a.id,
            "b": b.id,
            "impact": impact,
            "damaged": True,
            "damageToA": damage_to_a,
            "damageToB": damage_to_b,
            "aAlive": a.alive,
            "bAlive": b.alive,
            "kingDestroyed": (
                (a.type == "king" and not a.alive)
                or (b.type == "king" and not b.alive)
            ),
        }

    def calculate_damage(self, attacker, relative_velocity: float) -> int:
        if relative_velocity < float(self.config["minDamageImpact"]):
            return 0
        collision_mul = float(getattr(attacker, "collisionMul", getattr(attacker, "collision_mul", 1.0)))
        damage_mul = float(getattr(attacker, "damageMul", getattr(attacker, "damage_mul", 1.0)))
        impact = min(1.6, relative_velocity * collision_mul / float(self.config["impactReferenceSpeed"]))
        raw = float(attacker.power) * impact * float(self.config["damageMultiplier"]) * damage_mul
        return max(1, min(int(self.config["maxCollisionDamage"]), round(raw)))

    def reconcile(self, server_state, client_state, drift_threshold: float = 0.1) -> tuple[bool, str | None]:
        """Return whether client state matches server state closely enough."""
        if server_state.current_player != client_state.current_player:
            return False, "Turn mismatch"

        server_pieces = {piece.id: piece for piece in server_state.pieces}
        client_pieces = {piece.id: piece for piece in client_state.pieces}
        if set(server_pieces) != set(client_pieces):
            return False, "Piece set mismatch"

        threshold = max(0.0, float(drift_threshold))
        for piece_id, server_piece in server_pieces.items():
            client_piece = client_pieces[piece_id]
            if server_piece.alive != client_piece.alive:
                return False, f"Alive mismatch: {piece_id}"
            if server_piece.hp != client_piece.hp:
                return False, f"HP mismatch: {piece_id}"
            position_drift = math.hypot(server_piece.x - client_piece.x, server_piece.y - client_piece.y)
            if position_drift > threshold:
                return False, f"Position drift {position_drift:.4f} > {threshold}"
            velocity_drift = math.hypot(server_piece.vx - client_piece.vx, server_piece.vy - client_piece.vy)
            if velocity_drift > threshold:
                return False, f"Velocity drift {velocity_drift:.4f} > {threshold}"

        return True, None


def piece_friction(piece, config: dict[str, Any]) -> float:
    return float(getattr(piece, "friction", config["friction"]))


def stable_index(value: str) -> int:
    total = 0
    for index, char in enumerate(str(value), start=1):
        total = (total * 131 + ord(char) * index) & 0xFFFFFFFF
    return total
