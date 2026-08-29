from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket

from game.physics.authoritative import AuthoritativeSimulation


@dataclass(slots=True)
class GameRoom:
    room_id: str
    created_at: str
    simulation: AuthoritativeSimulation
    game_id: str | None = None
    status: str = "waiting"
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    clients: set[WebSocket] = field(default_factory=set)


class AuthoritativeRoomService:
    """Owns room lifecycle and delegates all game-state mutation to the server simulation."""

    def __init__(self) -> None:
        self._rooms: dict[str, GameRoom] = {}

    def create_room(self) -> GameRoom:
        room_id = self._new_room_id()
        room = GameRoom(
            room_id=room_id,
            created_at=datetime.now(UTC).isoformat(),
            simulation=AuthoritativeSimulation.new_match(),
        )
        self._rooms[room_id] = room
        return room

    def get(self, room_id: str) -> GameRoom | None:
        return self._rooms.get(room_id.upper())

    async def launch(
        self,
        room: GameRoom,
        *,
        game_id: str,
        team: str,
        piece_id: str,
        dx: float,
        dy: float,
    ) -> dict[str, Any]:
        async with room.lock:
            if room.game_id is None:
                room.game_id = game_id
            elif room.game_id != game_id:
                return self._rejected(room, "game_mismatch")

            accepted, reason = room.simulation.launch_intent(team, piece_id, dx, dy)
            if not accepted:
                return self._rejected(room, reason or "launch_rejected")

            room.status = "active"
            events = await asyncio.to_thread(room.simulation.advance_until_settled)
            if room.simulation.game_over:
                room.status = "finished"

            return {
                "ok": True,
                "accepted": True,
                "room_id": room.room_id,
                "game_id": game_id,
                "snapshot": room.simulation.snapshot(),
                "events": events,
            }

    def snapshot(self, room: GameRoom) -> dict[str, Any]:
        return {
            "ok": True,
            "room_id": room.room_id,
            "game_id": room.game_id,
            "status": room.status,
            "snapshot": room.simulation.snapshot(),
        }

    async def add_client(self, room: GameRoom, websocket: WebSocket) -> None:
        async with room.lock:
            room.clients.add(websocket)

    async def remove_client(self, room: GameRoom, websocket: WebSocket) -> None:
        async with room.lock:
            room.clients.discard(websocket)

    async def broadcast(self, room: GameRoom, payload: dict[str, Any]) -> None:
        async with room.lock:
            clients = tuple(room.clients)
        if not clients:
            return

        async def send(client: WebSocket) -> WebSocket | None:
            try:
                await client.send_json(payload)
                return client
            except Exception:
                return None

        results = await asyncio.gather(*(send(client) for client in clients))
        stale = {client for client in results if client is None}
        if stale:
            async with room.lock:
                room.clients.difference_update(stale)

    @staticmethod
    def _new_room_id() -> str:
        from uuid import uuid4

        return uuid4().hex[:6].upper()

    @staticmethod
    def _rejected(room: GameRoom, reason: str) -> dict[str, Any]:
        return {
            "ok": False,
            "accepted": False,
            "room_id": room.room_id,
            "error": reason,
            "snapshot": room.simulation.snapshot(),
        }


room_service = AuthoritativeRoomService()
