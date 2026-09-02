from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from game.physics.authoritative import AuthoritativeSimulation

logger = logging.getLogger("archess.room")


@dataclass
class Room:
    room_id: str
    created_at: str
    simulation: AuthoritativeSimulation
    game_id: str | None = None
    status: str = "active"
    clients: set[Any] = field(default_factory=set)
    lock: threading.RLock = field(default_factory=threading.RLock)

    @property
    def snapshot(self) -> dict[str, Any]:
        return self.simulation.snapshot()


class RoomService:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._rooms_lock = threading.Lock()

    def create_room(self) -> Room:
        with self._rooms_lock:
            room_id = uuid4().hex[:6].upper()
            room = Room(room_id, datetime.now(UTC).isoformat(), AuthoritativeSimulation.new_match())
            self._rooms[room_id] = room
        logger.info("ROOM_CREATED", extra={"event": "ROOM_CREATED", "room_id": room_id})
        return room

    def get(self, room_id: str) -> Room | None:
        return self._rooms.get(room_id.upper())

    def connect(self, room_id: str, websocket: Any) -> Room | None:
        room = self.get(room_id)
        if room is None:
            logger.warning("WS_ROOM_NOT_FOUND", extra={"event": "WS_ROOM_NOT_FOUND", "room_id": room_id})
            return None
        with room.lock:
            room.clients.add(websocket)
            snapshot = room.snapshot
        websocket.send(json.dumps({"event": "state", "room_id": room.room_id, "snapshot": snapshot}))
        return room

    def disconnect(self, room: Room, websocket: Any) -> None:
        with room.lock:
            room.clients.discard(websocket)

    def launch(self, room_id: str, *, game_id: str, team: str, piece_id: str, dx: float, dy: float) -> tuple[dict[str, Any], dict[str, Any] | None]:
        room = self.get(room_id)
        if room is None:
            return {"ok": False, "accepted": False, "error": "room_not_found"}, None
        with room.lock:
            snapshot = room.snapshot
            if room.game_id is None:
                room.game_id = game_id
            elif room.game_id != game_id:
                return {"ok": False, "accepted": False, "error": "game_mismatch", "room_id": room.room_id, "game_id": room.game_id, "snapshot": snapshot, "events": []}, snapshot
            accepted, reason = room.simulation.launch_intent(team, piece_id, dx, dy)
            if not accepted:
                rejected = {"ok": False, "accepted": False, "room_id": room.room_id, "game_id": room.game_id, "error": reason or "launch_rejected", "snapshot": room.snapshot, "events": []}
                return rejected, rejected["snapshot"]
            events = room.simulation.advance_until_settled()
            snapshot = room.snapshot
            room.status = "finished" if room.simulation.game_over else "active"
            result = {"ok": True, "accepted": True, "room_id": room.room_id, "game_id": room.game_id, "snapshot": snapshot, "events": events}
            clients = tuple(room.clients)
        self.broadcast(clients, {"event": "state", "room_id": room.room_id, "snapshot": snapshot, "events": events})
        return result, None

    def broadcast(self, clients: tuple[Any, ...], payload: dict[str, Any]) -> None:
        message = json.dumps(payload)
        for client in clients:
            try:
                client.send(message)
            except Exception:
                logger.warning("WS_STALE_CLIENT", extra={"event": "WS_STALE_CLIENT"})

    def room_state(self, room_id: str) -> dict[str, Any] | None:
        room = self.get(room_id)
        if room is None:
            return None
        with room.lock:
            return {"ok": True, "room_id": room.room_id, "game_id": room.game_id, "status": room.status, "snapshot": room.snapshot}


room_service = RoomService()