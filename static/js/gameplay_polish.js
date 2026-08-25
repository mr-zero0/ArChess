(() => {
  "use strict";
  if (window.__ArChessGameplayPolish) return;
  window.__ArChessGameplayPolish = true;

  const wait = (fn, tries = 300) => {
    let n = 0;
    const tick = () => {
      if (fn() || ++n >= tries) return;
      setTimeout(tick, 50);
    };
    tick();
  };

  function installPerformancePatch() {
    if (!window.ThreeDScene?.prototype || window.ThreeDScene.prototype.__archessMotionPatch) return Boolean(window.ThreeDScene?.prototype);
    const Scene = window.ThreeDScene;
    const originalUpdate = Scene.prototype.updatePieces;
    Scene.prototype.__archessMotionPatch = true;
    Scene.prototype.updatePieces = function polishedUpdatePieces(game, dt) {
      const previous = new Map();
      for (const [id, entry] of this.entries || []) {
        if (entry.group) previous.set(id, entry.group.position.clone());
      }
      originalUpdate.call(this, game, dt);

      // Smooth the visual position independently from the authoritative physics state.
      const alpha = 1 - Math.exp(-Math.min(34, 24 + (game.phase === "physics" ? 8 : 0)) * Math.min(dt, 0.033));
      for (const [id, entry] of this.entries || []) {
        const from = previous.get(id);
        if (!from || !entry.group || entry.dying) continue;
        const target = entry.group.position.clone();
        entry.group.position.lerpVectors(from, target, alpha);

        const piece = entry.piece;
        const speed = Math.hypot(piece.vx || 0, piece.vy || 0);
        const ratio = Math.min(1, speed / (window.GAME_CONFIG?.maxLaunchSpeed || 12));
        if (piece.moving && ratio > 0.02) {
          // A subtle ballistic lift makes fast pieces read as physical projectiles instead of sprites snapping across tiles.
          const lift = 0.035 + ratio * 0.20;
          entry.group.position.y += Math.sin(game.simTime * (11 + ratio * 5) + entry.seed) * lift * 0.16 + lift * 0.32;
        }
      }
    };

    // One high-quality 3D renderer is enough. The legacy 2D renderer was still repainting the whole board every frame.
    wait(() => {
      if (!window.gameState || !document.body.classList.contains("archess-3d-ready")) return false;
      if (window.GameRenderer?.prototype && !window.GameRenderer.prototype.__archess3DNoop) {
        const proto = window.GameRenderer.prototype;
        proto.__archess3DNoop = true;
        const oldDraw = proto.draw;
        proto.draw = function optimizedDraw(state) {
          if (!window.__ArChessThreeD) return oldDraw.call(this, state);
          // The 2D surface is retained as the transparent input surface; trajectory guidance is drawn separately.
        };
      }
      return true;
    });
    return true;
  }

  function installTrajectoryOverlay() {
    const wrap = document.getElementById("boardWrap");
    const canvas = document.getElementById("gameCanvas");
    if (!wrap || !canvas || document.getElementById("trajectoryCanvas")) return Boolean(wrap && canvas);

    const overlay = document.createElement("canvas");
    overlay.id = "trajectoryCanvas";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      zIndex: "4", pointerEvents: "none", display: "block"
    });
    wrap.appendChild(overlay);
    const ctx = overlay.getContext("2d");

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      overlay.width = Math.max(1, Math.round(rect.width * dpr));
      overlay.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const worldToScreen = (x, y) => {
      const rect = wrap.getBoundingClientRect();
      return { x: (x / 8) * rect.width, y: (y / 8) * rect.height };
    };

    function predict(piece, dx, dy) {
      const cfg = window.GAME_CONFIG || {};
      const distance = Math.hypot(dx, dy);
      if (distance < (cfg.minDragDistance || 0.12)) return [];
      const clamped = Math.min(distance, cfg.maxDragDistance || 2.8);
      const scale = clamped / distance;
      const response = piece.launchMul ?? 1;
      let vx = dx * scale * (cfg.launchStrength || 7.5) * response;
      let vy = dy * scale * (cfg.launchStrength || 7.5) * response;
      const max = cfg.maxLaunchSpeed || 12;
      const speed = Math.hypot(vx, vy);
      if (speed > max) { const s = max / speed; vx *= s; vy *= s; }

      const points = [];
      let x = piece.x, y = piece.y;
      const radius = piece.radius || 0.25;
      const friction = piece.friction ?? cfg.friction ?? 0.93;
      const dt = 1 / 24;
      for (let i = 0; i < 72; i++) {
        x += vx * dt; y += vy * dt;
        if (x < radius) { x = radius; vx *= -(piece.restitution ?? cfg.bounceFactor ?? 0.82); }
        if (x > 8 - radius) { x = 8 - radius; vx *= -(piece.restitution ?? cfg.bounceFactor ?? 0.82); }
        if (y < radius) { y = radius; vy *= -(piece.restitution ?? cfg.bounceFactor ?? 0.82); }
        if (y > 8 - radius) { y = 8 - radius; vy *= -(piece.restitution ?? cfg.bounceFactor ?? 0.82); }
        points.push({ x, y, speed: Math.hypot(vx, vy) });
        const decay = Math.pow(friction, dt * 60);
        vx *= decay; vy *= decay;
        if (Math.hypot(vx, vy) < (cfg.minVelocity || 0.08)) break;
      }
      return points;
    }

    function draw() {
      resize();
      const rect = wrap.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const state = window.gameState;
      const piece = state?.selectedPiece;
      if (!state || !piece || !state.dragging || !state.pointer || state.phase !== "aim") return;

      const dx = piece.x - state.pointer.x;
      const dy = piece.y - state.pointer.y;
      const origin = worldToScreen(piece.x, piece.y);
      const drag = worldToScreen(state.pointer.x, state.pointer.y);
      const path = predict(piece, dx, dy);
      const ratio = Math.min(1, Math.hypot(dx, dy) / (window.GAME_CONFIG?.maxDragDistance || 2.8));

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Pull vector: the user sees exactly what will launch, including direction and power.
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgba(115,235,255,${0.45 + ratio * 0.35})`;
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(drag.x, drag.y); ctx.stroke();
      ctx.setLineDash([]);

      if (path.length) {
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = `rgba(142,116,255,${0.35 + ratio * 0.55})`;
        ctx.beginPath();
        path.forEach((p, i) => { const s = worldToScreen(p.x, p.y); if (!i) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
        ctx.stroke();

        for (let i = 0; i < path.length; i += 8) {
          const s = worldToScreen(path[i].x, path[i].y);
          const r = Math.max(1.5, 3.5 - i / path.length * 2.2);
          ctx.fillStyle = `rgba(180,245,255,${0.55 - i / path.length * 0.38})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        }
        const end = worldToScreen(path[path.length - 1].x, path[path.length - 1].y);
        ctx.strokeStyle = "rgba(255,218,125,.78)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(end.x, end.y, 9 + ratio * 6, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(8,12,18,.84)";
      ctx.strokeStyle = "rgba(132,225,255,.35)";
      ctx.lineWidth = 1;
      const label = `${Math.round(ratio * 100)}% POWER`;
      const lx = Math.max(8, Math.min(rect.width - 92, drag.x + 14));
      const ly = Math.max(24, Math.min(rect.height - 10, drag.y - 12));
      ctx.beginPath(); ctx.roundRect(lx, ly - 18, 84, 24, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(224,250,255,.95)"; ctx.font = "800 10px Inter,system-ui,sans-serif"; ctx.fillText(label, lx + 10, ly - 2);
      ctx.restore();
    }

    const onMove = () => draw();
    canvas.addEventListener("pointerdown", onMove, { passive: true });
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerup", () => setTimeout(draw, 0), { passive: true });
    window.addEventListener("resize", draw, { passive: true });
    window.addEventListener("scroll", draw, { passive: true });
    function loop() { draw(); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  }

  function installAuthGate() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessAuthGate")) return false;
    const gate = document.createElement("div");
    gate.id = "archessAuthGate";
    gate.innerHTML = `<div class="auth-gate-card"><div class="auth-gate-mark">♜</div><div class="auth-gate-kicker">ACCOUNT REQUIRED</div><h2>Sign in to enter the arena</h2><p>Your matches, rating and battle history are tied to your ArChess account.</p><a href="/login" class="auth-gate-btn">SIGN IN / CREATE ACCOUNT</a></div>`;
    wrap.appendChild(gate);

    const refresh = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        const me = await response.json();
        const authenticated = Boolean(me?.authenticated);
        gate.classList.toggle("hidden", authenticated);
        document.body.classList.toggle("archess-authenticated", authenticated);
        const start = document.getElementById("newGameBtn");
        if (start && !start.__authGuard) {
          start.__authGuard = true;
          start.addEventListener("click", (event) => {
            if (!authenticated) { event.preventDefault(); event.stopImmediatePropagation(); location.href = "/login"; }
          }, true);
        }
      } catch (_) {
        gate.classList.remove("hidden");
      }
    };
    refresh();
    window.addEventListener("focus", refresh, { passive: true });
    return true;
  }

  function patchSceneQuality() {
    const scene = window.__ArChessThreeD;
    if (!scene || scene.__archessQualityPatched) return Boolean(scene);
    scene.__archessQualityPatched = true;
    scene.renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
    scene.renderer.shadowMap.enabled = true;
    scene.renderer.shadowMap.type = scene.renderer.shadowMap.type;
    if (scene.keyLight?.shadow?.mapSize) scene.keyLight.shadow.mapSize.set(1024, 1024);
    return true;
  }

  function boot() {
    installTrajectoryOverlay();
    installPerformancePatch();
    installAuthGate();
    wait(patchSceneQuality, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
