import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const arena = await readFile(new URL("../src/game/ArenaScene.ts", import.meta.url), "utf8");

test("arena canvas exposes keyboard gameplay controls", () => {
  assert.match(arena, /canvas\.tabIndex = 0/);
  assert.match(arena, /addEventListener\("keydown", this\.handleCanvasKeyDown\)/);
  assert.match(arena, /removeEventListener\("keydown", this\.handleCanvasKeyDown\)/);
  assert.match(arena, /Arrow keys choose a piece/);
  assert.match(arena, /const key = event\.key\.toLowerCase\(\)/);
});

test("keyboard controls select only the active team's living pieces", () => {
  assert.match(arena, /piece\.alive && piece\.team === this\.turn/);
  assert.match(arena, /selectNextKeyboardPiece/);
  assert.match(arena, /selectKeyboardPieceAtIndex/);
});

test("keyboard launch reuses the existing drag launch path", () => {
  assert.match(arena, /this\.dragStart = new Phaser\.Math\.Vector2\(piece\.x \* CELL, piece\.y \* CELL\)/);
  assert.match(arena, /this\.finishDrag\(point\)/);
  assert.match(arena, /KEYBOARD_LAUNCH_REQUESTED/);
});
