export type ApiHealth = {
  ok: boolean;
  service: string;
  version: string;
  timestamp: string;
};

export type ArenaPieceSnapshot = {
  id: string;
  type: "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
  team: "white" | "black";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  alive: boolean;
};

export type AuthoritativeSnapshot = {
  currentTeam: "white" | "black";
  gameOver: boolean;
  pieces: ArenaPieceSnapshot[];
  integrity?: {
    preHash: string;
    postHash: string;
    shotHash: string;
    intent: Record<string, unknown>;
  };
};

export type RoomState = {
  ok: boolean;
  room_id: string;
  game_id: string | null;
  status: "waiting" | "active" | "finished";
  snapshot: AuthoritativeSnapshot;
  error?: string;
};

export type LaunchResult = {
  ok: boolean;
  accepted: boolean;
  room_id: string;
  game_id: string;
  error?: string;
  snapshot: AuthoritativeSnapshot;
  events: Array<Record<string, unknown>>;
};

import { createLogger } from "../observability.ts";

const logger = createLogger("api.client");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  logger.debug("API_REQUEST_START", {
    requestId,
    method: init?.method ?? "GET",
    path,
  });

  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        "X-Request-ID": requestId,
        ...(init?.headers ?? {}),
      },
    });
    const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
    const durationMs = Math.round((performance.now() - started) * 100) / 100;

    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
      logger.warn("API_REQUEST_FAILED", {
        requestId,
        method: init?.method ?? "GET",
        path,
        status: response.status,
        durationMs,
        error: message ?? `HTTP ${response.status}`,
      });
      throw new Error(message || `ArChess API request failed: HTTP ${response.status}`);
    }

    logger.debug("API_REQUEST_END", {
      requestId,
      method: init?.method ?? "GET",
      path,
      status: response.status,
      durationMs,
    });
    return payload as T;
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith("ArChess API request failed")) {
      logger.error("API_REQUEST_ERROR", {
        requestId,
        method: init?.method ?? "GET",
        path,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        error: error.message,
      });
    }
    throw error;
  }
}

export function getHealth(signal?: AbortSignal) {
  return request<ApiHealth>("/api/health", { signal });
}

export function getVersion(signal?: AbortSignal) {
  return request<{ version: string }>("/api/version", { signal });
}

export function createRoom(signal?: AbortSignal) {
  return request<{ room_id: string; status: string; created_at: string }>("/api/rooms", { method: "POST", signal });
}

export function getRoomState(roomId: string, signal?: AbortSignal) {
  return request<RoomState>(`/api/rooms/${encodeURIComponent(roomId)}/state`, { signal });
}

export function launchRoomPiece(
  roomId: string,
  payload: { gameId: string; team: "white" | "black"; pieceId: string; dx: number; dy: number },
  signal?: AbortSignal,
) {
  return request<LaunchResult>(`/api/rooms/${encodeURIComponent(roomId)}/launch`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: payload.gameId,
      team: payload.team,
      piece_id: payload.pieceId,
      dx: payload.dx,
      dy: payload.dy,
    }),
  });
}
