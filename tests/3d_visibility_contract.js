// Visual 3D bootstrap contract: render3d.js must publish the live scene instance.
// This is intentionally presentation-only; it does not inspect or alter game rules.
"use strict";

const assert = require("node:assert/strict");

function assertThreeDContract(source) {
  assert.match(source, /window\.ThreeDScene\s*=\s*ThreeDScene/);
  assert.match(source, /window\.__ArChessThreeD\s*=\s*this/);
  assert.match(source, /this\.renderer\.render\(this\.scene,\s*this\.camera\)/);
}

module.exports = { assertThreeDContract };
