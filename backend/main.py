from __future__ import annotations

import logging
import math
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
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

    @field_validator("dx", "dy")
    @classmethod
    def validate_finite_vector_component(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("launch vector components must be finite")
        return value


def _json_safe(value):
    if isinstance(value, float) and not math.isfinite(value):
        return repr(value)
    if isinstance(value, BaseException):
        return str(value)
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, set):
        return [_json_safe(item) for item in sorted(value, key=str)]
    return value


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(
        "REQUEST_VALIDATION_ERROR",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_count": len(errors),
        },
    )
    return JSONResponse(status_code=422, content={"detail": _json_safe(errors)})


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
        return {"ok": False, "error": "room_not_found"}
    return state


@app.post("/api/rooms/{room_id}/launch")
async def launch(room_id: str, payload: LaunchRequest) -> dict:
    result, _broadcast_snapshot = await room_service.launch(
        room_id,
        game_id=payload.game_id,
        team=payload.team,
        piece_id=payload.piece_id,
        dx=payload.dx,
        dy=payload.dy,
    )
    return result


@app.websocket("/ws/rooms/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str) -> None:
    room = room_service.get(room_id)
    if room is None:
        logger.warning("WEBSOCKET_ROOM_NOT_FOUND", extra={"room_id": room_id})
        await websocket.close(code=1008)
        return

    try:
        await room_service.connect(room_id, websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await room_service.disconnect(room, websocket)
