import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

function has(source, fragment) {
  assert.ok(source.includes(fragment), `Expected source to contain: ${fragment}`);
}

test("modern arena preserves basic keyboard and touch accessibility", () => {
  has(styles, "button:focus-visible");
  has(styles, "@media (pointer: coarse)");
  has(styles, "min-width: 44px");
  has(styles, "touch-action: none");
  has(styles, "@media (prefers-reduced-motion: reduce)");
  has(app, 'aria-label="ArChess Phaser arena"');
  has(app, "aria-live=\"polite\"");
});
