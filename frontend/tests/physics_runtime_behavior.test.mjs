import assert from "node:assert/strict";
import { test } from "node:test";

const { PhysicsWorld, PHYSICS } = await import("../src/game/physics.ts");

function piece(id, team, x, y) {
  return { id, type: "pawn", team, x, y, vx: 0, vy: 0, radius: 0.25, mass: 2, hp: 45, maxHp: 45, power: 5, launchMul: 1, friction: 0.985, restitution: 0.84, damageMul: 0.75, collisionMul: 0.85, alive: true, moving: false };
}

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
