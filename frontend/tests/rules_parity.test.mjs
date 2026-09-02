import assert from "node:assert/strict";
import { test } from "node:test";

const { GAME_RULES, PIECE_RULES, STARTING_TEAM_MAX_HP, calculateDamage } = await import("../src/game/rules.ts");

test("piece rules preserve the legacy combat roles", () => {
  assert.equal(PIECE_RULES.pawn.hp, 30);
  assert.equal(PIECE_RULES.knight.power, 30);
  assert.equal(PIECE_RULES.rook.mass, 1.3);
  assert.equal(PIECE_RULES.queen.power, 70);
  assert.equal(PIECE_RULES.king.hp, 120);
  assert.ok(PIECE_RULES.bishop.friction > PIECE_RULES.pawn.friction);
});

test("starting team health is derived from the complete piece roster", () => {
  assert.equal(STARTING_TEAM_MAX_HP, 790);
});

test("global rules preserve bounded launch and damage behavior", () => {
  assert.equal(GAME_RULES.maxLaunchSpeed, 13.5);
  assert.equal(GAME_RULES.maxCollisionDamage, 58);
  assert.equal(GAME_RULES.minDamageImpact, 0.65);
  assert.equal(GAME_RULES.physicsSubsteps, 3);
  const damage = calculateDamage(PIECE_RULES.king, 8);
  assert.ok(damage > 0);
  assert.ok(damage <= GAME_RULES.maxCollisionDamage);
});
