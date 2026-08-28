from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("archess.api")
app = FastAPI(title="ArChess API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex[:16]
        correlation_id = request.headers.get("X-Correlation-ID") or request_id
        started = datetime.now(UTC)
        extra = {"event": "REQUEST_START", "request_id": request_id, "correlation_id": correlation_id, "method": request.method, "path": request.url.path}
        logger.info("REQUEST_START", extra=extra)
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (datetime.now(UTC) - started).total_seconds() * 1000
            logger.exception("REQUEST_ERROR", extra={"event": "REQUEST_ERROR", "request_id": request_id, "correlation_id": correlation_id, "duration_ms": round(duration_ms, 3)})
            raise
        duration_ms = (datetime.now(UTC) - started).total_seconds() * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        logger.info("REQUEST_END", extra={"event": "REQUEST_END", "request_id": request_id, "correlation_id": correlation_id, "status": response.status_code, "duration_ms": round(duration_ms, 3)})
        return response


app.add_middleware(RequestContextMiddleware)


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
    logger.info("ROOM_CREATED", extra={"event": "ROOM_CREATED", "room_id": room_id})
    return RoomResponse(room_id=room_id, status="waiting", created_at=created_at)


@app.post("/api/rooms/{room_id}/launch")
async def launch(room_id: str, request: LaunchRequest) -> dict:
    normalized = room_id.upper()
    room = _rooms.get(normalized)
    if not room:
        logger.warning("ROOM_NOT_FOUND", extra={"event": "ROOM_NOT_FOUND", "room_id": normalized, "game_id": request.game_id})
        return {"ok": False, "error": "room_not_found"}
    logger.info("AUTHORITATIVE_LAUNCH_REQUEST", extra={"event": "AUTHORITATIVE_LAUNCH_REQUEST", "room_id": normalized, "game_id": request.game_id, "piece_id": request.piece_id})
    return {"ok": True, "room_id": normalized, "game_id": request.game_id, "piece_id": request.piece_id, "accepted": True}


@app.websocket("/ws/rooms/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str) -> None:
    normalized = room_id.upper()
    await websocket.accept()
    clients = _clients.setdefault(normalized, set())
    clients.add(websocket)
    logger.info("WS_CONNECTED", extra={"event": "WS_CONNECTED", "room_id": normalized, "clients": len(clients)})
    try:
        await websocket.send_json({"event": "connected", "room_id": normalized, "timestamp": datetime.now(UTC).isoformat()})
        while True:
            message = await websocket.receive_json()
            logger.info("WS_MESSAGE", extra={"event": "WS_MESSAGE", "room_id": normalized, "message_event": message.get("event", "unknown")})
            payload = {"event": "ack", "room_id": normalized, "received": message}
            await asyncio.gather(*(client.send_json(payload) for client in list(clients)))
    except WebSocketDisconnect:
        clients.discard(websocket)
        logger.info("WS_DISCONNECTED", extra={"event": "WS_DISCONNECTED", "room_id": normalized, "clients": len(clients)})
    except Exception:
        clients.discard(websocket)
        logger.exception("WS_ERROR", extra={"event": "WS_ERROR", "room_id": normalized})
        raise
