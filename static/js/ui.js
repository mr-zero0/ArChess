"use strict";

window.UI = {
  init(game) {
    this.game = game;
    this.nodes = {
      whiteHp: document.getElementById("whiteHp"),
      blackHp: document.getElementById("blackHp"),
      whiteKingText: document.getElementById("whiteKingText"),
      blackKingText: document.getElementById("blackKingText"),
      turnText: document.getElementById("turnText"),
      statusText: document.getElementById("statusText"),
      selectedGlyph: document.getElementById("selectedGlyph"),
      selectedName: document.getElementById("selectedName"),
      selectedStats: document.getElementById("selectedStats"),
      powerBar: document.getElementById("powerBar"),
      powerValue: document.getElementById("powerValue"),
      turnBadge: document.getElementById("turnBadge"),
      turnDot: document.getElementById("turnDot"),
      hintText: document.getElementById("hintText"),
      moveCount: document.getElementById("moveCount"),
      battleLog: document.getElementById("battleLog"),
      armory: document.getElementById("armory"),
      whiteCard: document.getElementById("whiteCard"),
      blackCard: document.getElementById("blackCard"),
    };
    this.cache = new Map();
    this.buildArmory();
    if (window.ThemeManager) ThemeManager.init();
    if (window.BoardSizeManager) BoardSizeManager.init();
    if (window.AudioManager) AudioManager.init();
    if (window.PrefsManager) PrefsManager.init();
  },

  king(team) {
    return this.game.pieces.find((piece) => piece.type === "king" && piece.team === team) || null;
  },

  text(key, value) {
    if (this.cache.get(`text:${key}`) === value) return;
    this.cache.set(`text:${key}`, value);
    this.nodes[key].textContent = value;
  },

  width(key, value) {
    const normalized = `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
    if (this.cache.get(`width:${key}`) === normalized) return;
    this.cache.set(`width:${key}`, normalized);
    this.nodes[key].style.width = normalized;
  },

  update(force = false) {
    if (force) this.cache.clear();
    const whiteKing = this.king("white");
    const blackKing = this.king("black");

    if (whiteKing) {
      this.width("whiteHp", (whiteKing.hp / whiteKing.maxHp) * 100);
      this.text("whiteKingText", `${whiteKing.hp} / ${whiteKing.maxHp} HP`);
    }
    if (blackKing) {
      this.width("blackHp", (blackKing.hp / blackKing.maxHp) * 100);
      this.text("blackKingText", `${blackKing.hp} / ${blackKing.maxHp} HP`);
    }

    const turn = this.game.currentPlayer.toUpperCase();
    this.text("turnText", turn);
    this.text("turnBadge", this.game.gameOver ? "BATTLE COMPLETE" : `${turn} TO MOVE`);
    this.nodes.turnDot.style.background = this.game.currentPlayer === "white" ? "#c7f8ff" : "#ff7485";

    this.nodes.whiteCard.classList.toggle("active", this.game.currentPlayer === "white" && !this.game.gameOver);
    this.nodes.blackCard.classList.toggle("active", this.game.currentPlayer === "black" && !this.game.gameOver);
    if (whiteKing) this.nodes.whiteCard.classList.toggle("danger", whiteKing.hp / whiteKing.maxHp < 0.35 && !this.game.gameOver);
    if (blackKing) this.nodes.blackCard.classList.toggle("danger", blackKing.hp / blackKing.maxHp < 0.35 && !this.game.gameOver);

    const phaseText = this.game.gameOver ? "GAME OVER" : this.game.phase === "physics" ? "PHYSICS ACTIVE" : this.game.dragging ? "AIMING" : "AIM & LAUNCH";
    this.text("statusText", phaseText);

    const selected = this.game.selectedPiece;
    if (selected && selected.alive) {
      this.text("selectedGlyph", PIECES[selected.type].glyph[selected.team]);
      this.text("selectedName", PIECES[selected.type].name);
      this.text("selectedStats", `${selected.hp}/${selected.maxHp} HP · Power ${selected.power}`);
      this.nodes.selectedGlyph.dataset.team = selected.team;
    } else {
      this.text("selectedGlyph", "—");
      this.text("selectedName", "None");
      this.text("selectedStats", `Select a living ${this.game.currentPlayer} piece`);
      this.nodes.selectedGlyph.dataset.team = "none";
    }

    const power = this.game.dragging ? this.game.powerRatio * 100 : 0;
    this.width("powerBar", power);
    this.text("powerValue", `${Math.round(power)}%`);

    let hint = `Select a ${this.game.currentPlayer} piece, drag backward, release`;
    if (this.game.gameOver) hint = "Battle complete. Start a new game to reset everything.";
    else if (this.game.phase === "physics") hint = "Physics resolving. Turn changes when every piece settles.";
    else if (this.game.dragging) hint = "Release to launch opposite the drag direction";
    else if (this.game.feedback && this.game.feedback.life > 0) hint = this.game.feedback.text;
    this.text("hintText", hint);
    this.text("moveCount", String(this.game.history.length));
  },

  clearLog() {
    this.nodes.battleLog.replaceChildren();
  },

  log(message) {
    const row = document.createElement("div");
    row.className = "log-row";
    const num = document.createElement("span");
    num.className = "log-num";
    num.textContent = String(this.game.history.length);
    const text = document.createElement("span");
    text.className = "log-text";
    text.textContent = message;
    row.append(num, text);
    this.nodes.battleLog.prepend(row);
    while (this.nodes.battleLog.children.length > 50) this.nodes.battleLog.lastElementChild.remove();
  },

  buildArmory() {
    this.nodes.armory.replaceChildren();
    for (const type of PIECE_ORDER) {
      const piece = PIECES[type];
      const item = document.createElement("div");
      item.className = "armory-item";
      const glyph = document.createElement("div");
      glyph.className = "armory-glyph";
      glyph.textContent = piece.glyph.white;
      const details = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = piece.name;
      const stats = document.createElement("span");
      stats.textContent = `${piece.hp} HP · ${piece.power} POW`;
      details.append(name, stats);
      item.append(glyph, details);
      this.nodes.armory.appendChild(item);
    }
  },

  modal(id, show) {
    document.getElementById(id).classList.toggle("hidden", !show);
  },
};
