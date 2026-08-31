import assert from "node:assert/strict";
import { test } from "node:test";

const { PhysicsWorld, PHYSICS } = await import("../src/game/physics.ts");
const { createInitialPieces } = await import("../src/game/setup.ts");

function piece(id, team, x, y) {
  return { id, type: "pawn", team, x, y, vx: 0, vy: 0, radius: 0.25, mass: 2, hp: 45, maxHp: 45, power: 5, launchMul: 1, friction: 0.985, restitution: 0.84, damageMul: 0.75, collisionMul: 0.85, alive: true, moving: false };
}

test("initial arena setup contains 32 canonical pieces", () => {
  const pieces = createInitialPieces();
  assert.equal(pieces.length, 32);
  assert.equal(new Set(pieces.map((item) => item.id)).size, 32);
  assert.ok(pieces.some((item) => item.id === "white-pawn-0" && item.x === 0.5 && item.y === 6.5));
  assert.ok(pieces.some((item) => item.id === "black-king-4" && item.x === 4.5 && item.y === 0.5));
});

test("struck stationary pawn receives and integrates collision recoil", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 6;
  white.moving = true;

  world.step([white, black], 0.016);
  assert.notEqual(black.vx, 0, "collision must impart velocity to the struck pawn");
  assert.equal(black.moving, true);

  const beforeNextFrame = black.x;
  world.step([white, black], 0.016);
  assert.notEqual(black.x, beforeNextFrame, "struck pawn must be integrated on the following frame");
});

test("collision separation leaves a stable non-overlapping pair", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 6;
  white.moving = true;

  world.step([white, black], 0.016);
  const distance = Math.hypot(black.x - white.x, black.y - white.y);
  assert.ok(distance >= white.radius + black.radius + PHYSICS.separation - 1e-9);
  assert.ok(Number.isFinite(white.x) && Number.isFinite(white.y));
  assert.ok(Number.isFinite(black.x) && Number.isFinite(black.y));
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

test("collision damage reduces both pieces and reports the applied damage", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 12;
  white.moving = true;

  world.step([white, black], 0.016);
  const collision = world.events.find((event) => event.type === "collision");
  assert.ok(collision, "a high-speed overlap must emit a collision event");
  assert.ok(collision.damageA > 0);
  assert.ok(collision.damageB > 0);
  assert.equal(white.hp, white.maxHp - collision.damageA);
  assert.equal(black.hp, black.maxHp - collision.damageB);
  assert.ok(white.hp < white.maxHp);
  assert.ok(black.hp < black.maxHp);
});

test("collision cooldown prevents repeated damage while a pair remains in contact", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 10;
  white.moving = true;

  world.step([white, black], 0.016);
  const firstCollision = world.events.find((event) => event.type === "collision");
  assert.ok(firstCollision);
  const hpAfterFirstHit = { white: white.hp, black: black.hp };

  white.x = 3.0;
  black.x = 3.48;
  white.vx = 0;
  black.vx = 0;
  white.moving = true;
  black.moving = false;
  world.step([white, black], Math.min(PHYSICS.collisionCooldown * 0.25, 0.02));

  assert.equal(white.hp, hpAfterFirstHit.white);
  assert.equal(black.hp, hpAfterFirstHit.black);
});

test("collision pair becomes damageable again after cooldown expiry", () => {
  const world = new PhysicsWorld();
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  const pieces = [white, black];

  white.vx = 10;
  white.moving = true;
  world.step(pieces, 0.016);
  const firstCollision = world.events.find((event) => event.type === "collision");
  assert.ok(firstCollision);
  const hpAfterFirstHit = { white: white.hp, black: black.hp };

  white.x = 1.5;
  black.x = 5.5;
  white.vx = 0;
  black.vx = 0;
  white.moving = false;
  black.moving = false;
  const advanceFrames = Math.ceil(PHYSICS.collisionCooldown / 0.016) + 2;
  for (let i = 0; i < advanceFrames; i += 1) world.step(pieces, 0.016);

  white.x = 3.0;
  black.x = 3.48;
  white.vx = 10;
  white.moving = true;
  world.step(pieces, 0.016);
  const secondCollision = world.events.find((event) => event.type === "collision");
  assert.ok(secondCollision, "the pair should become damageable after cooldown expiry");
  assert.ok(white.hp < hpAfterFirstHit.white || black.hp < hpAfterFirstHit.black);
});

test("three-piece collision chain remains finite and moving", () => {
  const world = new PhysicsWorld();
  const left = piece("left", "white", 2.6, 3.0);
  const center = piece("center", "black", 3.0, 3.0);
  const right = piece("right", "white", 3.4, 3.0);
  left.vx = 8;
  left.moving = true;
  right.vx = -2;
  right.moving = true;
  const pieces = [left, center, right];

  for (let i = 0; i < 90; i += 1) {
    world.step(pieces, 1 / 120);
    for (const current of pieces) {
      assert.ok(Number.isFinite(current.x) && Number.isFinite(current.y));
      assert.ok(Number.isFinite(current.vx) && Number.isFinite(current.vy));
      assert.ok(current.x >= current.radius && current.x <= PHYSICS.boardSize - current.radius);
      assert.ok(current.y >= current.radius && current.y <= PHYSICS.boardSize - current.radius);
    }
  }
});

test("repeated collisions do not freeze the scene", () => {
  const world = new PhysicsWorld();
  // Create two pawns that will bounce back and forth repeatedly
  const white = piece("white-pawn", "white", 3.0, 3.0);
  const black = piece("black-pawn", "black", 3.48, 3.0);
  white.vx = 6;
  white.moving = true;
  black.vx = -6;
  black.moving = true;
  const pieces = [white, black];

  // Simulate many steps to ensure no freeze (positions/velocities stay finite)
  for (let step = 0; step < 1000; step += 1) {
    world.step(pieces, 0.016);
    // After each step, ensure all values are finite
    for (const p of pieces) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `position non-finite at step ${step}`);
      assert.ok(Number.isFinite(p.vx) && Number.isFinite(p.vy), `velocity non-finite at step ${step}`);
      // Optional: ensure they stay within board bounds (with some tolerance)
      assert.ok(p.x >= -0.5 && p.x <= PHYSICS.boardSize + 0.5, `x out of reasonable bounds at step ${step}`);
      assert.ok(p.y >= -0.5 && p.y <= PHYSICS.boardSize + 0.5, `y out of reasonable bounds at step ${step}`);
    }
  }
});
