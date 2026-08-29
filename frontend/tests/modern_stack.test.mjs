import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const arena = await readFile(new URL("../src/game/ArenaScene.ts", import.meta.url), "utf8");
const physics = await readFile(new URL("../src/game/physics.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../../backend/main.py", import.meta.url), "utf8");

test("modern client pins the verified current stack", () => {
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.dependencies.phaser, "4.2.1");
  assert.equal(packageJson.dependencies.motion, "13.1.1");
  assert.equal(packageJson.devDependencies.tailwindcss, "4.3.3");
  assert.equal(packageJson.devDependencies.vite, "8.2.2");
});

test("Phaser owns the game loop and turn lifecycle", () => {
  assert.match(arena, /extends Phaser\\.Scene/);
  assert.match(arena, /update\\(_time: number, deltaMs: number\\)/);
  assert.match(arena, /this\\.phase = "physics"/);
  assert.match(arena, /this\\.turn = this\\.turn === "white" \\? "black" : "white"/);
  assert.doesNotMatch(arena, /requestAnimationFrame/);
});

test("Phaser normalizes responsive pointer input for drag and release", () => {
  assert.match(app, /mode: Phaser\\.Scale\\.FIT/);
  assert.match(app, /autoCenter: Phaser\\.Scale\\.CENTER_BOTH/);
  assert.match(app, /windowEvents: true/);
  assert.match(arena, /pointer\\.worldX/);
  assert.match(arena, /pointer\\.worldY/);
  assert.match(arena, /pointerupoutside/);
  assert.match(arena, /drawAim/);
});

test("collision settlement is velocity-authoritative", () => {
  assert.match(physics, /minVelocity:\\s*GAME_RULES\\.minVelocity/);
  assert.match(physics, /const stillMoving = pieces\\.some/);
  assert.match(physics, /settleTimer/);
  assert.doesNotMatch(physics, /activeCollisions/);
});

test("React owns the application shell while Phaser owns the arena", () => {
  assert.match(app, /from "motion\\/react"/);
  assert.match(app, /new Phaser\\.Game/);
  assert.match(app, /phaser-host/);
});

test("FastAPI exposes the modern transport boundary", () => {
  assert.match(api, /FastAPI\\(/);
  assert.match(api, /\\/api\\/health/);
  assert.match(api, /\\/api\\/rooms/);
  assert.match(api, /\\/ws\\/rooms\\/\\{room_id\\}/);
});

test("arena startup waits for a real authoritative scene bridge", () => {
  assert.match(app, /function isArenaBridge\\(value: unknown\\)/);
  assert.match(app, /value !== null && typeof value === "object"/);
  assert.match(app, /async function waitForArenaBridge/);
  assert.match(app, /sceneRef\\.current = await waitForArenaBridge\\(game\\)/);
  assert.doesNotMatch(app, /getScene\\("ArenaScene"\\) as ArenaBridge/);
});
