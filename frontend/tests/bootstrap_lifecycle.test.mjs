import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("arena bootstrap owns an abort controller for async startup", () => {
  assert.match(app, /new AbortController\(\)/);
  assert.match(app, /signal\?: AbortSignal/);
  assert.match(app, /startupAbort\.signal/);
});

test("arena bootstrap aborts before destroying the game", () => {
  const abortIndex = app.indexOf("startupAbort.abort()");
  const destroyIndex = app.indexOf("gameRef.current?.destroy(true)");
  assert.ok(abortIndex >= 0, "startup cancellation must abort pending async work");
  assert.ok(destroyIndex > abortIndex, "game destruction should follow startup cancellation");
});

test("aborted startup does not surface a false initialization error", () => {
  assert.match(app, /if \(cancelled \|\| startupAbort\.signal\.aborted\) return;/);
});
