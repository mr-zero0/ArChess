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

  function worldPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(BOARD_SIZE, ((event.clientX - rect.left) / rect.width) * BOARD_SIZE)),
      y: Math.max(0, Math.min(BOARD_SIZE, ((event.clientY - rect.top) / rect.height) * BOARD_SIZE)),
    };
  }

  function installTrajectoryCanvas(wrap) {
    const old = document.getElementById("trajectoryCanvas");
    old?.remove();
    const canvas = document.createElement("canvas");
    canvas.id = "trajectoryCanvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:none;mix-blend-mode:screen";
    wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const toScreen = (x, y) => {
      const r = wrap.getBoundingClientRect();
      return { x: (x / BOARD_SIZE) * r.width, y: (y / BOARD_SIZE) * r.height };
    };

    const clear = () => {
      resize();
      const r = wrap.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
    };

    const draw = () => {
      clear();
      const game = window.gameState;
      const piece = game?.selectedPiece;
      const drag = game?.pointer;
      if (!piece || !drag || !game.dragging || game.phase !== "aim") return;

      const r = wrap.getBoundingClientRect();
      const origin = toScreen(piece.x, piece.y);
      const cursor = toScreen(drag.x, drag.y);
      const dx = piece.x - drag.x;
      const dy = piece.y - drag.y;
      const distance = Math.hypot(dx, dy);
      const maxDrag = GAME_CONFIG.maxDragDistance || 2.6;
      const ratio = Math.min(1, distance / maxDrag);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Pull vector.
      ctx.setLineDash([9, 7]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(105,231,255,${0.45 + ratio * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(cursor.x, cursor.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Prediction follows the same launch mapping used by the input controller.
      let vx = dx;
      let vy = dy;
      const n = Math.max(0.0001, distance);
      const power = ratio * ratio * (3 - 2 * ratio);
      const speed = power * (GAME_CONFIG.maxLaunchSpeed || 13.5) * (piece.launchMul ?? 1);
      vx = (vx / n) * speed;
      vy = (vy / n) * speed;

      let x = piece.x;
      let y = piece.y;
      let life = 1;
      const points = [];
      const dt = 1 / 30;
      const friction = piece.friction ?? GAME_CONFIG.friction ?? 0.985;
      for (let i = 0; i < 120; i += 1) {
        x += vx * dt;
        y += vy * dt;
        const radius = piece.radius || 0.28;
        if (x < radius || x > BOARD_SIZE - radius) {
          x = Math.max(radius, Math.min(BOARD_SIZE - radius, x));
          vx *= -(piece.restitution ?? GAME_CONFIG.bounceFactor ?? 0.82);
        }
        if (y < radius || y > BOARD_SIZE - radius) {
          y = Math.max(radius, Math.min(BOARD_SIZE - radius, y));
          vy *= -(piece.restitution ?? GAME_CONFIG.bounceFactor ?? 0.82);
        }
        points.push({ x, y, opacity: life });
        vx *= Math.pow(friction, dt * 60);
        vy *= Math.pow(friction, dt * 60);
        life *= 0.985;
        if (Math.hypot(vx, vy) < (GAME_CONFIG.minVelocity || 0.18)) break;
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(150,124,255,${0.35 + ratio * 0.5})`;
      ctx.beginPath();
      points.forEach((p, i) => {
        const s = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();

      for (let i = 0; i < points.length; i += 7) {
        const p = points[i];
        const s = toScreen(p.x, p.y);
        ctx.fillStyle = `rgba(190,245,255,${0.60 * p.opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(1.6, 3.4 - i * 0.012), 0, Math.PI * 2);
        ctx.fill();
      }

      if (points.length) {
        const end = toScreen(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = "rgba(255,214,117,.82)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 8 + ratio * 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      const label = `${Math.round(ratio * 100)}% POWER`;
      const lx = Math.max(8, Math.min(r.width - 98, cursor.x + 14));
      const ly = Math.max(24, Math.min(r.height - 8, cursor.y - 10));
      ctx.fillStyle = "rgba(6,10,16,.90)";
      ctx.strokeStyle = "rgba(120,231,255,.36)";
      ctx.beginPath();
      ctx.roundRect(lx, ly - 19, 90, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ecfbff";
      ctx.font = "800 10px Inter,system-ui,sans-serif";
      ctx.fillText(label, lx + 10, ly - 2);
      ctx.restore();
    };

    window.addEventListener("resize", draw, { passive: true });
    window.__ArChessTrajectoryDraw = draw;
    requestAnimationFrame(function loop() {
      draw();
      requestAnimationFrame(loop);
    });
  }

  function replaceInputCanvas() {
    const oldCanvas = document.getElementById("gameCanvas");
    const wrap = document.getElementById("boardWrap");
    if (!oldCanvas || !wrap || oldCanvas.dataset.inputV2 === "1") return;

    // Replacing the DOM node removes every legacy pointer listener that main.js attached.
    // The game loop continues to own gameState/Physics; this file owns only pointer intent.
    const inputCanvas = oldCanvas.cloneNode(false);
    inputCanvas.id = "gameCanvas";
    inputCanvas.dataset.inputV2 = "1";
    inputCanvas.setAttribute("aria-label", "ArChess physics battle board");
    inputCanvas.style.pointerEvents = "auto";
    inputCanvas.style.touchAction = "none";
    inputCanvas.style.opacity = "0";
    oldCanvas.replaceWith(inputCanvas);

    const game = window.gameState;
    let activePointerId = null;
    let selected = null;

    const findPiece = (point) => {
      let best = null;
      let bestDistance = Infinity;
      for (const piece of game.pieces || []) {
        if (!piece.alive || piece.team !== game.currentPlayer) continue;
        const d = Math.hypot(piece.x - point.x, piece.y - point.y);
        const hitRadius = Math.max(piece.radius * 1.65, 0.40);
        if (d <= hitRadius && d < bestDistance) {
          best = piece;
          bestDistance = d;
        }
      }
      return best;
    };

    inputCanvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || game.gameOver || game.phase !== "aim") return;
      const point = worldPoint(inputCanvas, event);
      const piece = findPiece(point);
      if (!piece) return;
      event.preventDefault();
      activePointerId = event.pointerId;
      selected = piece;
      game.selectedPiece = piece;
      game.dragging = true;
      game.pointer = point;
      game.powerRatio = 0;
      inputCanvas.setPointerCapture?.(event.pointerId);
      window.AudioManager?.unlock?.();
      window.AudioManager?.select?.();
      window.UI?.update?.();
    });

    inputCanvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId || !selected) return;
      event.preventDefault();
      const point = worldPoint(inputCanvas, event);
      game.pointer = point;
      game.powerRatio = Math.min(1, Math.hypot(selected.x - point.x, selected.y - point.y) / (GAME_CONFIG.maxDragDistance || 2.6));
      window.AudioManager?.pull?.(game.powerRatio);
      window.UI?.update?.();
    });

    inputCanvas.addEventListener("pointerup", (event) => {
      if (event.pointerId !== activePointerId || !selected) return;
      event.preventDefault();
      const point = worldPoint(inputCanvas, event);
      const piece = selected;
      const dx = piece.x - point.x;
      const dy = piece.y - point.y;
      const distance = Math.hypot(dx, dy);
      const maxDrag = GAME_CONFIG.maxDragDistance || 2.6;

      activePointerId = null;
      selected = null;
      game.dragging = false;
      game.selectedPiece = null;
      game.pointer = null;
      inputCanvas.releasePointerCapture?.(event.pointerId);

      if (distance < (GAME_CONFIG.minDragDistance || 0.12)) {
        game.powerRatio = 0;
        game.feedback = { text: "Pull farther to launch.", life: 1.0 };
        window.UI?.update?.(true);
        return;
      }

      // Smooth slingshot response. Input intent remains 2D; Physics remains authoritative.
      const ratio = Math.min(1, distance / maxDrag);
      const eased = ratio * ratio * (3 - 2 * ratio);
      const scale = eased * maxDrag / Math.max(distance, 0.0001);
      const launchDx = dx * scale;
      const launchDy = dy * scale;
      const launched = window.Physics.launch(piece, launchDx, launchDy);
      if (!launched) {
        game.feedback = { text: "Launch rejected.", life: 1.2 };
        game.powerRatio = 0;
        window.UI?.update?.(true);
        return;
      }

      game.powerRatio = 0;
      game.phase = "physics";
      game.settledFor = 0;
      game.combo = 0;
      game.comboTimer = 0;
      game.maxCombo = 0;
      game.__lastLaunchAt = performance.now();
      game.__lastLaunchPiece = piece.id;
      game.__lastLaunchTeam = piece.team;
      if (game.stats?.[piece.team]) game.stats[piece.team].launches += 1;
      game.history?.push(`${piece.team[0].toUpperCase() + piece.team.slice(1)} ${window.PIECES?.[piece.type]?.name || piece.type} launched.`);
      window.UI?.log?.(game.history.at(-1));
      window.AudioManager?.launch?.(ratio);
      window.UI?.update?.(true);
    });

    inputCanvas.addEventListener("pointercancel", () => {
      activePointerId = null;
      selected = null;
      game.dragging = false;
      game.selectedPiece = null;
      game.pointer = null;
      game.powerRatio = 0;
      window.UI?.update?.();
    });

    installTrajectoryCanvas(wrap);
    document.body.classList.add("archess-input-v2");
  }

  waitForGame(replaceInputCanvas);
})();
