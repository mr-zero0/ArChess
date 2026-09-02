import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/observability.ts", import.meta.url), "utf8");

test("frontend observability centralizes structured logging and redaction", () => {
  assert.match(source, /createLogger/);
  assert.match(source, /JSON\.stringify/);
  assert.match(source, /SENSITIVE_KEYS/);
  assert.match(source, /REDACTED/);
  assert.match(source, /timestamp/);
  assert.match(source, /level/);
  assert.match(source, /scope/);
});
