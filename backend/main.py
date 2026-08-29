from __future__ import annotations

import asyncio
import json
import logging
import math
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware

from backend.game_service import AuthoritativeRoomService

logger = logging.getLogger("archess.api")
app = FastAPI(title="ArChess API", version="0.2.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
room_service = AuthoritativeRoomService()
MAX_WS_MESSAGE_BYTES = 64 * 1024


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex[:16]
        correlation_id = request.headers.get("X-Correlation-ID") or request_id
        started = datetime.now(UTC)
        logger.info("REQUEST_START", extra={"event": "REQUEST_START", "request_id": request_id, "correlation_id": correlation_id, "method": request.method, "path": request.url.path})
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
    game_id: str = Field(min_length=1, max_length=128)
    piece_id: str = Field(min_length=1, max_length=128)
    team: Literal["white", "black"] | None = None
    dx: float
    dy: float

    @field_validator("dx", "dy")
    @classmethod
    def validate_finite_vector(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("vector components must be finite")
        return value


class RoomMessage(BaseModel):
    event: Literal["ping", "snapshot", "launch"]
    game_id: str | None = Field(default=None, min_length=1, max_length=128)
    piece_id: str | None = Field(default=None, min_length=1, max_length=128)
    team: Literal["white", "black"] | None = None
    dx: float | None = None
    dy: float | None = None

    @field_validator("dx", "dy")
    @classmethod
    def validate_optional_finite_vector(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("vector components must be finite")
        return value


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(ok=True, service="archess-api", version=app.version, timestamp=datetime.now(UTC).isoformat())


@app.get("/api/version")
async def version() -> dict[str, str]:
    return {"version": app.version}


@app.post("/api/rooms", response_model=RoomResponse, status_code=201)
async def create_room() -> RoomResponse:
    room = room_service.create_room()
    logger.info("ROOM_CREATED", extra={"event": "ROOM_CREATED", "room_id": room.room_id})
    return RoomResponse(room_id=room.room_id, status=room.status, created_at=room.created_at)


@app.get("/api/rooms/{room_id}/state")
async def room_state(room_id: str) -> dict[str, Any]:
    room = room_service.get(room_id)
    if room is None:
        return {"ok": False, "error": "room_not_found"}
    return room_service.snapshot(room)


@app.post("/api/rooms/{room_id}/launch")
async def launch(room_id: str, request: LaunchRequest) -> dict[str, Any]:
    room = room_service.get(room_id)
    if room is None:
        logger.warning("ROOM_NOT_FOUND", extra={"event": "ROOM_NOT_FOUND", "room_id": room_id.upper(), "game_id": request.game_id})
        return {"ok": False, "error": "room_not_found"}
    team = request.team or room.simulation.current_team
    result = await room_service.launch(
        room,
        game_id=request.game_id,
        team=team,
        piece_id=request.piece_id,
        dx=request.dx,
        dy=request.dy,
    )
    if result.get("accepted"):
        await room_service.broadcast(room, {"event": "state", **result})
    else:
        logger.warning("LAUNCH_REJECTED", extra={"event": "LAUNCH_REJECTED", "room_id": room.room_id, "error": result.get("error")})
    return result


@app.websocket("/ws/rooms/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str) -> None:
    room = room_service.ensure_room(room_id)
    await websocket.accept()
    await room_service.add_client(room, websocket)
    normalized = room.room_id
    logger.info("WS_CONNECTED", extra={"event": "WS_CONNECTED", "room_id": normalized, "clients": len(room.clients)})
    try:
        await websocket.send_json({"event": "connected", "room_id": normalized, "timestamp": datetime.now(UTC).isoformat(), "state": room.simulation.snapshot()})
        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > MAX_WS_MESSAGE_BYTES:
                await websocket.close(code=1009, reason="message_too_large")
                return
            try:
                message = RoomMessage.model_validate(json.loads(raw))
            except (ValueError, json.JSONDecodeError) as error:
                await websocket.send_json({"event": "error", "room_id": normalized, "error": "invalid_message", "message": str(error)[:200]})
                continue

            if message.event == "ping":
                await websocket.send_json({"event": "ack", "room_id": normalized, "received": {"event": "ping"}})
                continue
            if message.event == "snapshot":
                await websocket.send_json({"event": "state", **room_service.snapshot(room)})
                continue
            if message.event == "launch":
                if not all(value is not None for value in (message.game_id, message.piece_id, message.dx, message.dy)):
                    await websocket.send_json({"event": "error", "room_id": normalized, "error": "launch_fields_required"})
                    continue
                team = message.team or room.simulation.current_team
                result = await room_service.launch(
                    room,
                    game_id=message.game_id,
                    team=team,
                    piece_id=message.piece_id,
                    dx=message.dx,
                    dy=message.dy,
                )
                await room_service.broadcast(room, {"event": "state", **result})
    except WebSocketDisconnect:
        await room_service.remove_client(room, websocket)
        logger.info("WS_DISCONNECTED", extra={"event": "WS_DISCONNECTED", "room_id": normalized, "clients": len(room.clients)})
    except Exception:
        await room_service.remove_client(room, websocket)
        logger.exception("WS_ERROR", extra={"event": "WS_ERROR", "room_id": normalized})
        raise
