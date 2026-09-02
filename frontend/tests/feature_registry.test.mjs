import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/features.ts", import.meta.url), "utf8");

for (const id of ["arena", "matchmaking", "ranked", "challenges", "history", "profile", "settings"]) {
  test(`feature registry contains ${id}`, () => {
    assert.match(source, new RegExp(`id: [\\\"']${id}[\\\"']`));
  });
}

test("feature registry keeps arena as the live primary surface", () => {
  const arena = source.match(/\{ id: [\"']arena[\"'][^\n]*\}/)?.[0] ?? "";
  assert.match(arena, /status: [\"']live[\"']/);
});
