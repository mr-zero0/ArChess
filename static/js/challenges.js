"use strict";

// STEP 8 — Trick Shot Challenges: pre-made board scenarios that test
// specific combat skills. Each challenge defines a custom piece layout
// and a win condition (e.g. destroy King in 1 turn, chain 3+ hits).

window.ChallengeManager = (() => {
  const CHALLENGES = [
    {
      id: "king_strike",
      name: "King Strike",
      description: "Destroy the Black King in a single shot. Line up and fire!",
      difficulty: 1,
      pieces: [
        { type: "queen", team: "white", col: 3, row: 5 },
        { type: "king",  team: "white", col: 4, row: 7 },
        { type: "king",  team: "black", col: 4, row: 1 },
      ],
      goal: "destroyKing",
      goalValue: { maxTurns: 1 },
    },
    {
      id: "bank_shot",
      name: "Bank Shot",
      description: "The Black King hides behind pawns. Bounce off the wall to reach him!",
      difficulty: 2,
      pieces: [
        { type: "rook",  team: "white", col: 0, row: 5 },
        { type: "king",  team: "white", col: 4, row: 7 },
        { type: "pawn",  team: "black", col: 2, row: 1 },
        { type: "pawn",  team: "black", col: 3, row: 1 },
        { type: "pawn",  team: "black", col: 4, row: 1 },
        { type: "pawn",  team: "black", col: 5, row: 1 },
        { type: "king",  team: "black", col: 3, row: 0 },
      ],
      goal: "destroyKing",
      goalValue: { maxTurns: 3 },
    },
    {
      id: "chain_reaction",
      name: "Chain Reaction",
      description: "Hit 3 or more pieces in a single launch. Set off a chain!",
      difficulty: 2,
      pieces: [
        { type: "rook",  team: "white", col: 0, row: 4 },
        { type: "king",  team: "white", col: 0, row: 7 },
        { type: "pawn",  team: "black", col: 3, row: 4 },
        { type: "pawn",  team: "black", col: 4, row: 3 },
        { type: "pawn",  team: "black", col: 5, row: 4 },
        { type: "pawn",  team: "black", col: 4, row: 5 },
        { type: "king",  team: "black", col: 7, row: 0 },
      ],
      goal: "chainHits",
      goalValue: { minChain: 3, maxTurns: 1 },
    },
    {
      id: "pawn_bowling",
      name: "Pawn Bowling",
      description: "Knock out all 4 pawns in the lane using the Rook. Strike!",
      difficulty: 2,
      pieces: [
        { type: "rook",  team: "white", col: 3, row: 6 },
        { type: "king",  team: "white", col: 0, row: 7 },
        { type: "pawn",  team: "black", col: 3, row: 2 },
        { type: "pawn",  team: "black", col: 3, row: 3 },
        { type: "pawn",  team: "black", col: 4, row: 2 },
        { type: "pawn",  team: "black", col: 4, row: 3 },
        { type: "king",  team: "black", col: 7, row: 0 },
      ],
      goal: "destroyCount",
      goalValue: { team: "black", type: "pawn", count: 4, maxTurns: 2 },
    },
    {
      id: "friendly_fire",
      name: "Friendly Fire",
      description: "Destroy the enemy Knight without damaging any of your own pieces. Precision counts!",
      difficulty: 3,
      pieces: [
        { type: "bishop", team: "white", col: 1, row: 5 },
        { type: "pawn",   team: "white", col: 3, row: 4 },
        { type: "pawn",   team: "white", col: 5, row: 4 },
        { type: "king",   team: "white", col: 4, row: 7 },
        { type: "knight", team: "black", col: 4, row: 2 },
        { type: "king",   team: "black", col: 7, row: 0 },
      ],
      goal: "destroyTarget",
      goalValue: { targetType: "knight", targetTeam: "black", noFriendlyDamage: true, maxTurns: 3 },
    },
  ];

  let active = null;        // current challenge object or null
  let turnsTaken = 0;
  let initialFriendlyHp = 0;  // total HP of player's pieces at start
  let onChange = null;

  function list() {
    return CHALLENGES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      difficulty: c.difficulty,
    }));
  }

  function get(id) {
    return CHALLENGES.find((c) => c.id === id) || null;
  }

  function getActive() {
    return active;
  }

  function buildPieces(challenge) {
    return challenge.pieces.map((def) => {
      const piece = PieceFactory.make(def.type, def.team, def.col, def.row);
      if (typeof def.hp === "number") {
        piece.hp = def.hp;
        piece.maxHp = def.hp;
      }
      return piece;
    });
  }

  function start(challengeId) {
    const challenge = get(challengeId);
    if (!challenge) return null;
    active = challenge;
    turnsTaken = 0;
    if (onChange) onChange(active);
    return active;
  }

  function recordTurn() {
    if (!active) return;
    turnsTaken += 1;
  }

  function storeInitialFriendlyHp(pieces) {
    initialFriendlyHp = 0;
    for (const p of pieces) {
      if (p.team === "white" && p.alive) initialFriendlyHp += p.hp;
    }
  }

  function check(gameState) {
    if (!active) return null;

    const goal = active.goal;
    const val = active.goalValue;

    // Check turn limit (fail condition)
    const overTurnLimit = val.maxTurns && turnsTaken > val.maxTurns;

    switch (goal) {
      case "destroyKing": {
        const blackKing = gameState.pieces.find((p) => p.type === "king" && p.team === "black");
        const destroyed = !blackKing || !blackKing.alive || blackKing.hp <= 0;
        if (destroyed) return result(true, "King destroyed!");
        if (overTurnLimit) return result(false, `Failed — King survived after ${val.maxTurns} turn(s).`);
        return null; // still in progress
      }

      case "chainHits": {
        const maxCombo = gameState.maxCombo || 0;
        // Check after each turn settles
        if (maxCombo >= val.minChain) return result(true, `Chain of ${maxCombo}! Challenge complete!`);
        if (overTurnLimit) return result(false, `Failed — only reached chain of ${maxCombo}.`);
        return null;
      }

      case "destroyCount": {
        const destroyed = gameState.pieces.filter(
          (p) => p.team === val.team && p.type === val.type && (!p.alive || p.hp <= 0)
        ).length;
        if (destroyed >= val.count) return result(true, `All ${val.count} ${val.type}s destroyed!`);
        if (overTurnLimit) return result(false, `Failed — only destroyed ${destroyed}/${val.count}.`);
        return null;
      }

      case "destroyTarget": {
        const target = gameState.pieces.find(
          (p) => p.type === val.targetType && p.team === val.targetTeam
        );
        const targetDead = !target || !target.alive || target.hp <= 0;

        if (val.noFriendlyDamage) {
          let currentFriendlyHp = 0;
          for (const p of gameState.pieces) {
            if (p.team === "white" && p.alive) currentFriendlyHp += p.hp;
          }
          const friendlyDamaged = currentFriendlyHp < initialFriendlyHp;
          if (targetDead && friendlyDamaged) return result(false, "Target destroyed, but you damaged your own pieces!");
          if (targetDead && !friendlyDamaged) return result(true, "Perfect precision! Target destroyed with no friendly fire!");
          if (friendlyDamaged) return result(false, "Failed — your own pieces took damage.");
        } else {
          if (targetDead) return result(true, "Target destroyed!");
        }
        if (overTurnLimit) return result(false, `Failed — target survived after ${val.maxTurns} turn(s).`);
        return null;
      }

      default:
        return null;
    }
  }

  function result(passed, message) {
    const stars = passed ? calcStars() : 0;
    return { passed, message, stars, challengeId: active?.id };
  }

  function calcStars() {
    if (!active) return 1;
    const maxT = active.goalValue.maxTurns || 99;
    if (turnsTaken <= 1) return 3;
    if (turnsTaken <= Math.ceil(maxT / 2)) return 2;
    return 1;
  }

  function reset() {
    active = null;
    turnsTaken = 0;
    initialFriendlyHp = 0;
  }

  function setChangeHandler(handler) {
    onChange = handler;
  }

  return Object.freeze({
    list,
    get,
    getActive,
    start,
    buildPieces,
    recordTurn,
    storeInitialFriendlyHp,
    check,
    reset,
    setChangeHandler,
  });
})();
