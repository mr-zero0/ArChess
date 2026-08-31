"use strict";

window.GameRenderer = class GameRenderer {
  constructor(board) {
    if (!board?.ctx) throw new Error("2D board context is unavailable");
    this.board = board;
    this.ctx = board.ctx;
    this.imageCache = new Map();
    window.ArChessLog?.("RENDERER_READY", { mode: "2d", libraryBoard: document.body.dataset.boardRenderer === "library" });
  }

  theme() {
    const theme = document.documentElement.dataset.theme;
    return ["wood", "dark", "light"].includes(theme) ? theme : "wood";
  }

  palette() {
    if (this.theme() === "light") return { bg: "#e9eef2", light: "#eee7d8", dark: "#9aab8f", grid: "rgba(24,37,30,.14)", text: "#26332c", accent: "#0d6efd", white: "#f8fbff", black: "#1d2428", danger: "#dc3545", power: "#ffb000" };
    if (this.theme() === "dark") return { bg: "#070b10", light: "#203544", dark: "#0f202b", grid: "rgba(147,208,231,.10)", text: "#d7e6ee", accent: "#5eeaff", white: "#e9f6fb", black: "#222c33", danger: "#ff6879", power: "#ffc857" };
    return { bg: "#24140d", light: "#d5ba8f", dark: "#6c4932", grid: "rgba(45,24,15,.16)", text: "#f4e6d0", accent: "#e8a064", white: "#a85a3e", black: "#191a1a", danger: "#ed6b70", power: "#e6ae55" };
  }

  motion() {
    try { return window.PrefsManager?.getMotion?.() || { shake: true, reducedMotion: false }; }
    catch (error) { window.ArChessObservability?.warn?.("MOTION_PREFS_ERROR", { error: String(error) }); return { shake: true, reducedMotion: false }; }
  }

  draw(game) {
    try {
      const { ctx } = this;
      const size = this.board.pixelSize;
      const cell = this.board.cellSize;
      ctx.setTransform(this.board.dpr, 0, 0, this.board.dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const shake = this.motion().shake && !this.motion().reducedMotion && game.screenShake.time > 0 ? Math.min(5, game.screenShake.magnitude * cell * 0.01) : 0;
      ctx.save();
      if (shake) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      if (document.body.dataset.boardRenderer !== "library") this.drawFallbackBoard(cell, size);
      this.drawAim(game, cell);
      this.drawPieces(game, cell);
      this.drawEffects(game, cell);
      ctx.restore();
      this.drawDebugOverlay(game, cell, size);
    } catch (error) {
      window.ArChessObservability?.error?.("RENDER_FRAME_ERROR", error, { phase: game?.phase });
    }
  }

  drawFallbackBoard(cell, size) {
    const p = this.palette();
    this.ctx.fillStyle = p.bg; this.ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const light = (row + col) % 2 === 0;
      this.ctx.fillStyle = light ? p.light : p.dark;
      this.ctx.fillRect(col * cell, row * cell, cell + .5, cell + .5);
    }
    this.ctx.strokeStyle = p.grid; this.ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) { const q = i * cell + .5; this.ctx.beginPath(); this.ctx.moveTo(q, 0); this.ctx.lineTo(q, size); this.ctx.stroke(); this.ctx.beginPath(); this.ctx.moveTo(0, q); this.ctx.lineTo(size, q); this.ctx.stroke(); }
    this.ctx.fillStyle = p.text; this.ctx.font = `${Math.max(9, cell * .10)}px system-ui,sans-serif`;
    for (let col = 0; col < 8; col += 1) this.ctx.fillText(String.fromCharCode(97 + col), col * cell + 5, size - 5);
    this.ctx.textAlign = "right";
    for (let row = 0; row < 8; row += 1) this.ctx.fillText(String(8 - row), size - 5, row * cell + cell - 5);
    this.ctx.textAlign = "left";
  }

  drawAim(game, cell) {
    const piece = game.dragging ? game.selectedPiece : null;
    if (!piece || !game.pointer) return;
    const dx = piece.x - game.pointer.x, dy = piece.y - game.pointer.y, len = Math.hypot(dx, dy);
    if (len < .02) return;
    const distance = Math.min(len, GAME_CONFIG.maxDragDistance), ux = dx / len, uy = dy / len;
    const endX = piece.x + ux * distance * 1.55, endY = piece.y + uy * distance * 1.55;
    const ctx = this.ctx, p = this.palette();
    ctx.save(); ctx.lineCap = "round";
    ctx.setLineDash([cell * .09, cell * .07]); ctx.strokeStyle = "rgba(255,185,70,.88)"; ctx.lineWidth = Math.max(2, cell * .022);
    ctx.beginPath(); ctx.moveTo(piece.x * cell, piece.y * cell); ctx.lineTo((piece.x - ux * distance) * cell, (piece.y - uy * distance) * cell); ctx.stroke();
    ctx.setLineDash([cell * .07, cell * .08]); ctx.strokeStyle = p.accent; ctx.beginPath(); ctx.moveTo(piece.x * cell, piece.y * cell); ctx.lineTo(endX * cell, endY * cell); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 1; i <= 8; i += 1) { const t = i / 9, x = piece.x + (endX - piece.x) * t, y = piece.y + (endY - piece.y) * t; ctx.globalAlpha = .2 + t * .6; ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(x * cell, y * cell, Math.max(2, cell * .025), 0, Math.PI * 2); ctx.fill(); }
    const angle = Math.atan2(uy, ux), arrow = Math.max(9, cell * .14), ax = endX * cell, ay = endY * cell;
    ctx.globalAlpha = 1; ctx.fillStyle = p.accent; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - arrow * Math.cos(angle - .55), ay - arrow * Math.sin(angle - .55)); ctx.lineTo(ax - arrow * Math.cos(angle + .55), ay - arrow * Math.sin(angle + .55)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  getPieceImage(piece) {
    const key = `${piece.type}:${piece.team}`;
    if (this.imageCache.has(key)) return this.imageCache.get(key);
    const svg = window.ArChessPieceSvg?.[piece.type];
    if (!svg) return null;
    const image = new Image(); image.decoding = "async";
    const source = piece.team === "white" ? svg : svg.replaceAll("#fff", "#24292e").replaceAll("#000", "#f4f7f8");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    this.imageCache.set(key, image); return image;
  }

  drawPieces(game, cell) {
    for (const piece of game.pieces) {
      if (!piece.alive) continue;
      this.drawPiece(game, piece, cell);
    }
  }

  drawPiece(game, piece, cell) {
    const ctx = this.ctx, x = piece.x * cell, y = piece.y * cell, r = piece.radius * cell;
    const moving = Math.hypot(piece.vx, piece.vy) > GAME_CONFIG.minVelocity;
    const selected = game.selectedPiece?.id === piece.id && game.phase === "aim";
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = .28; ctx.fillStyle = "#000"; ctx.filter = `blur(${Math.max(1, r * .08)}px)`; ctx.beginPath(); ctx.ellipse(0, r * .95, r * 1.0, r * .22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (moving) { ctx.save(); ctx.globalAlpha = .25; ctx.strokeStyle = piece.team === "white" ? "#5eeaff" : "#ff7182"; ctx.lineWidth = Math.max(2, r * .08); ctx.beginPath(); ctx.moveTo(x - piece.vx * cell * .11, y - piece.vy * cell * .11); ctx.lineTo(x, y); ctx.stroke(); ctx.restore(); }
    const image = this.getPieceImage(piece);
    const size = r * 2.55;
    ctx.save(); ctx.translate(x, y); if (selected) { ctx.shadowColor = this.palette().accent; ctx.shadowBlur = Math.max(12, r * .8); }
    if (image?.complete && image.naturalWidth) ctx.drawImage(image, -size / 2, -size * .57, size, size);
    else { ctx.fillStyle = piece.team === "white" ? this.palette().white : this.palette().black; ctx.beginPath(); ctx.arc(0, 0, r * .65, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    this.drawHp(piece, cell);
    if (selected) { ctx.save(); ctx.strokeStyle = this.palette().accent; ctx.lineWidth = Math.max(2, cell * .025); ctx.beginPath(); ctx.arc(x, y + r * .84, r * .6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (piece.type === "king" && piece.hp / piece.maxHp < .35) { ctx.save(); ctx.globalAlpha = .4 + Math.sin(game.simTime * 7) * .15; ctx.strokeStyle = this.palette().danger; ctx.lineWidth = Math.max(2, r * .06); ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }

  drawHp(piece, cell) {
    const ratio = Math.max(0, Math.min(1, piece.hp / piece.maxHp)), width = Math.max(20, piece.radius * cell * 1.8), height = Math.max(3, piece.radius * cell * .11), x = piece.x * cell - width / 2, y = piece.y * cell + piece.radius * cell * 1.27;
    this.ctx.save(); this.ctx.fillStyle = "rgba(0,0,0,.48)"; this.ctx.beginPath(); this.ctx.roundRect(x, y, width, height, height / 2); this.ctx.fill(); this.ctx.fillStyle = ratio > .4 ? (piece.team === "white" ? "#59d8ba" : "#ff6e80") : this.palette().power; this.ctx.beginPath(); this.ctx.roundRect(x, y, width * ratio, height, height / 2); this.ctx.fill(); this.ctx.restore();
  }

  drawEffects(game, cell) {
    const ctx = this.ctx;
    for (const e of game.effects) {
      const alpha = Math.max(0, Math.min(1, e.life / e.maxLife)); if (!alpha) continue;
      ctx.save(); ctx.globalAlpha = alpha;
      if (e.kind === "particle") { ctx.fillStyle = e.color; ctx.translate(e.x * cell, e.y * cell); ctx.rotate(e.rotation || 0); const s = e.size * cell; ctx.fillRect(-s / 2, -s / 2, s, s); }
      else if (e.kind === "ring") { ctx.strokeStyle = e.color; ctx.lineWidth = Math.max(1, cell * .018); ctx.beginPath(); ctx.arc(e.x * cell, e.y * cell, (e.radius + (e.maxLife - e.life) * e.growth) * cell, 0, Math.PI * 2); ctx.stroke(); }
      else if (e.kind === "flash") { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x * cell, e.y * cell, (e.radius + (e.maxLife - e.life) * e.growth) * cell, 0, Math.PI * 2); ctx.fill(); }
      else if (e.kind === "damage") { ctx.fillStyle = e.color; ctx.font = `900 ${Math.max(12, cell * .19)}px system-ui,sans-serif`; ctx.textAlign = "center"; ctx.fillText(`-${e.amount}`, e.x * cell, e.y * cell); }
      else if (e.kind === "death") { ctx.fillStyle = e.color; ctx.font = `900 ${Math.max(18, cell * e.radius)}px system-ui,sans-serif`; ctx.textAlign = "center"; ctx.fillText(e.glyph, e.x * cell, e.y * cell); }
      ctx.restore();
    }
  }

  drawDebugOverlay(game, cell) {
    if (!game.debugOverlay) return;
    const ctx = this.ctx; ctx.save(); ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(8, 8, 230, 88); ctx.fillStyle = "#fff"; ctx.font = "12px ui-monospace,monospace";
    [`phase=${game.phase}`, `turn=${game.currentPlayer}`, `alive=${game.pieces.filter(p=>p.alive).length}`, `collisions=${game.collisionCount}`, `board=${document.body.dataset.boardRenderer || "canvas"}`].forEach((line, index) => ctx.fillText(line, 16, 24 + index * 15));
    ctx.restore();
  }
};
