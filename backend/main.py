from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

logger = logging.getLogger("archess.api")

app = FastAPI(title="ArChess API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str
    timestamp: str


class RoomResponse(BaseModel):
    room_id: str
    status: str
    created_at: str


class LaunchRequest(BaseModel):
    game_id: str = Field(min_length=1)
    piece_id: str = Field(min_length=1)
    dx: float
    dy: float


_rooms: dict[str, dict] = {}
_clients: dict[str, set[WebSocket]] = {}


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(ok=True, service="archess-api", version=app.version, timestamp=datetime.now(UTC).isoformat())


@app.get("/api/version")
async def version() -> dict[str, str]:
    return {"version": app.version}


@app.post("/api/rooms", response_model=RoomResponse, status_code=201)
async def create_room() -> RoomResponse:
    room_id = uuid4().hex[:6].upper()
    created_at = datetime.now(UTC).isoformat()
    _rooms[room_id] = {"status": "waiting", "created_at": created_at}
    _clients.setdefault(room_id, set())
    logger.info("ROOM_CREATED room_id=%s", room_id)
    return RoomResponse(room_id=room_id, status="waiting", created_at=created_at)


@app.post("/api/rooms/{room_id}/launch")
async def launch(room_id: str, request: LaunchRequest) -> dict:
    room = _rooms.get(room_id.upper())
    if not room:
        return {"ok": False, "error": "room_not_found"}
    logger.info("AUTHORITATIVE_LAUNCH_REQUEST room_id=%s game_id=%s piece_id=%s", room_id, request.game_id, request.piece_id)
    return {"ok": True, "room_id": room_id.upper(), "game_id": request.game_id, "piece_id": request.piece_id, "accepted": True}


@app.websocket("/ws/rooms/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str) -> None:
    room_id = room_id.upper()
    await websocket.accept()
    clients = _clients.setdefault(room_id, set())
    clients.add(websocket)
    logger.info("WS_CONNECTED room_id=%s clients=%d", room_id, len(clients))
    try:
        await websocket.send_json({"event": "connected", "room_id": room_id, "timestamp": datetime.now(UTC).isoformat()})
        while True:
            message = await websocket.receive_json()
            logger.info("WS_MESSAGE room_id=%s event=%s", room_id, message.get("event", "unknown"))
            payload = {"event": "ack", "room_id": room_id, "received": message}
            await asyncio.gather(*(client.send_json(payload) for client in list(clients)))
    except WebSocketDisconnect:
        clients.discard(websocket)
        logger.info("WS_DISCONNECTED room_id=%s clients=%d", room_id, len(clients))
    except Exception:
        clients.discard(websocket)
        logger.exception("WS_ERROR room_id=%s", room_id)
        raise
