export type Room = {
  room_id: string;
  status: string;
  created_at: string;
};

export type RoomClient = {
  guestId: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string; message?: string } | null;
  if (!response.ok) {
    const error = payload && typeof payload === "object" ? payload : {};
    throw new Error(("message" in error && error.message) || ("error" in error && error.error) || `ArChess room request failed: HTTP ${response.status}`);
  }
  return payload as T;
}

export function createRoom(client: RoomClient, signal?: AbortSignal) {
  return request<Room>("/api/rooms", {
    method: "POST",
    signal,
    body: JSON.stringify({ guestId: client.guestId }),
  });
}

export function joinRoom(roomId: string, client: RoomClient, signal?: AbortSignal) {
  return request<Record<string, unknown>>(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: "POST",
    signal,
    body: JSON.stringify({ guestId: client.guestId }),
  });
}

export function reconnectRoom(roomId: string, client: RoomClient, signal?: AbortSignal) {
  return request<Record<string, unknown>>(`/api/rooms/${encodeURIComponent(roomId)}/reconnect`, {
    method: "POST",
    signal,
    body: JSON.stringify({ guestId: client.guestId }),
  });
}
