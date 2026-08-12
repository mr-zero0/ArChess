"use strict";

window.GAME_CONFIG = Object.freeze({
  boardSize: 8,
  maxLaunchSpeed: 13.5,
  launchStrength: 5.2,
  maxDragDistance: 2.6,
  minDragDistance: 0.10,
  friction: 0.985,
  bounceFactor: 0.82,
  collisionMultiplier: 1.0,
  damageMultiplier: 0.55,
  impactReferenceSpeed: 8.0,
  maxCollisionDamage: 58,
  minDamageImpact: 0.65,
  minVelocity: 0.18,
  physicsSubsteps: 3,
  collisionRestitution: 0.84,
  collisionCooldown: 0.16,
  settleDelay: 0.34,
  maxTrailPoints: 18,
  trailLifetime: 0.34,
});

window.PIECES = Object.freeze({
  pawn: Object.freeze({ hp: 30, power: 10, mass: 0.80, radius: 0.28, glyph: { white: "♙", black: "♟" }, name: "Pawn" }),
  knight: Object.freeze({ hp: 50, power: 30, mass: 1.00, radius: 0.30, glyph: { white: "♘", black: "♞" }, name: "Knight" }),
  bishop: Object.freeze({ hp: 40, power: 25, mass: 0.90, radius: 0.29, glyph: { white: "♗", black: "♝" }, name: "Bishop" }),
  rook: Object.freeze({ hp: 80, power: 40, mass: 1.30, radius: 0.31, glyph: { white: "♖", black: "♜" }, name: "Rook" }),
  queen: Object.freeze({ hp: 90, power: 70, mass: 1.15, radius: 0.32, glyph: { white: "♕", black: "♛" }, name: "Queen" }),
  king: Object.freeze({ hp: 120, power: 100, mass: 1.45, radius: 0.34, glyph: { white: "♔", black: "♚" }, name: "King" }),
});

window.BACK_RANK = Object.freeze(["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]);
window.PIECE_ORDER = Object.freeze(["pawn", "knight", "bishop", "rook", "queen", "king"]);

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

window.PieceFactory = Object.freeze({
  make(type, team, col, row) {
    const stats = PIECES[type];
    return {
      id: makeId(),
      type,
      team,
      x: col + 0.5,
      y: row + 0.5,
      vx: 0,
      vy: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      power: stats.power,
      radius: stats.radius,
      alive: true,
      mass: stats.mass,
      moving: false,
      trail: [],
      trailClock: 0,
    };
  },

  setup() {
    const pieces = [];
    for (let col = 0; col < 8; col += 1) {
      pieces.push(this.make(BACK_RANK[col], "black", col, 0));
      pieces.push(this.make("pawn", "black", col, 1));
      pieces.push(this.make("pawn", "white", col, 6));
      pieces.push(this.make(BACK_RANK[col], "white", col, 7));
    }
    return pieces;
  },
});
