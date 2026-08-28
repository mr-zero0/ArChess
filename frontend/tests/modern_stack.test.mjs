import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const arena = await readFile(new URL("../src/game/ArenaScene.ts", import.meta.url), "utf8");
const physics = await readFile(new URL("../src/game/physics.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("modern client pins the verified current stack", () => {
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.dependencies.phaser, "4.2.1");
  assert.equal(packageJson.dependencies.motion, "13.1.1");
  assert.equal(packageJson.devDependencies.tailwindcss, "4.3.3");
  assert.equal(packageJson.devDependencies.vite, "8.2.2");
});

test("Phaser owns the game loop and turn lifecycle", () => {
  assert.match(arena, /extends Phaser\.Scene/);
  assert.match(arena, /update\(_time: number, deltaMs: number\)/);
  assert.match(arena, /this\.phase = "physics"/);
  assert.match(arena, /this\.turn = this\.turn === "white" \? "black" : "white"/);
  assert.doesNotMatch(arena, /requestAnimationFrame/);
});

test("collision settlement uses velocity rather than a persistent collision gate", () => {
  assert.match(physics, /piece\.moving = false/);
  assert.match(physics, /speed\(piece\) < PHYSICS\.minVelocity/);
  assert.match(physics, /settleTimer/);
  assert.doesNotMatch(physics, /activeCollisions/);
});

test("React owns the application shell while Phaser owns the arena", () => {
  assert.match(app, /from "motion\/react"/);
  assert.match(app, /new Phaser\.Game/);
  assert.match(app, /phaser-host/);
});
