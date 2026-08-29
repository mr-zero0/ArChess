import type { AuthoritativeSnapshot, LaunchResult } from "../api/client.ts";
import { createLogger } from "../observability.ts";
import { createRoom, getRoomState, launchRoomPiece } from "../api/client.ts";

export type AuthoritativeStateHandler = (snapshot: AuthoritativeSnapshot) => void;
export type AuthoritativeEventHandler = (event: string, detail?: Record<string, unknown>) => void;

export type AuthoritativeSession = {
  readonly gameId: string;
  readonly roomId: string | null;
  connect(): Promise<void>;
  launch(payload: { team: "white" | "black"; pieceId: string; dx: number; dy: number }): Promise<LaunchResult>;
  close(): void;
};

type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

const logger = createLogger("game.authoritative-session");
const RECONNECT_BASE_DELAY_MS = 250;
const RECONNECT_MAX_DELAY_MS = 5000;

function socketUrl(roomId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/rooms/${encodeURIComponent(roomId)}`;
}

export function createAuthoritativeSession(
  onState: AuthoritativeStateHandler,
  onEvent?: AuthoritativeEventHandler,
): AuthoritativeSession {
  if (typeof window === "undefined") throw new Error("Browser window is unavailable");
  if (typeof window.WebSocket === "undefined") throw new Error("WebSocket is unavailable");
  if (typeof window.crypto?.randomUUID !== "function") throw new Error("crypto.randomUUID is unavailable");

  let roomId: string | null = null;
  let socket: WebSocket | null = null;
  let connectPromise: Promise<void> | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;
  let connectionState: ConnectionState = "idle";
  let closed = false;
  const gameId = window.crypto.randomUUID();

  const emit = (event: string, detail: Record<string, unknown> = {}) => {
    logger.debug(event, detail);
    onEvent?.(event, detail);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const resync = async (id: string) => {
    const state = await getRoomState(id);
    if (!state.ok) throw new Error(state.error || "Authoritative room state unavailable");
    onState(state.snapshot);
    emit("AUTHORITATIVE_STATE_RESYNCED", {
      roomId: id,
      turn: state.snapshot.currentTeam,
      gameOver: state.snapshot.gameOver,
    });
  };

  const connectSocket = (id: string, reconnecting = false): Promise<void> => {
    if (connectPromise) return connectPromise;
    connectionState = reconnecting ? "reconnecting" : "connecting";
    connectPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(socketUrl(id));
      socket = ws;
      let completed = false;

      const fail = (error: Error) => {
        if (completed) return;
        completed = true;
        if (socket === ws) socket = null;
        reject(error);
      };

      ws.onopen = () => {
        completed = true;
        connectionState = "connected";
        emit("AUTHORITATIVE_WS_CONNECTED", { roomId: id });
        resolve();
      };

      ws.onmessage = ({ data }) => {
        try {
          const message = JSON.parse(String(data)) as {
            event?: string;
            snapshot?: AuthoritativeSnapshot;
            state?: AuthoritativeSnapshot;
            error?: string;
          };
          const snapshot = message.snapshot ?? message.state;
          if (snapshot) {
            onState(snapshot);
            emit("AUTHORITATIVE_STATE_RECEIVED", {
              roomId: id,
              turn: snapshot.currentTeam,
              gameOver: snapshot.gameOver,
            });
            return;
          }
          if (message.event === "error") emit("AUTHORITATIVE_WS_ERROR", { roomId: id, error: message.error ?? "unknown" });
        } catch (error) {
          logger.warn("AUTHORITATIVE_WS_MESSAGE_INVALID", {
            roomId: id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      ws.onerror = () => fail(new Error("Authoritative WebSocket connection failed"));
      ws.onclose = () => {
        if (socket === ws) socket = null;
        if (!closed) {
          connectionState = "reconnecting";
          emit("AUTHORITATIVE_WS_CLOSED", { roomId: id });
          scheduleReconnect(id);
        }
      };
    });

    connectPromise = connectPromise.finally(() => {
      connectPromise = null;
    });
    return connectPromise;
  };

  const scheduleReconnect = (id: string) => {
    if (closed || reconnectTimer !== null || roomId !== id) return;
    connectionState = "reconnecting";
    const delayMs = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    emit("AUTHORITATIVE_WS_RECONNECT_SCHEDULED", { roomId: id, attempt: reconnectAttempt, delayMs });
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connectSocket(id, true)
        .then(async () => {
          await resync(id);
          reconnectAttempt = 0;
          emit("AUTHORITATIVE_WS_RECONNECTED", { roomId: id });
        })
        .catch((error) => {
          emit("AUTHORITATIVE_WS_RECONNECT_FAILED", {
            roomId: id,
            attempt: reconnectAttempt,
            error: error instanceof Error ? error.message : String(error),
          });
          scheduleReconnect(id);
        });
    }, delayMs);
  };

  const connect = async () => {
    if (closed) throw new Error("Authoritative session is closed");
    if (socket?.readyState === WebSocket.OPEN && connectionState === "connected") return;
    if (connectionState === "connecting" || connectionState === "reconnecting") {
      if (connectPromise) return connectPromise;
    }
    clearReconnectTimer();
    if (!roomId) {
      const room = await createRoom();
      roomId = room.room_id;
      emit("AUTHORITATIVE_ROOM_CREATED", { roomId });
    }
    try {
      await connectSocket(roomId);
    } catch (error) {
      emit("AUTHORITATIVE_CONNECT_FAILED", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  const launch = async (payload: { team: "white" | "black"; pieceId: string; dx: number; dy: number }) => {
    if (!roomId || !socket || socket.readyState !== WebSocket.OPEN) await connect();
    if (!roomId) throw new Error("Authoritative room is unavailable");
    try {
      const result = await launchRoomPiece(roomId, { gameId, ...payload });
      onState(result.snapshot);
      if (result.accepted) {
        emit("AUTHORITATIVE_LAUNCH_ACCEPTED", { roomId, pieceId: payload.pieceId, team: payload.team });
      } else {
        emit("AUTHORITATIVE_LAUNCH_REJECTED", { roomId, pieceId: payload.pieceId, reason: result.error ?? "rejected" });
      }
      return result;
    } catch (error) {
      emit("AUTHORITATIVE_LAUNCH_REQUEST_FAILED", {
        roomId,
        pieceId: payload.pieceId,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        await resync(roomId);
      } catch (resyncError) {
        emit("AUTHORITATIVE_STATE_RESYNC_FAILED", {
          roomId,
          pieceId: payload.pieceId,
          error: resyncError instanceof Error ? resyncError.message : String(resyncError),
        });
      }
      throw error;
    }
  };

  const close = () => {
    closed = true;
    connectionState = "closed";
    clearReconnectTimer();
    socket?.close(1000, "client_shutdown");
    socket = null;
    connectPromise = null;
    emit("AUTHORITATIVE_SESSION_CLOSED", { roomId });
  };

  return { get roomId() { return roomId; }, gameId, connect, launch, close };
}
