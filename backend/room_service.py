from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

from game.physics.authoritative import AuthoritativeSimulation

logger = logging.getLogger("archess.room")


@dataclass
class Room:
    room_id: str
    created_at: str
    simulation: AuthoritativeSimulation
    game_id: str | None = None
    status: str = "active"
    clients: set[WebSocket] = field(default_factory=set)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def snapshot(self) -> dict[str, Any]:
        return self.simulation.snapshot()


class RoomService:
    """Owns authoritative room lifecycle and single-process realtime fan-out."""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._rooms_lock = asyncio.Lock()

    async def create_room(self) -> Room:
        async with self._rooms_lock:
            room_id = uuid4().hex[:6].upper()
            room = Room(
                room_id=room_id,
                created_at=datetime.now(UTC).isoformat(),
                simulation=AuthoritativeSimulation.new_match(),
            )
            self._rooms[room_id] = room
        logger.info("ROOM_CREATED", extra={"event": "ROOM_CREATED", "room_id": room_id})
        return room

    def get(self, room_id: str) -> Room | None:
        return self._rooms.get(room_id.upper())

    async def connect(self, room_id: str, websocket: WebSocket) -> Room:
        room = self.get(room_id)
        if room is None:
            raise KeyError("room_not_found")
        await websocket.accept()
        async with room.lock:
            room.clients.add(websocket)
            snapshot = room.snapshot
            client_count = len(room.clients)
        await websocket.send_json({"event": "state", "room_id": room.room_id, "snapshot": snapshot})
        logger.info("WS_CONNECTED", extra={"event": "WS_CONNECTED", "room_id": room.room_id, "clients": client_count})
        return room

    async def disconnect(self, room: Room, websocket: WebSocket) -> None:
        async with room.lock:
            room.clients.discard(websocket)
            client_count = len(room.clients)
        logger.info("WS_DISCONNECTED", extra={"event": "WS_DISCONNECTED", "room_id": room.room_id, "clients": client_count})

    async def launch(
        self,
        room_id: str,
        *,
        game_id: str,
        team: str,
        piece_id: str,
        dx: float,
        dy: float,
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        room = self.get(room_id)
        if room is None:
            return {"ok": False, "accepted": False, "error": "room_not_found"}, None

        async with room.lock:
            current_snapshot = room.snapshot
            if room.game_id is None:
                room.game_id = game_id
            elif room.game_id != game_id:
                logger.warning(
                    "LAUNCH_REJECTED",
                    extra={
                        "event": "LAUNCH_REJECTED",
                        "room_id": room.room_id,
                        "reason": "game_mismatch",
                        "game_id": game_id,
                    },
                )
                return {
                    "ok": False,
                    "accepted": False,
                    "room_id": room.room_id,
                    "game_id": room.game_id,
                    "error": "game_mismatch",
                    "snapshot": current_snapshot,
                    "events": [],
                }, current_snapshot

            simulation = room.simulation
            accepted, reason = simulation.launch_intent(team, piece_id, dx, dy)
            if not accepted:
                payload = {
                    "ok": False,
                    "accepted": False,
                    "room_id": room.room_id,
                    "game_id": room.game_id,
                    "error": reason or "launch_rejected",
                    "snapshot": simulation.snapshot(),
                    "events": [],
                }
                return payload, payload["snapshot"]

            events = await asyncio.to_thread(simulation.advance_until_settled)
            snapshot = simulation.snapshot()
            room.status = "finished" if simulation.game_over else "active"
            payload = {
                "ok": True,
                "accepted": True,
                "room_id": room.room_id,
                "game_id": room.game_id,
                "snapshot": snapshot,
                "events": events,
            }

        await self.broadcast(
            room,
            {"event": "state", "room_id": room.room_id, "snapshot": snapshot, "events": events},
        )
        logger.info(
            "AUTHORITATIVE_LAUNCH_SETTLED",
            extra={
                "event": "AUTHORITATIVE_LAUNCH_SETTLED",
                "room_id": room.room_id,
                "game_id": room.game_id,
                "piece_id": piece_id,
                "team": team,
                "events": len(events),
                "next_team": snapshot["currentTeam"],
                "game_over": snapshot["gameOver"],
            },
        )
        return payload, None

    async def broadcast(self, room: Room, payload: dict[str, Any]) -> None:
        async with room.lock:
            clients = tuple(room.clients)
        if not clients:
            return

        stale: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(payload)
            except Exception:
                stale.append(client)

        if stale:
            async with room.lock:
                for client in stale:
                    room.clients.discard(client)
            logger.warning(
                "WS_STALE_CLIENTS_REMOVED",
                extra={"event": "WS_STALE_CLIENTS_REMOVED", "room_id": room.room_id, "removed": len(stale)},
            )

    def room_state(self, room_id: str) -> dict[str, Any] | None:
        room = self.get(room_id)
        if room is None:
            return None
        return {
            "ok": True,
            "room_id": room.room_id,
            "game_id": room.game_id,
            "status": room.status,
            "snapshot": room.snapshot,
        }


room_service = RoomService()
