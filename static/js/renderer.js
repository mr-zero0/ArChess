"use strict";

function formatBalanceStats(stats) {
  if (!stats) return [];
  const lines = [];
  for (const team of ["white", "black"]) {
    const s = stats[team];
    if (!s) continue;
    const label = team === "white" ? "W" : "B";
    lines.push(`stats ${label}: dmg ${s.damage} · frnd ${s.friendlyDamage} · king ${s.kingDamage} · kills ${s.destroyed} · cmb ${s.maxCombo}`);
  }
  return lines;
}

window.GameRenderer = class GameRenderer {
  constructor(board) {
    this.board = board;
    this.ctx = board.ctx;
  }

  theme() {
    const value = document.documentElement.dataset.theme;
    return value === "light" || value === "dark" || value === "wood" ? value : "wood";
  }

  motionPrefs() {
    if (window.PrefsManager) return PrefsManager.getMotion();
    return { shake: true, reducedMotion: false };
  }

  palette() {
    const theme = this.theme();
    if (theme === "wood") {
      return {
        boardBg: "#2a160f",
        squareLight: "#d7bd96",
        squareDark: "#70513b",
        squareLightGlow: "rgba(255,245,220,.20)",
        squareDarkGlow: "rgba(255,217,174,.045)",
        grid: "rgba(48,26,17,.26)",
        coord: "rgba(51,29,20,.58)",
        edgeA: "rgba(236,185,119,.66)",
        edgeB: "rgba(58,24,14,.84)",
        trailWhite: "#d8895f",
        trailBlack: "#7d8787",
        hpTrack: "rgba(42,22,15,.76)",
        damageShadow: "rgba(35,15,8,.86)",
      };
    }
    if (theme === "light") {
      return {
        boardBg: "#e8eff4",
        squareLight: "#e4edf1",
        squareDark: "#9fb7c5",
        squareLightGlow: "rgba(255,255,255,.34)",
        squareDarkGlow: "rgba(255,255,255,.08)",
        grid: "rgba(26,72,95,.14)",
        coord: "rgba(27,61,78,.48)",
        edgeA: "rgba(24,145,174,.62)",
        edgeB: "rgba(214,73,91,.48)",
        trailWhite: "#159fbd",
        trailBlack: "#df5265",
        hpTrack: "rgba(245,249,252,.90)",
        damageShadow: "rgba(255,255,255,.88)",
      };
    }
    return {
      boardBg: "#050a10",
      squareLight: "#13283a",
      squareDark: "#0a1927",
      squareLightGlow: "rgba(83,207,238,.045)",
      squareDarkGlow: "rgba(255,255,255,.012)",
      grid: "rgba(76,174,207,.12)",
      coord: "rgba(145,197,220,.38)",
      edgeA: "rgba(77,230,255,.38)",
      edgeB: "rgba(255,101,119,.30)",
      trailWhite: "#68edff",
      trailBlack: "#ff7585",
      hpTrack: "rgba(2,6,9,.82)",
      damageShadow: "rgba(0,0,0,.8)",
    };
  }

  draw(game) {
    const ctx = this.ctx;
    const size = this.board.pixelSize;
    const cell = this.board.cellSize;
    ctx.setTransform(this.board.dpr, 0, 0, this.board.dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const shake = this.getShake(game, cell);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.drawBoard(cell, size);
    this.drawTrails(game, cell);
    this.drawAim(game, cell);
    this.drawPieces(game, cell);
    this.drawEffects(game, cell);
    ctx.restore();

    this.drawDebugOverlay(game, cell, size);
  }

  getShake(game, cell) {
    const motion = this.motionPrefs();
    if (!motion.shake || motion.reducedMotion) return { x: 0, y: 0 };
    if (game.screenShake.time <= 0 || game.screenShake.magnitude <= 0) return { x: 0, y: 0 };
    const strength = Math.min(7, game.screenShake.magnitude * cell * 0.012);
    return {
      x: (Math.random() - 0.5) * strength,
      y: (Math.random() - 0.5) * strength,
    };
  }

  drawBoard(cell, size) {
    const ctx = this.ctx;
    const p = this.palette();
    ctx.fillStyle = p.boardBg;
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const light = (row + col) % 2 === 0;
        ctx.fillStyle = light ? p.squareLight : p.squareDark;
        ctx.fillRect(col * cell, row * cell, cell, cell);

        const glow = ctx.createLinearGradient(col * cell, row * cell, (col + 1) * cell, (row + 1) * cell);
        glow.addColorStop(0, light ? p.squareLightGlow : p.squareDarkGlow);
        const endGlow = this.theme() === "light"
          ? "rgba(27,55,70,.035)"
          : this.theme() === "wood" ? "rgba(42,17,9,.10)" : "rgba(0,0,0,.09)";
        glow.addColorStop(1, endGlow);
        ctx.fillStyle = glow;
        ctx.fillRect(col * cell, row * cell, cell, cell);

        if (this.theme() === "wood") this.drawWoodSquareTexture(col, row, cell, light);
      }
    }

    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) {
      const point = Math.round(i * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(point, 0);
      ctx.lineTo(point, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, point);
      ctx.lineTo(size, point);
      ctx.stroke();
    }

    const edge = ctx.createLinearGradient(0, 0, size, size);
    edge.addColorStop(0, p.edgeA);
    edge.addColorStop(0.5, this.theme() === "light"
      ? "rgba(30,100,125,.13)"
      : this.theme() === "wood" ? "rgba(125,77,42,.22)" : "rgba(77,230,255,.05)");
    edge.addColorStop(1, p.edgeB);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    this.drawCoordinates(cell);
  }

  drawWoodSquareTexture(col, row, cell, light) {
    const ctx = this.ctx;
    const x = col * cell;
    const y = row * cell;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell, cell);
    ctx.clip();

    // A few deterministic grain curves are enough to suggest real timber
    // without turning every frame into a texture-generation benchmark.
    ctx.lineWidth = Math.max(0.55, cell * 0.009);
    ctx.strokeStyle = light ? "rgba(86,48,25,.10)" : "rgba(255,220,175,.07)";
    for (let i = 0; i < 3; i += 1) {
      const base = y + cell * (0.22 + i * 0.27);
      const phase = (col * 1.7 + row * 2.3 + i) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - cell * 0.08, base + Math.sin(phase) * cell * 0.04);
      ctx.bezierCurveTo(
        x + cell * 0.28, base + Math.sin(phase + 1.2) * cell * 0.07,
        x + cell * 0.67, base + Math.sin(phase + 2.1) * cell * 0.05,
        x + cell * 1.08, base + Math.sin(phase + 3.0) * cell * 0.04
      );
      ctx.stroke();
    }

    // Subtle beveled square edges echo a physical board photographed under soft light.
    ctx.lineWidth = Math.max(0.5, cell * 0.007);
    ctx.strokeStyle = light ? "rgba(255,245,220,.18)" : "rgba(255,225,185,.065)";
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + cell - 0.5);
    ctx.lineTo(x + 0.5, y + 0.5);
    ctx.lineTo(x + cell - 0.5, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = light ? "rgba(65,35,19,.12)" : "rgba(30,14,8,.20)";
    ctx.beginPath();
    ctx.moveTo(x + cell - 0.5, y + 0.5);
    ctx.lineTo(x + cell - 0.5, y + cell - 0.5);
    ctx.lineTo(x + 0.5, y + cell - 0.5);
    ctx.stroke();
    ctx.restore();
  }

  drawCoordinates(cell) {
    const ctx = this.ctx;
    const p = this.palette();
    ctx.font = `700 ${Math.max(8, cell * 0.11)}px Inter, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = p.coord;
    for (let col = 0; col < 8; col += 1) {
      ctx.fillText(String.fromCharCode(97 + col), col * cell + 5, 4);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    for (let row = 0; row < 8; row += 1) {
      ctx.fillText(String(8 - row), 8 * cell - 5, (row + 1) * cell - 4);
    }
    ctx.textAlign = "left";
  }

  drawTrails(game, cell) {
    if (this.motionPrefs().reducedMotion) return;
    const ctx = this.ctx;
    const p = this.palette();
    for (const piece of game.pieces) {
      if (!piece.trail.length) continue;
      for (let i = 0; i < piece.trail.length; i += 1) {
        const point = piece.trail[i];
        const ratio = Math.max(0, point.life / GAME_CONFIG.trailLifetime);
        const radius = Math.max(1.5, piece.radius * cell * (0.12 + ratio * 0.21));
        ctx.globalAlpha = ratio * 0.24;
        ctx.fillStyle = piece.team === "white" ? p.trailWhite : p.trailBlack;
        ctx.beginPath();
        ctx.arc(point.x * cell, point.y * cell, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawAim(game, cell) {
    const piece = game.dragging ? game.selectedPiece : null;
    if (!piece || !game.pointer) return;

    const rawDx = piece.x - game.pointer.x;
    const rawDy = piece.y - game.pointer.y;
    const rawLength = Math.hypot(rawDx, rawDy);
    if (rawLength < 0.015) return;

    const clamped = Math.min(rawLength, GAME_CONFIG.maxDragDistance);
    const ux = rawDx / rawLength;
    const uy = rawDy / rawLength;
    const launchEndX = piece.x + ux * clamped * 1.55;
    const launchEndY = piece.y + uy * clamped * 1.55;
    const pullEndX = piece.x - ux * clamped;
    const pullEndY = piece.y - uy * clamped;
    const ctx = this.ctx;

    ctx.save();
    ctx.lineCap = "round";
    ctx.setLineDash([cell * 0.09, cell * 0.08]);
    ctx.lineWidth = Math.max(1.5, cell * 0.025);
    ctx.strokeStyle = "rgba(255, 171, 58, .78)";
    ctx.beginPath();
    ctx.moveTo(piece.x * cell, piece.y * cell);
    ctx.lineTo(pullEndX * cell, pullEndY * cell);
    ctx.stroke();

    ctx.setLineDash([cell * 0.06, cell * 0.07]);
    ctx.strokeStyle = this.theme() === "light" ? "rgba(0,126,158,.84)" : this.theme() === "wood" ? "rgba(126,58,31,.88)" : "rgba(77,230,255,.78)";
    ctx.beginPath();
    ctx.moveTo(piece.x * cell, piece.y * cell);
    ctx.lineTo(launchEndX * cell, launchEndY * cell);
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowX = launchEndX * cell;
    const arrowY = launchEndY * cell;
    const angle = Math.atan2(uy, ux);
    const arrowSize = Math.max(9, cell * 0.15);
    ctx.fillStyle = this.theme() === "light" ? "rgba(0,132,164,.96)" : this.theme() === "wood" ? "rgba(116,49,25,.96)" : "rgba(93,236,255,.92)";
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - arrowSize * Math.cos(angle - 0.5), arrowY - arrowSize * Math.sin(angle - 0.5));
    ctx.lineTo(arrowX - arrowSize * Math.cos(angle + 0.5), arrowY - arrowSize * Math.sin(angle + 0.5));
    ctx.closePath();
    ctx.fill();

    for (let i = 1; i <= 7; i += 1) {
      const t = i / 8;
      const tx = piece.x + (launchEndX - piece.x) * t;
      const ty = piece.y + (launchEndY - piece.y) * t;
      ctx.globalAlpha = 0.22 + t * 0.55;
      ctx.fillStyle = this.theme() === "light" ? "#057e9e" : this.theme() === "wood" ? "#7b3c24" : "#7bf0ff";
      ctx.beginPath();
      ctx.arc(tx * cell, ty * cell, Math.max(1.5, cell * 0.028), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawPieces(game, cell) {
    for (const piece of game.pieces) {
      if (!piece.alive) continue;
      this.drawPiece(game, piece, cell);
    }
  }

  material(ctx, r, team) {
    const gradient = ctx.createLinearGradient(-r * 1.08, 0, r * 1.08, 0);
    const theme = this.theme();

    if (theme === "wood") {
      if (team === "white") {
        // Rosewood / mahogany side, matching the warm physical set reference.
        gradient.addColorStop(0, "#2d100b");
        gradient.addColorStop(0.17, "#6a2b1d");
        gradient.addColorStop(0.40, "#b66d4d");
        gradient.addColorStop(0.58, "#8d432f");
        gradient.addColorStop(0.80, "#552116");
        gradient.addColorStop(1, "#210b08");
      } else {
        // Ebony / gunmetal side, almost black but still reflective enough to read in motion.
        gradient.addColorStop(0, "#050606");
        gradient.addColorStop(0.18, "#1c2021");
        gradient.addColorStop(0.42, "#575d5d");
        gradient.addColorStop(0.59, "#303435");
        gradient.addColorStop(0.82, "#141617");
        gradient.addColorStop(1, "#030404");
      }
      return gradient;
    }

    if (team === "white") {
      gradient.addColorStop(0, "#70808d");
      gradient.addColorStop(0.18, "#d9e2e6");
      gradient.addColorStop(0.42, "#ffffff");
      gradient.addColorStop(0.66, "#c4d0d6");
      gradient.addColorStop(1, "#657582");
    } else {
      gradient.addColorStop(0, "#070a0d");
      gradient.addColorStop(0.20, "#29323a");
      gradient.addColorStop(0.45, "#5c6873");
      gradient.addColorStop(0.68, "#242c33");
      gradient.addColorStop(1, "#050709");
    }
    return gradient;
  }

  topMaterial(ctx, r, team) {
    const gradient = ctx.createRadialGradient(-r * 0.22, -r * 0.24, r * 0.06, 0, 0, r * 0.78);
    if (this.theme() === "wood") {
      if (team === "white") {
        gradient.addColorStop(0, "#e2a07a");
        gradient.addColorStop(0.35, "#a5573d");
        gradient.addColorStop(0.72, "#63271b");
        gradient.addColorStop(1, "#2a0e09");
      } else {
        gradient.addColorStop(0, "#929999");
        gradient.addColorStop(0.34, "#515657");
        gradient.addColorStop(0.72, "#202324");
        gradient.addColorStop(1, "#060707");
      }
      return gradient;
    }

    if (team === "white") {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.42, "#e5ecef");
      gradient.addColorStop(1, "#71828e");
    } else {
      gradient.addColorStop(0, "#7a8791");
      gradient.addColorStop(0.42, "#353f47");
      gradient.addColorStop(1, "#090c10");
    }
    return gradient;
  }

  edgeColor(team) {
    const theme = this.theme();
    if (theme === "wood") return team === "white" ? "rgba(47,16,10,.92)" : "rgba(0,0,0,.94)";
    if (team === "white") return theme === "light" ? "rgba(58,82,96,.78)" : "rgba(190,247,255,.78)";
    return theme === "light" ? "rgba(13,19,25,.82)" : "rgba(255,123,139,.52)";
  }

  accentColor(team) {
    if (this.theme() === "wood") return team === "white" ? "#f0a36f" : "#d8ddd8";
    if (team === "white") return this.theme() === "light" ? "#0089aa" : "#70efff";
    return "#ff6577";
  }

  drawPiece(game, piece, cell) {
    const ctx = this.ctx;
    const x = piece.x * cell;
    const y = piece.y * cell;
    const r = piece.radius * cell;
    const selected = game.selectedPiece && game.selectedPiece.id === piece.id && game.phase === "aim";
    const speed = Math.hypot(piece.vx, piece.vy);
    const moving = speed > GAME_CONFIG.minVelocity * 1.05;
    const speedRatio = Math.min(1, speed / GAME_CONFIG.maxLaunchSpeed);
    const scale = selected ? 1.065 : 1;
    const accent = this.accentColor(piece.team);

    if (!Number.isFinite(piece.renderSeed)) {
      let seed = 0;
      for (let i = 0; i < piece.id.length; i += 1) seed = (seed * 31 + piece.id.charCodeAt(i)) % 997;
      piece.renderSeed = seed / 997 * Math.PI * 2;
    }

    const nx = speed > 0.001 ? piece.vx / speed : 0;
    const ny = speed > 0.001 ? piece.vy / speed : 0;
    const projectileRoll = moving
      ? Math.sin(game.simTime * (8.5 + speed * 0.42) + piece.renderSeed) * 0.24 * speedRatio + nx * 0.08 * speedRatio
      : 0;

    ctx.save();
    ctx.translate(x, y);

    // The piece itself is the projectile. Its contact shadow stretches and lags behind
    // while it is moving, which makes the launch read as a physical 3D object rather than a token sliding on glass.
    ctx.save();
    ctx.globalAlpha = this.theme() === "light" ? 0.18 : this.theme() === "wood" ? 0.34 : 0.42;
    ctx.fillStyle = this.theme() === "light" ? "#21313d" : this.theme() === "wood" ? "#160b07" : "#000";
    ctx.filter = `blur(${Math.max(1, r * (0.07 + speedRatio * 0.05))}px)`;
    ctx.translate(-nx * r * 0.22 * speedRatio, r * 0.93 - ny * r * 0.08 * speedRatio);
    ctx.rotate(-projectileRoll * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.92 + speedRatio * 0.30), r * (0.22 - speedRatio * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // A restrained streak behind fast pieces reinforces projectile motion without drawing a coin-like halo.
    if (moving && speedRatio > 0.12 && !this.motionPrefs().reducedMotion) {
      const streak = ctx.createLinearGradient(-nx * r * 2.2, -ny * r * 2.2, 0, 0);
      streak.addColorStop(0, "rgba(255,255,255,0)");
      streak.addColorStop(1, piece.team === "white"
        ? (this.theme() === "wood" ? "rgba(218,118,78,.30)" : "rgba(111,236,255,.28)")
        : (this.theme() === "wood" ? "rgba(178,188,188,.25)" : "rgba(255,101,119,.25)"));
      ctx.strokeStyle = streak;
      ctx.lineWidth = Math.max(1.5, r * 0.12 * speedRatio);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-nx * r * (1.2 + speedRatio), -ny * r * (1.2 + speedRatio));
      ctx.lineTo(-nx * r * 0.55, -ny * r * 0.55);
      ctx.stroke();
    }

    ctx.save();
    ctx.rotate(projectileRoll);
    ctx.scale(scale * (1 + speedRatio * 0.035), scale * (1 - speedRatio * 0.025));

    if (selected) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = Math.max(11, r * 0.8);
    }

    this.drawPieceSculpture(piece, r);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (selected) {
      // Selection stays under the physical base instead of wrapping it in a circular token outline.
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, r * 1.14);
      ctx.lineTo(r * 0.62, r * 1.14);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.02);
      ctx.lineTo(-r * 0.13, r * 1.18);
      ctx.lineTo(r * 0.13, r * 1.18);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    this.drawHp(piece, cell);

    // King danger feedback: a pulsing red ring when a living King is near death.
    if (piece.type === "king" && piece.alive) {
      const hpRatio = piece.hp / piece.maxHp;
      if (hpRatio < 0.35) {
        const pulse = 1 + Math.sin(game.simTime * 6) * 0.14;
        ctx.save();
        ctx.globalAlpha = 0.45 + Math.sin(game.simTime * 6) * 0.2;
        ctx.strokeStyle = "#ff3040";
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.beginPath();
        ctx.arc(x, y - r * 0.05, r * (1.18 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawPieceSculpture(piece, r) {
    const ctx = this.ctx;
    const fill = this.material(ctx, r, piece.team);
    const topFill = this.topMaterial(ctx, r, piece.team);
    const edge = this.edgeColor(piece.team);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, r * 0.055);
    ctx.strokeStyle = edge;

    this.drawBase(r, fill, edge, piece.team);

    switch (piece.type) {
      case "pawn": this.drawPawn(r, fill, topFill, edge); break;
      case "knight": this.drawKnight(r, fill, topFill, edge, piece.team); break;
      case "bishop": this.drawBishop(r, fill, topFill, edge); break;
      case "rook": this.drawRook(r, fill, topFill, edge); break;
      case "queen": this.drawQueen(r, fill, topFill, edge); break;
      case "king": this.drawKing(r, fill, topFill, edge); break;
      default: this.drawPawn(r, fill, topFill, edge);
    }

    // Narrow specular highlight sells the sculpted material without any enclosing circle.
    ctx.save();
    ctx.globalAlpha = this.theme() === "wood" ? (piece.team === "white" ? 0.22 : 0.14) : (piece.team === "white" ? 0.34 : 0.16);
    ctx.strokeStyle = this.theme() === "wood" && piece.team === "white" ? "#ffd0ac" : "#ffffff";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, r * 0.48);
    ctx.quadraticCurveTo(-r * 0.42, r * 0.03, -r * 0.24, -r * 0.34);
    ctx.stroke();
    ctx.restore();
  }

  drawBase(r, fill, edge, team) {
    const ctx = this.ctx;

    // Layered plinth gives every piece the turned-chess-set profile visible in the reference.
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.moveTo(-r * 0.73, r * 0.39);
    ctx.quadraticCurveTo(-r * 0.74, r * 0.55, -r * 0.92, r * 0.63);
    ctx.quadraticCurveTo(-r * 1.02, r * 0.70, -r * 0.97, r * 0.82);
    ctx.quadraticCurveTo(-r * 0.83, r * 1.01, 0, r * 1.04);
    ctx.quadraticCurveTo(r * 0.83, r * 1.01, r * 0.97, r * 0.82);
    ctx.quadraticCurveTo(r * 1.02, r * 0.70, r * 0.92, r * 0.63);
    ctx.quadraticCurveTo(r * 0.74, r * 0.55, r * 0.73, r * 0.39);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.topMaterial(ctx, r, team);
    ctx.globalAlpha = this.theme() === "wood" ? 0.30 : 0.14;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.64, r * 0.76, r * 0.115, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.78, r * 0.91, r * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = this.theme() === "wood" ? 0.16 : 0.10;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(0.8, r * 0.03);
    ctx.beginPath();
    ctx.ellipse(-r * 0.07, r * 0.69, r * 0.61, r * 0.07, 0, Math.PI * 1.05, Math.PI * 1.83);
    ctx.stroke();
    ctx.restore();
  }

  drawBody(r, fill, edge, neck = 0.22, shoulder = 0.53) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.moveTo(-r * shoulder, r * 0.48);
    ctx.bezierCurveTo(-r * 0.43, r * 0.20, -r * neck, -r * 0.05, -r * neck, -r * 0.40);
    ctx.lineTo(r * neck, -r * 0.40);
    ctx.bezierCurveTo(r * neck, -r * 0.05, r * 0.43, r * 0.20, r * shoulder, r * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawPawn(r, fill, topFill, edge) {
    const ctx = this.ctx;
    this.drawBody(r, fill, edge, 0.19, 0.48);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(-r * 0.32, -r * 0.48, r * 0.64, r * 0.15, r * 0.07);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.arc(0, -r * 0.78, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawBishop(r, fill, topFill, edge) {
    const ctx = this.ctx;
    this.drawBody(r, fill, edge, 0.17, 0.50);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.31, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.23);
    ctx.bezierCurveTo(-r * 0.31, -r * 1.00, -r * 0.34, -r * 0.69, 0, -r * 0.56);
    ctx.bezierCurveTo(r * 0.34, -r * 0.69, r * 0.31, -r * 1.00, 0, -r * 1.23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.theme() === "light" ? "rgba(38,52,61,.72)" : "rgba(8,12,15,.72)";
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(r * 0.13, -r * 1.08);
    ctx.lineTo(-r * 0.10, -r * 0.72);
    ctx.stroke();
  }

  drawRook(r, fill, topFill, edge) {
    const ctx = this.ctx;

    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 0.47);
    ctx.lineTo(-r * 0.40, -r * 0.52);
    ctx.lineTo(r * 0.40, -r * 0.52);
    ctx.lineTo(r * 0.52, r * 0.47);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, -r * 0.49);
    ctx.lineTo(-r * 0.58, -r * 0.99);
    ctx.lineTo(-r * 0.31, -r * 0.99);
    ctx.lineTo(-r * 0.31, -r * 0.79);
    ctx.lineTo(-r * 0.12, -r * 0.79);
    ctx.lineTo(-r * 0.12, -r * 1.00);
    ctx.lineTo(r * 0.12, -r * 1.00);
    ctx.lineTo(r * 0.12, -r * 0.79);
    ctx.lineTo(r * 0.31, -r * 0.79);
    ctx.lineTo(r * 0.31, -r * 0.99);
    ctx.lineTo(r * 0.58, -r * 0.99);
    ctx.lineTo(r * 0.58, -r * 0.49);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-r * 0.34, -r * 0.43, r * 0.16, r * 0.72);
    ctx.globalAlpha = 1;
  }

  drawKnight(r, fill, topFill, edge, team) {
    const ctx = this.ctx;

    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 0.48);
    ctx.bezierCurveTo(-r * 0.46, r * 0.20, -r * 0.22, -r * 0.05, -r * 0.22, -r * 0.32);
    ctx.bezierCurveTo(-r * 0.22, -r * 0.54, -r * 0.40, -r * 0.69, -r * 0.48, -r * 0.82);
    ctx.bezierCurveTo(-r * 0.20, -r * 0.83, -r * 0.06, -r * 1.19, r * 0.24, -r * 1.19);
    ctx.lineTo(r * 0.13, -r * 0.93);
    ctx.bezierCurveTo(r * 0.47, -r * 0.88, r * 0.67, -r * 0.69, r * 0.63, -r * 0.48);
    ctx.bezierCurveTo(r * 0.56, -r * 0.28, r * 0.30, -r * 0.26, r * 0.20, -r * 0.16);
    ctx.bezierCurveTo(r * 0.09, -r * 0.03, r * 0.27, r * 0.22, r * 0.48, r * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.29, -r * 0.87);
    ctx.lineTo(-r * 0.43, -r * 1.17);
    ctx.lineTo(-r * 0.12, -r * 1.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = team === "white" ? "#26343d" : "#d9edf4";
    ctx.beginPath();
    ctx.arc(r * 0.17, -r * 0.79, Math.max(1.2, r * 0.045), 0, Math.PI * 2);
    ctx.fill();
  }

  drawQueen(r, fill, topFill, edge) {
    const ctx = this.ctx;
    this.drawBody(r, fill, edge, 0.16, 0.55);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.38, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.52);
    ctx.lineTo(-r * 0.55, -r * 1.05);
    ctx.lineTo(-r * 0.23, -r * 0.80);
    ctx.lineTo(0, -r * 1.16);
    ctx.lineTo(r * 0.23, -r * 0.80);
    ctx.lineTo(r * 0.55, -r * 1.05);
    ctx.lineTo(r * 0.46, -r * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (const [cx, cy] of [[-0.55, -1.08], [0, -1.19], [0.55, -1.08]]) {
      ctx.beginPath();
      ctx.arc(r * cx, r * cy, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawKing(r, fill, topFill, edge) {
    const ctx = this.ctx;
    this.drawBody(r, fill, edge, 0.17, 0.57);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.38, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 0.52);
    ctx.lineTo(-r * 0.22, -r * 0.85);
    ctx.quadraticCurveTo(0, -r * 1.01, r * 0.22, -r * 0.85);
    ctx.lineTo(r * 0.34, -r * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topFill;
    ctx.beginPath();
    ctx.roundRect(-r * 0.085, -r * 1.36, r * 0.17, r * 0.52, r * 0.035);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-r * 0.27, -r * 1.20, r * 0.54, r * 0.17, r * 0.035);
    ctx.fill();
    ctx.stroke();
  }

  drawHp(piece, cell) {
    const ctx = this.ctx;
    const p = this.palette();
    const x = piece.x * cell;
    const y = piece.y * cell;
    const radius = piece.radius * cell;
    const width = Math.max(28, radius * 1.92);
    const height = Math.max(4, cell * 0.052);
    const ratio = Math.max(0, piece.hp / piece.maxHp);
    const left = x - width * 0.5;
    const top = y - radius * 1.58 - Math.max(7, cell * 0.07);

    ctx.fillStyle = p.hpTrack;
    ctx.fillRect(left, top, width, height);
    ctx.fillStyle = ratio > 0.5 ? "#55d991" : ratio > 0.25 ? "#f3b044" : "#f04f66";
    ctx.fillRect(left, top, width * ratio, height);
  }

  drawEffects(game, cell) {
    const ctx = this.ctx;
    const p = this.palette();
    for (const effect of game.effects) {
      const ratio = Math.max(0, effect.life / effect.maxLife);
      const x = effect.x * cell;
      const y = effect.y * cell;
      ctx.save();
      ctx.globalAlpha = ratio;

      if (effect.kind === "particle") {
        ctx.fillStyle = effect.color;
        const size = Math.max(1.5, effect.size * cell * (0.55 + ratio * 0.45));
        ctx.translate(x, y);
        ctx.rotate(effect.rotation || 0);
        ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
      } else if (effect.kind === "ring") {
        const progress = 1 - ratio;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(1, cell * 0.025 * ratio + 1);
        ctx.beginPath();
        ctx.arc(x, y, (effect.radius + progress * effect.growth) * cell, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.kind === "flash") {
        const progress = 1 - ratio;
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(x, y, (effect.radius + progress * effect.growth) * cell, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.kind === "damage") {
        ctx.font = `900 ${Math.max(11, cell * 0.18)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = effect.color;
        ctx.shadowColor = p.damageShadow;
        ctx.shadowBlur = 5;
        ctx.fillText(`-${effect.amount}`, x, y);
      } else if (effect.kind === "death") {
        const progress = 1 - ratio;
        ctx.translate(x, y);
        ctx.scale(1 + progress * 0.65, 1 + progress * 0.65);
        ctx.font = `${Math.max(18, effect.radius * cell * 1.55)}px "Times New Roman", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = effect.color;
        ctx.fillText(effect.glyph, 0, 0);
      }
      ctx.restore();
    }
  }

  drawDebugOverlay(game, cell, size) {
    if (!game.debugOverlay || !game.debugMetrics) return;
    const ctx = this.ctx;
    const padding = 10;
    const lineHeight = 16;
    const m = game.debugMetrics;
    const metrics = [
      `FPS: ${typeof m.fps === "number" ? m.fps.toFixed(1) : m.fps}`,
      `delta time: ${typeof m.deltaTime === "number" ? m.deltaTime.toFixed(2) : m.deltaTime} ms`,
      `substeps: ${m.substeps}`,
      `active moving bodies: ${m.activeBodies}`,
      `selected piece: ${m.selectedPiece}`,
      `piece velocity: ${m.pieceVelocity}`,
      `collision count: ${m.collisionCount}`,
      `contact pairs: ${m.contactPairs}`,
      `settle timer: ${m.settleTimer}`,
      `combo: ${m.combo || 0}`,
      ...formatBalanceStats(m.stats),
    ];

    ctx.save();
    ctx.font = `600 11px "Courier New", Courier, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let maxWidth = 0;
    for (const text of metrics) {
      const w = ctx.measureText(text).width;
      if (w > maxWidth) maxWidth = w;
    }

    const boxWidth = Math.max(220, maxWidth + padding * 2);
    const boxHeight = metrics.length * lineHeight + padding * 2 + 18;
    const x = 12;
    const y = 12;

    ctx.fillStyle = "rgba(7, 14, 22, 0.88)";
    ctx.strokeStyle = "rgba(77, 230, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, boxWidth, boxHeight, 6);
    } else {
      ctx.rect(x, y, boxWidth, boxHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4de6ff";
    ctx.font = `700 10px Inter, sans-serif`;
    ctx.fillText("⚡ PHYSICS DEBUG HUD (D)", x + padding, y + padding);

    ctx.font = `600 11px "Courier New", Courier, monospace`;
    let curY = y + padding + 18;
    for (const text of metrics) {
      ctx.fillStyle = text.includes("active moving bodies: 0") ? "#8ba3b8" : "#6effd7";
      ctx.fillText(text, x + padding, curY);
      curY += lineHeight;
    }
    ctx.restore();
  }
};
