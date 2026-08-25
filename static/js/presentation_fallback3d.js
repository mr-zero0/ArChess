(() => {
  "use strict";
  if (window.__ArChessCompat3D) return;
  window.__ArChessCompat3D = true;

  function injectMessage() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessWebGLNotice")) return;
    const notice = document.createElement("div");
    notice.id = "archessWebGLNotice";
    notice.innerHTML = `<div><strong>3D graphics unavailable</strong><span>Enable hardware acceleration / WebGL2 to use the real ArChess 3D renderer.</span></div>`;
    Object.assign(notice.style,{position:"absolute",inset:"0",zIndex:"25",display:"grid",placeItems:"center",padding:"24px",pointerEvents:"none",background:"radial-gradient(circle,rgba(5,9,15,.2),rgba(3,5,8,.7))",color:"#eef8ff",font:"700 12px/1.5 Inter,system-ui,sans-serif",textAlign:"center"});
    notice.firstElementChild.style.cssText="max-width:360px;padding:18px 20px;border:1px solid rgba(116,233,255,.18);border-radius:16px;background:rgba(7,11,17,.84);backdrop-filter:blur(12px);box-shadow:0 20px 60px rgba(0,0,0,.4)";
    notice.querySelector("span").style.cssText="display:block;margin-top:6px;color:#8e9aaa;font-size:11px;font-weight:600";
    wrap.appendChild(notice);
  }

  function installTurnGuard() {
    const started = performance.now();
    const tick = () => {
      if (!window.gameState) {
        if (performance.now() - started < 12000) setTimeout(tick, 40);
        return;
      }
      if (!window.__ArChessTurnGuard) {
        window.__ArChessTurnGuard = setInterval(() => {
          const game = window.gameState;
          if (!game || game.gameOver || game.phase !== "physics") return;
          if (window.ArChessMultiplayer?.active) return;
          const now = performance.now();
          const alive = game.pieces.filter(piece => piece.alive);
          const maxSpeed = alive.reduce((max, piece) => Math.max(max, Math.hypot(piece.vx || 0, piece.vy || 0)), 0);
          const hasActiveMotion = alive.some(piece => piece.moving && Math.hypot(piece.vx || 0, piece.vy || 0) >= 0.12);
          const quiet = !hasActiveMotion && maxSpeed < 0.18;
          if (quiet) {
            game.__quietSince ??= now;
            if (now - game.__quietSince >= 280) {
              for (const piece of alive) {
                piece.vx = 0;
                piece.vy = 0;
                piece.moving = false;
              }
              game.currentPlayer = game.currentPlayer === "white" ? "black" : "white";
              game.phase = "aim";
              game.settledFor = 0;
              game.turnTimeLeft = game.turnTime || 0;
              game.selectedPiece = null;
              game.dragging = false;
              game.pointer = null;
              game.powerRatio = 0;
              game.activeCollisions?.clear?.();
              game.hitPairs?.clear?.();
              game.__quietSince = 0;
              game.feedback = { text: `${game.currentPlayer.toUpperCase()} TO MOVE`, life: 0.9 };
              window.UI?.update?.(true);
            }
          } else {
            game.__quietSince = 0;
          }
        }, 80);
      }
    };
    tick();
  }

  function boot() {
    setTimeout(() => import("/static/js/local_input_controller.js?v=20260825-final").catch(error => console.error("ArChess input controller failed", error)), 250);
    setTimeout(() => import("/static/js/projectile_visuals_v2.js?v=20260825-final").catch(error => console.error("ArChess projectile visuals failed", error)), 450);
    setTimeout(() => import("/static/js/oss_piece_assets.js?v=20260825-final").catch(error => console.error("ArChess piece assets failed", error)), 900);
    setTimeout(() => import("/static/js/render_router.js?v=20260825-final").catch(error => console.error("ArChess render router failed", error)), 100);
    setTimeout(() => import("/static/js/professional_runtime.js?v=20260825-ui7").catch(error => console.error("ArChess professional runtime failed", error)), 140);
    setTimeout(() => import("/static/js/professional_shell.js?v=20260825-ui7").catch(error => console.error("ArChess professional shell failed", error)), 160);
    installTurnGuard();
    if (typeof window.WebGL2RenderingContext === "undefined") {
      window.__ArChess3DUnavailable = true;
      injectMessage();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true}); else boot();
})();
