"use strict";

// GAME_CONFIG and PIECES are intentionally mutable so the developer tuning
// panel (STEP 6) can live-edit balance values without a page reload.
window.GAME_CONFIG = {
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
  comboWindow: 1.2,
  maxTrailPoints: 18,
  trailLifetime: 0.34,
};

// Per-piece combat role profile (STEP 6). Roles:
// - Pawn: light, cheap, bouncy, low damage — sacrifice piece.
// - Knight: fast launch, high bounce — trick / bank shots.
// - Bishop: lowest drag, longest slides — precision.
// - Rook: heavy, high momentum & damage, low bounce — battering ram.
// - Queen: high damage, costly to expose.
// - King: heaviest and most dangerous — defeat condition.
window.PIECES = {
  pawn: { hp: 30, power: 10, mass: 0.80, radius: 0.28, launchMul: 1.15, friction: 0.985, restitution: 0.84, damageMul: 0.75, collisionMul: 0.85, glyph: { white: "♙", black: "♟" }, name: "Pawn" },
  knight: { hp: 50, power: 30, mass: 1.00, radius: 0.30, launchMul: 1.10, friction: 0.980, restitution: 0.86, damageMul: 1.00, collisionMul: 1.00, glyph: { white: "♘", black: "♞" }, name: "Knight" },
  bishop: { hp: 40, power: 25, mass: 0.90, radius: 0.29, launchMul: 1.05, friction: 0.993, restitution: 0.88, damageMul: 0.90, collisionMul: 0.95, glyph: { white: "♗", black: "♝" }, name: "Bishop" },
  rook: { hp: 80, power: 40, mass: 1.30, radius: 0.31, launchMul: 0.90, friction: 0.975, restitution: 0.78, damageMul: 1.15, collisionMul: 1.20, glyph: { white: "♖", black: "♜" }, name: "Rook" },
  queen: { hp: 90, power: 70, mass: 1.15, radius: 0.32, launchMul: 0.95, friction: 0.980, restitution: 0.82, damageMul: 1.25, collisionMul: 1.10, glyph: { white: "♕", black: "♛" }, name: "Queen" },
  king: { hp: 120, power: 100, mass: 1.45, radius: 0.34, launchMul: 0.80, friction: 0.972, restitution: 0.80, damageMul: 1.40, collisionMul: 1.35, glyph: { white: "♔", black: "♚" }, name: "King" },
};

// DEEP_CONFIG keeps pristine defaults for the tuning panel "reset" action.
window.DEFAULT_CONFIG = JSON.parse(JSON.stringify({ config: window.GAME_CONFIG, pieces: window.PIECES }));

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
      launchMul: stats.launchMul ?? 1,
      friction: stats.friction ?? GAME_CONFIG.friction,
      restitution: stats.restitution ?? GAME_CONFIG.bounceFactor,
      damageMul: stats.damageMul ?? 1,
      collisionMul: stats.collisionMul ?? 1,
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
