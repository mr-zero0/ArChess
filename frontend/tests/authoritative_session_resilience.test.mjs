import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const session = await readFile(new URL("../src/game/authoritativeSession.ts", import.meta.url), "utf8");

function has(text) {
  assert.ok(session.includes(text), `Expected authoritative session to contain: ${text}`);
}

test("reconnect state prevents launch from cancelling scheduled recovery", () => {
  has("type ConnectionState");
  has("let connectionState: ConnectionState = \"idle\"");
  has("if (connectionState === \"connecting\" || connectionState === \"reconnecting\")");
  has("connectionState = \"reconnecting\"");
  has("connectionState = \"connected\"");
  has("connectionState = \"closed\"");
  has("connectPromise");
});
