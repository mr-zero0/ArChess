import assert from "node:assert/strict";
import { test } from "node:test";

const { PhysicsWorld } = await import("../src/game/physics.ts");
const { createInitialPieces } = await import("../src/game/setup.ts");

test("full round-trip gameplay: White launch leads to Black turn", () => {
    const world = new PhysicsWorld();
    const pieces = createInitialPieces();
    let turn = "white";

    const whitePiece = pieces.find(p => p.team === "white" && p.type === "pawn");
    assert.ok(whitePiece);
    whitePiece.moving = true;
    whitePiece.vx = 5;

    let settled = false;
    for (let i = 0; i < 200; i++) {
        settled = world.step(pieces, 0.016);
        if (settled) break;
    }

    if (settled) {
        turn = turn === "white" ? "black" : "white";
    }

    assert.equal(turn, "black", "Turn should have switched to black after settlement");
});
