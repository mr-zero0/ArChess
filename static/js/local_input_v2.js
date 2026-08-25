(() => {
  "use strict";
  if (window.__ArChessLocalInputV2) return;
  window.__ArChessLocalInputV2 = true;

  const BOARD_SIZE = 8;
  const waitForGame = (fn) => {
    const started = performance.now();
    const tick = () => {
      if (window.gameState && window.Physics && window.GAME_CONFIG) return fn();
      if (performance.now() - started < 12000) setTimeout(tick, 40);
    };
    tick();
  };

  const worldPoint = (canvas, event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(BOARD_SIZE, ((event.clientX - rect.left) / rect.width) * BOARD_SIZE)),
      y: Math.max(0, Math.min(BOARD_SIZE, ((event.clientY - rect.top) / rect.height) * BOARD_SIZE)),
    };
  };

  function installTrajectoryOverlay(wrap) {
    document.getElementById("trajectoryCanvas")?.remove();
    const overlay = document.createElement("canvas");
    overlay.id = "trajectoryCanvas";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:none;mix-blend-mode:screen";
    wrap.appendChild(overlay);
    const ctx = overlay.getContext("2d");

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      overlay.width = Math.max(1, Math.round(rect.width * dpr));
      overlay.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const screen = (x, y) => {
      const rect = wrap.getBoundingClientRect();
      return { x: (x / BOARD_SIZE) * rect.width, y: (y / BOARD_SIZE) * rect.height };
    };

    const draw = () => {
      resize();
      const rect = wrap.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const game = window.gameState;
      const piece = game?.selectedPiece;
      const pointer = game?.pointer;
      if (!game?.dragging || !piece || !pointer || game.phase !== "aim") return;

      const origin = screen(piece.x, piece.y);
      const cursor = screen(pointer.x, pointer.y);
      const dx = piece.x - pointer.x;
      const dy = piece.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const maxDrag = GAME_CONFIG.maxDragDistance || 2.6;
      const ratio = Math.min(1, distance / maxDrag);
      const eased = ratio * ratio * (3 - 2 * ratio);
      const launchSpeed = eased * (GAME_CONFIG.maxLaunchSpeed || 13.5) * (piece.launchMul ?? 1);
      const magnitude = Math.max(0.0001, distance);
      let vx = (dx / magnitude) * launchSpeed;
      let vy = (dy / magnitude) * launchSpeed;
      let x = piece.x;
      let y = piece.y;
      const points = [];
      const dt = 1 / 36;
      const friction = piece.friction ?? GAME_CONFIG.friction ?? 0.985;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([9, 7]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(105,231,255,${0.45 + ratio * 0.45})`;
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(cursor.x, cursor.y); ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < 110; i += 1) {
        x += vx * dt; y += vy * dt;
        const radius = piece.radius || 0.28;
        if (x < radius || x > BOARD_SIZE - radius) {
          x = Math.max(radius, Math.min(BOARD_SIZE - radius, x));
          vx *= -(piece.restitution ?? GAME_CONFIG.bounceFactor ?? 0.82);
        }
        if (y < radius || y > BOARD_SIZE - radius) {
          y = Math.max(radius, Math.min(BOARD_SIZE - radius, y));
          vy *= -(piece.restitution ?? GAME_CONFIG.bounceFactor ?? 0.82);
        }
        points.push({ x, y });
        vx *= Math.pow(friction, dt * 60);
        vy *= Math.pow(friction, dt * 60);
        if (Math.hypot(vx, vy) < (GAME_CONFIG.minVelocity || 0.18)) break;
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(150,124,255,${0.35 + ratio * 0.50})`;
      ctx.beginPath();
      points.forEach((point, index) => {
        const p = screen(point.x, point.y);
        index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();

      for (let i = 0; i < points.length; i += 7) {
        const p = screen(points[i].x, points[i].y);
        ctx.fillStyle = `rgba(190,245,255,${0.60 - (i / Math.max(1, points.length)) * 0.40})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, 3.4 - i * 0.012), 0, Math.PI * 2); ctx.fill();
      }

      if (points.length) {
        const end = screen(points.at(-1).x, points.at(-1).y);
        ctx.strokeStyle = "rgba(255,214,117,.82)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(end.x, end.y, 8 + ratio * 7, 0, Math.PI * 2); ctx.stroke();
      }

      const label = `${Math.round(ratio * 100)}% POWER`;
      const lx = Math.max(8, Math.min(rect.width - 100, cursor.x + 14));
      const ly = Math.max(24, Math.min(rect.height - 8, cursor.y - 10));
      ctx.fillStyle = "rgba(6,10,16,.90)";
      ctx.strokeStyle = "rgba(120,231,255,.36)";
      ctx.beginPath(); ctx.roundRect(lx, ly - 19, 92, 26, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ecfbff"; ctx.font = "800 10px Inter,system-ui,sans-serif"; ctx.fillText(label, lx + 10, ly - 2);
      ctx.restore();
    };

    window.addEventListener("resize", draw, { passive: true });
    window.__ArChessTrajectoryDraw = draw;
    const loop = () => { draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  function install() {
    const oldCanvas = document.getElementById("gameCanvas");
    const wrap = document.getElementById("boardWrap");
    if (!oldCanvas || !wrap || oldCanvas.dataset.inputV2 === "1") return;

    // Replacing the node removes the legacy InputController listeners from the active surface.
    const canvas = oldCanvas.cloneNode(false);
    canvas.id = "gameCanvas";
    canvas.dataset.inputV2 = "1";
    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none";
    canvas.style.opacity = "0";
    canvas.setAttribute("aria-label", "ArChess physics battle board");
    oldCanvas.replaceWith(canvas);

    const game = window.gameState;
    let pointerId = null;
    let selected = null;

    const findPiece = (point) => {
      let hit = null; let best = Infinity;
      for (const piece of game.pieces || []) {
        if (!piece.alive || piece.team !== game.currentPlayer) continue;
        const distance = Math.hypot(piece.x - point.x, piece.y - point.y);
        const radius = Math.max(piece.radius * 1.65, 0.40);
        if (distance <= radius && distance < best) { hit = piece; best = distance; }
      }
      return hit;
    };

    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || game.gameOver || game.phase !== "aim") return;
      const point = worldPoint(canvas, event);
      const piece = findPiece(point);
      if (!piece) return;
      event.preventDefault();
      pointerId = event.pointerId;
      selected = piece;
      game.selectedPiece = piece;
      game.dragging = true;
      game.pointer = point;
      game.powerRatio = 0;
      canvas.setPointerCapture?.(pointerId);
      window.AudioManager?.unlock?.();
      window.AudioManager?.select?.();
      window.UI?.update?.();
    });

    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId || !selected) return;
      event.preventDefault();
      const point = worldPoint(canvas, event);
      game.pointer = point;
      game.powerRatio = Math.min(1, Math.hypot(selected.x - point.x, selected.y - point.y) / (GAME_CONFIG.maxDragDistance || 2.6));
      window.AudioManager?.pull?.(game.powerRatio);
      window.UI?.update?.();
    });

    canvas.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointerId || !selected) return;
      event.preventDefault();
      const point = worldPoint(canvas, event);
      const piece = selected;
      const dx = piece.x - point.x;
      const dy = piece.y - point.y;
      const distance = Math.hypot(dx, dy);
      const maxDrag = GAME_CONFIG.maxDragDistance || 2.6;

      pointerId = null; selected = null;
      game.dragging = false; game.selectedPiece = null; game.pointer = null;
      canvas.releasePointerCapture?.(event.pointerId);

      if (distance < (GAME_CONFIG.minDragDistance || 0.12)) {
        game.powerRatio = 0;
        game.feedback = { text: "Pull farther to launch.", life: 1.0 };
        window.UI?.update?.(true);
        return;
      }

      const ratio = Math.min(1, distance / maxDrag);
      const eased = ratio * ratio * (3 - 2 * ratio);
      const scale = (eased * maxDrag) / Math.max(distance, 0.0001);
      const launchDx = dx * scale;
      const launchDy = dy * scale;
      if (!window.Physics.launch(piece, launchDx, launchDy)) {
        game.feedback = { text: "Launch rejected.", life: 1.2 };
        game.powerRatio = 0;
        window.UI?.update?.(true);
        return;
      }

      game.phase = "physics";
      game.settledFor = 0;
      game.powerRatio = 0;
      game.combo = 0;
      game.comboTimer = 0;
      game.maxCombo = 0;
      if (game.stats?.[piece.team]) game.stats[piece.team].launches += 1;
      const message = `${piece.team[0].toUpperCase() + piece.team.slice(1)} ${window.PIECES?.[piece.type]?.name || piece.type} launched.`;
      game.history.push(message);
      window.UI?.log?.(message);
      window.AudioManager?.launch?.(ratio);
      window.UI?.update?.(true);
    });

    canvas.addEventListener("pointercancel", () => {
      pointerId = null; selected = null;
      game.dragging = false; game.selectedPiece = null; game.pointer = null; game.powerRatio = 0;
      window.UI?.update?.();
    });

    installTrajectoryOverlay(wrap);
    document.body.classList.add("archess-input-v2");
  }

  waitForGame(install);
})();
