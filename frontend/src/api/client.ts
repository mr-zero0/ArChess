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
const API_REQUEST_TIMEOUT_MS = 10_000;
const CLIENT_CORRELATION_ID = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal;
  const forwardAbort = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", forwardAbort, { once: true });

  logger.debug("API_REQUEST_START", {
    requestId,
    method: init?.method ?? "GET",
    path,
    timeoutMs: API_REQUEST_TIMEOUT_MS,
  });

  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Request-ID": requestId,
        "X-Correlation-ID": CLIENT_CORRELATION_ID,
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
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    const timedOut = controller.signal.aborted && !(callerSignal?.aborted ?? false);
    if (timedOut) {
      logger.warn("API_REQUEST_TIMEOUT", {
        requestId,
        method: init?.method ?? "GET",
        path,
        durationMs,
        timeoutMs: API_REQUEST_TIMEOUT_MS,
      });
      throw new Error(`ArChess API request timed out after ${API_REQUEST_TIMEOUT_MS}ms`);
    }
    if (error instanceof Error && !error.message.startsWith("ArChess API request failed")) {
      logger.error("API_REQUEST_ERROR", {
        requestId,
        method: init?.method ?? "GET",
        path,
        durationMs,
        error: error.message,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", forwardAbort);
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
