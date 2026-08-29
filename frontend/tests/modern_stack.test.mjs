import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const arena = await readFile(new URL("../src/game/ArenaScene.ts", import.meta.url), "utf8");
const api = await readFile(new URL("../src/api/client.ts", import.meta.url), "utf8");
const physics = await readFile(new URL("../src/game/physics.ts", import.meta.url), "utf8");
const session = await readFile(new URL("../src/game/authoritativeSession.ts", import.meta.url), "utf8");

function has(source, text) {
  assert.ok(source.includes(text), `Expected source to contain: ${text}`);
}

function lacks(source, text) {
  assert.ok(!source.includes(text), `Expected source not to contain: ${text}`);
}

test("FastAPI exposes the modern transport boundary", () => {
  has(api, '"/api/health"');
  has(api, '"/api/rooms"');
  has(api, "function getRoomState");
  has(api, "function launchRoomPiece");
  has(api, "encodeURIComponent(roomId)");
  has(api, "method: \"POST\"");
  has(api, "game_id: payload.gameId");
  has(session, "function socketUrl");
  has(session, "encodeURIComponent(roomId)");
  has(session, "new WebSocket(socketUrl(roomId))");
  lacks(api, "API_BASE_URL");
});

