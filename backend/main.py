from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from backend.room_service import room_service

logger = logging.getLogger("archess.api")
app = FastAPI(title="ArChess API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid4().hex[:16]
        correlation_id = request.headers.get("X-Correlation-ID") or request_id
        started = datetime.now(UTC)
        logger.info(
            "REQUEST_START",
            extra={
                "event": "REQUEST_START",
                "request_id": request_id,
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
            },
        )
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (datetime.now(UTC) - started).total_seconds() * 1000
            logger.exception(
                "REQUEST_ERROR",
                extra={
                    "event": "REQUEST_ERROR",
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "duration_ms": round(duration_ms, 3),
                },
            )
            raise
        duration_ms = (datetime.now(UTC) - started).total_seconds() * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        logger.info(
            "REQUEST_END",
            extra={
                "event": "REQUEST_END",
                "request_id": request_id,
                "correlation_id": correlation_id,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 3),
            },
        )
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
    team: Literal["white", "black"]
    piece_id: str = Field(min_length=1)
    dx: float
    dy: float


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        service="archess-api",
        version=app.version,
        timestamp=datetime.now(UTC).isoformat(),
    )


@app.get("/api/version")
async def version() -> dict[str, str]:
    return {"version": app.version}


@app.post("/api/rooms", response_model=RoomResponse, status_code=201)
async def create_room() -> RoomResponse:
    room = await room_service.create_room()
    return RoomResponse(room_id=room.room_id, status=room.status, created_at=room.created_at)


@app.get("/api/rooms/{room_id}/state")
async def room_state(room_id: str) -> dict:
    state = room_service.room_state(room_id)
    if state is None:
        logger.warning(
            "ROOM_NOT_FOUND",
            extra={"event": "ROOM_NOT_FOUND", "room_id": room_id.upper()},
        )
        return {"ok": False, "error": "room_not_found"}
    return state


@app.post("/api/rooms/{room_id}/launch")
async def launch(room_id: str, request: LaunchRequest) -> dict:
    normalized = room_id.upper()
    logger.info(
        "AUTHORITATIVE_LAUNCH_REQUEST",
        extra={
            "event": "AUTHORITATIVE_LAUNCH_REQUEST",
            "room_id": normalized,
            "game_id": request.game_id,
            "piece_id": request.piece_id,
            "team": request.team,
        },
    )
    payload, _ = await room_service.launch(
        normalized,
        game_id=request.game_id,
        team=request.team,
        piece_id=request.piece_id,
        dx=request.dx,
        dy=request.dy,
    )
    return payload


@app.websocket("/ws/rooms/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str) -> None:
    normalized = room_id.upper()
    try:
        room = await room_service.connect(normalized, websocket)
    except KeyError:
        logger.warning(
            "WS_ROOM_NOT_FOUND",
            extra={"event": "WS_ROOM_NOT_FOUND", "room_id": normalized},
        )
        await websocket.close(code=1008, reason="room_not_found")
        return

    try:
        while True:
            message = await websocket.receive_json()
            logger.debug(
                "WS_CONTROL_MESSAGE",
                extra={
                    "event": "WS_CONTROL_MESSAGE",
                    "room_id": room.room_id,
                    "message_event": message.get("event", "unknown"),
                },
            )
    except WebSocketDisconnect:
        await room_service.disconnect(room, websocket)
    except Exception:
        await room_service.disconnect(room, websocket)
        logger.exception("WS_ERROR", extra={"event": "WS_ERROR", "room_id": room.room_id})
        raise
