import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const arena = await readFile(new URL("../src/game/ArenaScene.ts", import.meta.url), "utf8");
const physics = await readFile(new URL("../src/game/physics.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../../backend/main.py", import.meta.url), "utf8");

function has(source, fragment) {
  assert.ok(source.includes(fragment), `Expected source to contain: ${fragment}`);
}

function lacks(source, fragment) {
  assert.ok(!source.includes(fragment), `Expected source not to contain: ${fragment}`);
}

test("modern client pins the verified current stack", () => {
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.dependencies.phaser, "4.2.1");
  assert.equal(packageJson.dependencies.motion, "13.1.1");
  assert.equal(packageJson.devDependencies.tailwindcss, "4.3.3");
  assert.equal(packageJson.devDependencies.vite, "8.2.2");
});

test("Phaser owns the game loop and turn lifecycle", () => {
  has(arena, "extends Phaser.Scene");
  has(arena, "update(_time: number, deltaMs: number)");
  has(arena, 'this.phase = "physics"');
  has(arena, 'this.turn = this.turn === "white" ? "black" : "white"');
  lacks(arena, "requestAnimationFrame");
});

test("Phaser normalizes responsive pointer input for drag and release", () => {
  has(app, "mode: Phaser.Scale.FIT");
  has(app, "autoCenter: Phaser.Scale.CENTER_BOTH");
  has(app, "windowEvents: true");
  has(arena, "getBoundingClientRect()");
  has(arena, "setPointerCapture(event.pointerId)");
  has(arena, "releasePointerCapture(event.pointerId)");
  has(arena, "touchAction = \"none\"");
  has(arena, "dragPixels.clone().scale(BOARD_UNITS / SIZE)");
  has(arena, "pointercancel");
  has(arena, "drawAim");
});

test("authoritative snapshots reconcile only at safe physics boundaries", () => {
  has(arena, "pendingAuthoritativeSnapshot");
  has(arena, 'if (this.phase === "physics")');
  has(arena, "AUTHORITATIVE_SNAPSHOT_DEFERRED_DURING_PHYSICS");
  has(arena, "AUTHORITATIVE_SNAPSHOT_RECONCILING_AFTER_LOCAL_SETTLE");
  has(arena, "private applySnapshotNow");
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
  has(api, "FastAPI(");
  has(api, '"/api/health"');
  has(api, '"/api/rooms"');
  has(api, '"/ws/rooms/{room_id}"');
});

test("arena startup validates the scene bridge without unsafe assertions", () => {
  has(app, "function isArenaBridge(value: unknown)");
  has(app, "async function waitForArenaBridge");
  has(app, "sceneRef.current = await waitForArenaBridge(game)");
  has(arena, "applyAuthoritativeSnapshot(snapshot: AuthoritativeSnapshot): ArenaState");
  lacks(app, 'getScene("ArenaScene") as ArenaBridge');
});
