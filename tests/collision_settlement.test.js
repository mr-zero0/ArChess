"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
const ROOT = join(__dirname, "..");
eval(readFileSync(join(ROOT, "static", "js", "pieces.js"), "utf8"));
eval(readFileSync(join(ROOT, "static", "js", "physics.js"), "utf8"));

const { PieceFactory, Physics } = window;

function makeGame(pieces) {
  return {
    pieces,
    activeCollisions: new Set(),
    hitPairs: new Map(),
    simTime: 0,
    onImpact: () => {},
    onWallImpact: () => {},
  };
}

test("first collision separates bodies and clears the settle blocker", () => {
  const mover = PieceFactory.make("pawn", "white", 0, 0);
  const target = PieceFactory.make("pawn", "black", 0, 0);
  mover.x = 2;
  mover.y = 4;
  target.x = 3;
  target.y = 4;
  mover.vx = 6;
  mover.vy = 0;
  mover.moving = true;

  const game = makeGame([mover, target]);
  let impacts = 0;
  game.onImpact = () => { impacts += 1; };

  let settled = false;
  for (let i = 0; i < 600; i += 1) {
    game.simTime += 1 / 60;
    Physics.step(game, 1 / 60);
    if (!mover.moving && !target.moving && game.activeCollisions.size === 0) {
      settled = true;
      break;
    }
  }

  assert.ok(impacts >= 1, "the first impact must be registered");
  assert.ok(settled, "the first collision must eventually settle instead of freezing");

  const distance = Math.hypot(target.x - mover.x, target.y - mover.y);
  const minimum = mover.radius + target.radius;
  assert.ok(distance >= minimum + 0.001 - 1e-6, `bodies must be separated after resolution (distance=${distance})`);
  assert.equal(game.activeCollisions.size, 0, "settled bodies must not hold the active-collision gate");
});

test("stationary overlap recovery does not block settlement", () => {
  const a = PieceFactory.make("pawn", "white", 4, 4);
  const b = PieceFactory.make("pawn", "black", 4, 4);
  const game = makeGame([a, b]);

  Physics.step(game, 1 / 60);

  assert.equal(a.moving, false);
  assert.equal(b.moving, false);
  assert.equal(game.activeCollisions.size, 0);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > a.radius + b.radius);
});
