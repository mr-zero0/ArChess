"use strict";

// STEP 6 developer balance tuning panel. Provides live edits of the global
// physics config and the per-piece combat-role profile. Values are session-
// only and reset from DEFAULT_CONFIG captured in pieces.js.
window.TuningPanel = (() => {
  const GLOBAL_FIELDS = [
    { key: "launchStrength", label: "Launch strength", step: 0.1 },
    { key: "maxLaunchSpeed", label: "Max velocity", step: 0.5 },
    { key: "maxDragDistance", label: "Max drag distance", step: 0.1 },
    { key: "friction", label: "Friction (global)", step: 0.001 },
    { key: "bounceFactor", label: "Wall restitution", step: 0.01 },
    { key: "collisionRestitution", label: "Collision restitution", step: 0.01 },
    { key: "damageMultiplier", label: "Damage multiplier", step: 0.05 },
    { key: "collisionMultiplier", label: "Collision multiplier", step: 0.05 },
    { key: "impactReferenceSpeed", label: "Impact reference speed", step: 0.5 },
    { key: "maxCollisionDamage", label: "Max collision damage", step: 1 },
    { key: "minDamageImpact", label: "Impact threshold", step: 0.05 },
    { key: "minVelocity", label: "Settle velocity", step: 0.01 },
    { key: "comboWindow", label: "Combo window (s)", step: 0.1 },
  ];

  const PIECE_FIELDS = [
    { key: "hp", label: "HP", step: 5 },
    { key: "power", label: "Power", step: 5 },
    { key: "mass", label: "Mass", step: 0.05 },
    { key: "radius", label: "Radius", step: 0.01 },
    { key: "launchMul", label: "Launch", step: 0.05 },
    { key: "friction", label: "Friction", step: 0.001 },
    { key: "restitution", label: "Restitution", step: 0.01 },
    { key: "damageMul", label: "Dmg mul", step: 0.05 },
    { key: "collisionMul", label: "Col mul", step: 0.05 },
  ];

  function buildGlobal() {
    const host = document.getElementById("globalTuning");
    if (!host) return;
    host.replaceChildren();
    const title = document.createElement("div");
    title.className = "tuning-heading";
    title.textContent = "GLOBAL PHYSICS";
    host.appendChild(title);
    for (const field of GLOBAL_FIELDS) {
      const row = document.createElement("label");
      row.className = "tuning-row";
      const span = document.createElement("span");
      span.textContent = field.label;
      const input = document.createElement("input");
      input.type = "number";
      input.step = String(field.step);
      input.value = String(GAME_CONFIG[field.key]);
      input.dataset.field = field.key;
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (Number.isFinite(value)) GAME_CONFIG[field.key] = value;
      });
      row.append(span, input);
      host.appendChild(row);
    }
  }

  function buildPieces() {
    const host = document.getElementById("pieceTuning");
    if (!host) return;
    host.replaceChildren();
    const title = document.createElement("div");
    title.className = "tuning-heading";
    title.textContent = "PIECE ROLES";
    host.appendChild(title);

    const table = document.createElement("div");
    table.className = "tuning-grid";

    const header = document.createElement("div");
    header.className = "tuning-grid-head";
    header.append("Piece");
    for (const field of PIECE_FIELDS) header.append(field.label);
    table.appendChild(header);

    for (const type of PIECE_ORDER) {
      const row = document.createElement("div");
      row.className = "tuning-grid-row";
      const name = document.createElement("span");
      name.className = "tuning-piece-name";
      name.textContent = `${PIECES[type].glyph.white} ${PIECES[type].name}`;
      row.appendChild(name);
      for (const field of PIECE_FIELDS) {
        const input = document.createElement("input");
        input.type = "number";
        input.step = String(field.step);
        input.value = String(PIECES[type][field.key]);
        input.dataset.type = type;
        input.dataset.field = field.key;
        input.addEventListener("input", () => applyPieceField(type, field.key, input));
        row.appendChild(input);
      }
      table.appendChild(row);
    }
    host.appendChild(table);
  }

  function applyPieceField(type, key, input) {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    PIECES[type][key] = value;
    const game = window.gameState;
    if (!game || !game.pieces) return;
    for (const piece of game.pieces) {
      if (piece.type !== type) continue;
      if (key === "hp") {
        const ratio = piece.maxHp > 0 ? piece.hp / piece.maxHp : 1;
        piece.maxHp = Math.max(1, value);
        piece.hp = Math.max(1, Math.round(piece.maxHp * ratio));
      } else if (key === "maxHp") {
        piece.maxHp = Math.max(1, value);
        piece.hp = Math.min(piece.hp, piece.maxHp);
      } else {
        piece[key] = value;
      }
    }
  }

  function resetDefaults() {
    const defaults = window.DEFAULT_CONFIG;
    if (!defaults) return;
    for (const [key, value] of Object.entries(defaults.config)) {
      if (key in GAME_CONFIG) GAME_CONFIG[key] = value;
    }
    for (const [type, stats] of Object.entries(defaults.pieces)) {
      if (!PIECES[type]) continue;
      for (const [key, value] of Object.entries(stats)) {
        if (key in PIECES[type]) PIECES[type][key] = value;
      }
    }
    buildGlobal();
    buildPieces();
    const game = window.gameState;
    if (game && game.pieces) {
      for (const piece of game.pieces) {
        const stats = PIECES[piece.type];
        if (!stats) continue;
        piece.maxHp = stats.hp;
        piece.hp = Math.min(piece.hp, stats.hp);
        piece.power = stats.power;
        piece.mass = stats.mass;
        piece.radius = stats.radius;
        piece.launchMul = stats.launchMul;
        piece.friction = stats.friction;
        piece.restitution = stats.restitution;
        piece.damageMul = stats.damageMul;
        piece.collisionMul = stats.collisionMul;
      }
    }
  }

  function init() {
    buildGlobal();
    buildPieces();

    document.getElementById("tuneBtn")?.addEventListener("click", () => {
      UI.modal("tuningModal", true);
    });
    document.getElementById("closeTuning")?.addEventListener("click", () => UI.modal("tuningModal", false));
    document.getElementById("closeTuning2")?.addEventListener("click", () => UI.modal("tuningModal", false));
    document.getElementById("tuningReset")?.addEventListener("click", resetDefaults);
    document.getElementById("tuningModal")?.addEventListener("click", (event) => {
      if (event.target.id === "tuningModal") UI.modal("tuningModal", false);
    });
  }

  return Object.freeze({ init });
})();
