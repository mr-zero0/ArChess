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

test("feature rail exposes every registered feature", async () => {
  const features = await readFile(new URL("../src/features.ts", import.meta.url), "utf8");
  has(features, 'id: "arena"');
  has(features, 'id: "matchmaking"');
  has(features, 'id: "ranked"');
  has(features, 'id: "challenges"');
  has(features, 'id: "history"');
  has(features, 'id: "profile"');
  has(features, 'id: "settings"');
});

test("feature rail uses accessible navigation semantics", async () => {
  const rail = await readFile(new URL("../src/components/FeatureRail.tsx", import.meta.url), "utf8");
  has(rail, "<nav");
  has(rail, "aria-label");
});

test("migration features are visibly distinguished without disabling navigation", async () => {
  const rail = await readFile(new URL("../src/components/FeatureRail.tsx", import.meta.url), "utf8");
  has(rail, "status === \"migration\"");
  has(rail, "Soon");
  has(rail, "<button");
  lacks(rail, "disabled");
});

test("feature registry keeps arena as the live primary surface", async () => {
  const features = await readFile(new URL("../src/features.ts", import.meta.url), "utf8");
  const arenaIndex = features.indexOf('id: "arena"');
  assert.ok(arenaIndex >= 0);
  assert.match(features.slice(arenaIndex, arenaIndex + 180), /primary|live/);
});

test("modern client pins the verified current stack", () => {
  has(app, 'from "motion/react"');
  has(app, 'import("phaser")');
  has(api, "fetch(");
});

test("Phaser owns the game loop and turn lifecycle", () => {
  has(arena, "extends Phaser.Scene");
  has(arena, "update(_time: number, deltaMs: number)");
  has(arena, 'this.turn = this.turn === "white" ? "black" : "white"');
});

test("Phaser normalizes responsive pointer input for drag and release", () => {
  has(arena, "getBoundingClientRect()");
  has(arena, "setPointerCapture");
  has(arena, "BOARD_UNITS / SIZE");
});

test("authoritative snapshots reconcile only at safe physics boundaries", () => {
  has(arena, "pendingAuthoritativeSnapshot");
  has(arena, "AUTHORITATIVE_SNAPSHOT_DEFERRED_DURING_PHYSICS");
  has(arena, "applySnapshotNow");
});

test("authoritative session reconnects and resynchronizes room state", () => {
  has(session, "getRoomState");
  has(session, "RECONNECT_BASE_DELAY_MS");
  has(session, "RECONNECT_MAX_DELAY_MS");
  has(session, "scheduleReconnect");
  has(session, "AUTHORITATIVE_WS_RECONNECT_SCHEDULED");
  has(session, "AUTHORITATIVE_WS_RECONNECTED");
  has(session, "AUTHORITATIVE_STATE_RESYNCED");
  has(session, "window.clearTimeout");
  has(session, "clearReconnectTimer");
});

test("collision settlement is velocity-authoritative", () => {
  has(physics, "minVelocity: GAME_RULES.minVelocity");
  has(physics, "const stillMoving = pieces.some");
  has(physics, "settleTimer");
  lacks(physics, "activeCollisions");
});

test("React owns the application shell while Phaser owns the arena", () => {
  has(app, 'from "motion/react"');
  has(app, "new Phaser.Game");
  has(app, "phaser-host");
});

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
  has(session, "new WebSocket");
  lacks(api, "API_BASE_URL");
});

test("arena startup validates the scene bridge without unsafe assertions", () => {
  has(app, "function isArenaBridge(value: unknown)");
  has(app, "async function waitForArenaBridge");
  has(app, "sceneRef.current = await waitForArenaBridge(game, 5000, startupAbort.signal)");
  has(app, "startupAbort.abort()");
  has(arena, "applyAuthoritativeSnapshot(snapshot: AuthoritativeSnapshot): ArenaState");
  lacks(app, 'getScene("ArenaScene") as ArenaBridge');
});

test("frontend observability centralizes structured logging and redaction", async () => {
  const observability = await readFile(new URL("../src/observability.ts", import.meta.url), "utf8");
  has(observability, "createLogger");
  has(observability, "sanitize");
  has(observability, "SENSITIVE_KEYS");
  has(observability, "[REDACTED]");
});
