import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/api/rooms.ts", import.meta.url), "utf8");

test("room client exposes create, join and reconnect lifecycle", () => {
  assert.match(source, /export function createRoom/);
  assert.match(source, /export function joinRoom/);
  assert.match(source, /export function reconnectRoom/);
  assert.match(source, /\/api\/rooms/);
  assert.match(source, /\/reconnect/);
});

test("room client sends guest identity as JSON", () => {
  assert.match(source, /JSON\.stringify\(\{ guestId: client\.guestId \}\)/);
});
