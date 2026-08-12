"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Load the client-side game modules into a Node context the same way
// index.html does, using a minimal window shim.
// ---------------------------------------------------------------------------

global.window = global;

const ROOT = join(__dirname, "..");
eval(readFileSync(join(ROOT, "static", "js", "pieces.js"), "utf8"));
eval(readFileSync(join(ROOT, "static", "js", "physics.js"), "utf8"));

const { GAME_CONFIG, PIECES, PieceFactory, Physics } = window;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGame(pieces) {
  const game = {
    pieces,
    activeCollisions: new Set(),
    hitPairs: new Map(),
    simTime: 0,
    onImpact: () => {},
    onWallImpact: () => {},
  };
  installImpactHandler(game);
  return game;
}

function installImpactHandler(game) {
  game.onImpact = ({ a, b, damageToA, damageToB }) => {
    a.hp = Math.max(0, a.hp - damageToA);
    b.hp = Math.max(0, b.hp - damageToB);
    if (a.hp <= 0) destroyPiece(a);
    if (b.hp <= 0) destroyPiece(b);
  };
  game.onWallImpact = () => {};
}

function destroyPiece(piece) {
  piece.alive = false;
  piece.moving = false;
  piece.vx = 0;
  piece.vy = 0;
}

function makePiece(type, team, x, y) {
  const piece = PieceFactory.make(type, team, 0, 0);
  piece.x = x;
  piece.y = y;
  return piece;
}

function speed(piece) {
  return Math.hypot(piece.vx, piece.vy);
}

function totalKineticEnergy(pieces) {
  return pieces.reduce((sum, p) => sum + 0.5 * p.mass * speed(p) ** 2, 0);
}

// ---------------------------------------------------------------------------
// Launch behavior
// ---------------------------------------------------------------------------

test("launch clamps to maxLaunchSpeed", () => {
  const piece = makePiece("pawn", "white", 2, 4);
  const launched = Physics.launch(piece, -10, 0);
  assert.equal(launched, true);
  assert.ok(speed(piece) <= GAME_CONFIG.maxLaunchSpeed + 1e-9);
  assert.ok(speed(piece) > 0);
  assert.equal(piece.moving, true);
});

test("zero-distance drag does not launch", () => {
  const piece = makePiece("pawn", "white", 2, 4);
  const launched = Physics.launch(piece, 0, 0);
  assert.equal(launched, false);
  assert.equal(piece.moving, false);
  assert.equal(speed(piece), 0);
});

// ---------------------------------------------------------------------------
// High-speed tunneling
// ---------------------------------------------------------------------------

test("high-speed piece collides with a stationary target instead of tunneling through", () => {
  const mover = makePiece("pawn", "white", 2, 4);
  const target = makePiece("pawn", "black", 4, 4);
  mover.vx = GAME_CONFIG.maxLaunchSpeed;
  mover.moving = true;

  const game = makeGame([mover, target]);
  let impacts = 0;
  const originalHandler = game.onImpact;
  game.onImpact = (event) => {
    impacts += 1;
    originalHandler(event);
  };

  for (let i = 0; i < 12 && impacts === 0; i += 1) {
    Physics.step(game, 0.1);
  }

  assert.ok(impacts >= 1, "fast mover must register a collision with the target");
  assert.ok(target.hp < target.maxHp, "target must take damage from the impact");
});

test("fast piece passing a target it should miss does not collide", () => {
  const mover = makePiece("pawn", "white", 2, 4);
  const bystander = makePiece("pawn", "black", 6, 5);
  mover.vx = GAME_CONFIG.maxLaunchSpeed;
  mover.moving = true;

  const game = makeGame([mover, bystander]);
  let impacts = 0;
  const originalHandler = game.onImpact;
  game.onImpact = (event) => {
    impacts += 1;
    originalHandler(event);
  };

  for (let i = 0; i < 30; i += 1) {
    Physics.step(game, 1 / 60);
  }

  assert.equal(impacts, 0, "a piece that should pass by must not collide");
  assert.ok(mover.x > 5, "mover should have travelled past the bystander");
});

// ---------------------------------------------------------------------------
// Simultaneous collision
// ---------------------------------------------------------------------------

test("simultaneous collision resolves every involved pair", () => {
  const mover = makePiece("pawn", "white", 2, 4);
  const left = makePiece("pawn", "black", 3.44, 3.8);
  const right = makePiece("pawn", "black", 3.44, 4.2);
  mover.vx = GAME_CONFIG.maxLaunchSpeed;
  mover.moving = true;

  const game = makeGame([mover, left, right]);
  const hitSet = new Set();
  const originalHandler = game.onImpact;
  game.onImpact = (event) => {
    hitSet.add(event.a.id);
    hitSet.add(event.b.id);
    originalHandler(event);
  };

  for (let i = 0; i < 12; i += 1) {
    Physics.step(game, 0.1);
  }

  assert.ok(hitSet.has(mover.id), "mover must participate in the collision");
  assert.ok(hitSet.has(left.id), "left target must be resolved in the same event");
  assert.ok(hitSet.has(right.id), "right target must be resolved in the same event");
  assert.ok(left.hp < left.maxHp, "left target must take damage");
  assert.ok(right.hp < right.maxHp, "right target must take damage");
});

// ---------------------------------------------------------------------------
// Wall / corner behaviour
// ---------------------------------------------------------------------------

test("corner impact reflects both velocity components and keeps the piece in bounds", () => {
  const piece = makePiece("pawn", "white", 0.28, 0.28);
  piece.vx = -4;
  piece.vy = -5;
  piece.moving = true;

  const game = makeGame([piece]);
  Physics.step(game, 1 / 60);

  assert.ok(piece.vx > 0, "vx must reflect off the left wall");
  assert.ok(piece.vy > 0, "vy must reflect off the bottom wall");
  assert.ok(piece.x >= piece.radius - 1e-9, "piece must stay in bounds");
  assert.ok(piece.y >= piece.radius - 1e-9, "piece must stay in bounds");
});

test("wall bounce reflects velocity without exceeding maxLaunchSpeed", () => {
  const piece = makePiece("pawn", "white", 0.28, 4);
  piece.vx = -GAME_CONFIG.maxLaunchSpeed;
  piece.moving = true;

  const game = makeGame([piece]);
  Physics.step(game, 1 / 60);

  assert.ok(piece.vx > 0, "velocity must reflect off the wall");
  assert.ok(speed(piece) <= GAME_CONFIG.maxLaunchSpeed + 1e-9);
  assert.ok(piece.x >= piece.radius - 1e-9);
});

// ---------------------------------------------------------------------------
// Overlapping-piece recovery
// ---------------------------------------------------------------------------

test("deeply overlapping pieces are pushed apart", () => {
  const a = makePiece("pawn", "white", 4, 4);
  const b = makePiece("pawn", "black", 4, 4);
  const game = makeGame([a, b]);

  Physics.step(game, 1 / 60);

  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const minDistance = a.radius + b.radius;
  assert.ok(distance >= minDistance - 1e-6, `expected separation, got distance ${distance}`);
  assert.ok(distance > 0.01, "pieces must not remain at the same point");
});

test("recovery respects the boundary so pieces do not escape the board", () => {
  const a = makePiece("pawn", "white", 0.3, 4);
  const b = makePiece("pawn", "black", 0.3, 4);
  const game = makeGame([a, b]);

  Physics.step(game, 1 / 60);

  assert.ok(a.x >= a.radius - 1e-6);
  assert.ok(b.x >= b.radius - 1e-6);
});

// ---------------------------------------------------------------------------
// King destroyed during a chain
// ---------------------------------------------------------------------------

test("king destroyed during a chain is removed from active physics", () => {
  const king = makePiece("king", "black", 4, 4);
  king.hp = 1;
  const ram = makePiece("queen", "white", 2, 4);
  ram.vx = GAME_CONFIG.maxLaunchSpeed;
  ram.moving = true;

  const game = makeGame([king, ram]);
  let kingImpactCount = 0;
  const originalHandler = game.onImpact;
  game.onImpact = (event) => {
    originalHandler(event);
    if (event.a.id === king.id || event.b.id === king.id) kingImpactCount += 1;
  };

  for (let i = 0; i < 60; i += 1) {
    Physics.step(game, 1 / 60);
  }

  assert.equal(king.alive, false, "king must be destroyed");
  assert.equal(king.moving, false, "dead king must not keep moving");
  assert.equal(king.vx, 0);
  assert.equal(king.vy, 0);
  assert.ok(kingImpactCount <= 1, `dead king must not take repeat damage, got ${kingImpactCount}`);
  assert.ok(ram.x >= ram.radius - 1e-6 && ram.x <= GAME_CONFIG.boardSize - ram.radius + 1e-6);
});

// ---------------------------------------------------------------------------
// Collision cooldown
// ---------------------------------------------------------------------------

test("repeat damage is suppressed while a pair stays in contact", () => {
  const a = makePiece("pawn", "white", 4, 4);
  const b = makePiece("pawn", "black", 4.4, 4);
  b.vx = -2;
  b.moving = true;

  const game = makeGame([a, b]);
  let damageEvents = 0;
  game.onImpact = () => {
    damageEvents += 1;
  };

  Physics.step(game, 1 / 60);
  assert.equal(damageEvents, 1, "first contact applies damage once");

  a.x = 4;
  a.y = 4;
  b.x = 4.4;
  b.y = 4;
  b.vx = -2;
  b.moving = true;
  game.simTime += 0.05;
  Physics.step(game, 1 / 60);
  assert.equal(damageEvents, 1, "no repeat damage while within collisionCooldown");

  a.x = 4;
  a.y = 4;
  a.vx = 0;
  a.vy = 0;
  a.moving = false;
  b.x = 4.4;
  b.y = 4;
  b.vx = -2;
  b.vy = 0;
  b.moving = true;
  game.simTime += 0.2;
  Physics.step(game, 1 / 60);
  assert.ok(damageEvents >= 2, "a fresh impact after the cooldown applies damage again");
});

// ---------------------------------------------------------------------------
// Settling always terminates
// ---------------------------------------------------------------------------

test("full board settles to rest within a bounded number of steps", () => {
  const pieces = PieceFactory.setup();
  const game = makeGame(pieces);

  const whiteQueen = pieces.find((p) => p.type === "queen" && p.team === "white");
  const blackRook = pieces.find((p) => p.type === "rook" && p.team === "black");
  const whitePawn = pieces.find((p) => p.type === "pawn" && p.team === "white");

  whiteQueen.vx = 6.0;
  whiteQueen.vy = 1.2;
  whiteQueen.moving = true;
  blackRook.vx = -5.0;
  blackRook.vy = 2.4;
  blackRook.moving = true;
  whitePawn.vx = 2.5;
  whitePawn.vy = -1.0;
  whitePawn.moving = true;

  const initialEnergy = totalKineticEnergy(pieces);
  let peakEnergy = initialEnergy;

  const maxSteps = 30000;
  let settledAt = -1;
  for (let i = 0; i < maxSteps; i += 1) {
    Physics.step(game, 1 / 60);
    const energy = totalKineticEnergy(pieces);
    peakEnergy = Math.max(peakEnergy, energy);

    const allStopped = pieces.every((p) => !p.alive || !p.moving);
    if (allStopped) {
      settledAt = i;
      break;
    }
  }

  assert.ok(settledAt >= 0, "board must settle to rest");
  assert.ok(settledAt < maxSteps, `settling must terminate within ${maxSteps} steps`);
  assert.ok(peakEnergy <= initialEnergy * 1.01 + 1e-9, "no unexplained energy gain during the chain");
});

test("a single launched piece settles below minVelocity", () => {
  const piece = makePiece("rook", "white", 1, 1);
  piece.vx = GAME_CONFIG.maxLaunchSpeed;
  piece.vy = 0;
  piece.moving = true;

  const game = makeGame([piece]);
  for (let i = 0; i < 3000 && piece.moving; i += 1) {
    Physics.step(game, 1 / 60);
  }

  assert.equal(piece.moving, false, "piece must come to rest");
  assert.ok(speed(piece) < GAME_CONFIG.minVelocity);
});
