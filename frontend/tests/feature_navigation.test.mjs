import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/components/FeatureRail.tsx", import.meta.url), "utf8");

test("feature rail exposes every registered feature", () => {
  for (const id of ["arena", "matchmaking", "ranked", "challenges", "history", "profile", "settings"]) {
    assert.match(source, new RegExp(`FEATURES\\.map`));
    assert.match(source, new RegExp(id));
  }
});

test("feature rail uses accessible navigation semantics", () => {
  assert.match(source, /aria-label="ArChess features"/);
  assert.match(source, /aria-current/);
  assert.match(source, /title=\{feature\.description\}/);
});

test("migration features are visibly distinguished without disabling navigation", () => {
  assert.match(source, /feature\.status === "migration"/);
  assert.match(source, /onClick=\{\(\) => onSelect\(feature\.id\)\}/);
});
