"use strict";

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

global.window = {};
global.document = { getElementById: () => null };

const ROOT = join(__dirname, "..");
eval(readFileSync(join(ROOT, "static", "js", "replay.js"), "utf8"));

function snapshotPiece() {
  return {
    id: "w-pawn-1",
    type: "pawn",
    team: "white",
    x: 1,
    y: 1,
    vx: 0,
    vy: 0,
    hp: 30,
    maxHp: 30,
    power: 5,
    alive: true,
  };
}

test("replay retains authoritative integrity records", () => {
  window.ReplayRecorder.reset();
  window.ReplayRecorder.startRecording([snapshotPiece()], "match");
  window.ReplayRecorder.recordLaunch({ pieceId: "w-pawn-1", team: "white", dx: 1, dy: 0, power: 5 });
  window.ReplayRecorder.recordIntegrity({
    preHash: "a".repeat(64),
    postHash: "b".repeat(64),
    shotHash: "c".repeat(64),
  });
  window.ReplayRecorder.recordIntegrity({
    preHash: "a".repeat(64),
    postHash: "b".repeat(64),
    shotHash: "c".repeat(64),
  });

  const replay = window.ReplayRecorder.exportReplay();
  const integrity = replay.recordings.filter((record) => record.type === "integrity");

  assert.equal(integrity.length, 1);
  assert.equal(replay.integrity.recordCount, 1);
  assert.equal(replay.integrity.verifiedShape, true);
  assert.equal(integrity[0].shotHash, "c".repeat(64));
});

test("replay viewer accepts integrity-bearing recordings", () => {
  window.ReplayRecorder.reset();
  window.ReplayRecorder.startRecording([snapshotPiece()], "match");
  window.ReplayRecorder.recordIntegrity({
    preHash: "1".repeat(64),
    postHash: "2".repeat(64),
    shotHash: "3".repeat(64),
  });

  const replay = window.ReplayRecorder.exportReplay();
  assert.doesNotThrow(() => window.ReplayViewer.load(replay, { pieces: [snapshotPiece()] }, false));
});
