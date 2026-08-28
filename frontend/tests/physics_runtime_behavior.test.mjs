import assert from "node:assert/strict";
import { test } from "node:test";

const { PhysicsWorld, PHYSICS } = await import("../src/game/physics.ts");

function piece(id, team, x, y) {
  return { id, type: "pawn", team, x, y, vx: 0, vy: 0, radius: 0.25, mass: 2, hp: 45, maxHp: 45, power: 5, alive: true, moving: false };
}

test("struck stationary pawn receives and integrates collision recoil", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 6;
  white.moving = true;

  world.step([white, black], 0.016);
  const blackAfterCollision = { x: black.x, vx: black.vx, moving: black.moving };
  assert.ok(blackAfterCollision.vx !== 0, "collision must impart velocity to the struck pawn");
  assert.equal(blackAfterCollision.moving, true);

  const beforeNextFrame = black.x;
  world.step([white, black], 0.016);
  assert.notEqual(black.x, beforeNextFrame, "struck pawn must be integrated on the following frame");
});

test("settlement does not occur while a struck pawn still has visible residual speed", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = PHYSICS.minVelocity * 4;
  white.moving = true;

  let settled = false;
  for (let i = 0; i < 3; i += 1) settled = world.step([white, black], 0.016) || settled;
  assert.equal(settled, false);
});
