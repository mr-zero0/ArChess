import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const physics = await readFile(new URL("../src/game/physics.ts", import.meta.url), "utf8");

test("collision impulses wake struck pieces below the settle threshold", () => {
  assert.match(physics, /impulseEpsilon:\s*0\.001/);
  assert.match(physics, /if \(speed\(a\) > PHYSICS\.impulseEpsilon\) a\.moving = true/);
  assert.match(physics, /if \(speed\(b\) > PHYSICS\.impulseEpsilon\) b\.moving = true/);
  assert.doesNotMatch(physics, /if \(speed\(b\) >= PHYSICS\.minVelocity\) b\.moving = true/);
});
