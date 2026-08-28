export type ApiHealth = {
  ok: boolean;
  service: string;
  version: string;
  timestamp: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    throw new Error(message || `ArChess API request failed: HTTP ${response.status}`);
  }
  return payload as T;
}

export function getHealth(signal?: AbortSignal) {
  return request<ApiHealth>("/api/health", { signal });
}

export function getVersion(signal?: AbortSignal) {
  return request<{ version: string }>("/api/version", { signal });
}

export async function createRoom(signal?: AbortSignal) {
  return request<{ room_id: string; status: string; created_at: string }>("/api/rooms", { method: "POST", signal });
}
