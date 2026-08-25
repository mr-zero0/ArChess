(() => {
  "use strict";
  if (window.__ArChessCoreGameplayFix) return;
  window.__ArChessCoreGameplayFix = true;

  const waitForGame = (fn, timeout = 12000) => {
    const started = performance.now();
    const tick = () => {
      if (window.gameState && window.Physics && window.GAME_CONFIG) return fn(window.gameState);
      if (performance.now() - started < timeout) setTimeout(tick, 40);
    };
    tick();
  };

  waitForGame((game) => {
    // The launch should feel like a slingshot: the piece moves opposite to the
    // drag direction, with a stable power curve instead of raw linear distance.
    const originalLaunch = window.Physics.launch.bind(window.Physics);
    window.Physics.launch = (piece, dx, dy) => {
      const distance = Math.hypot(dx, dy);
      const min = GAME_CONFIG.minDragDistance ?? 0.12;
      if (!piece || !piece.alive || piece.team !== game.currentPlayer || distance < min) return false;

      const maxDrag = GAME_CONFIG.maxDragDistance ?? 2.8;
      const normalized = Math.min(1, distance / maxDrag);
      // Ease-out power: small pulls are controllable; a full pull reaches the cap smoothly.
      const power = normalized * normalized * (3 - 2 * normalized);
      const scale = distance > 0.0001 ? power / distance : 0;
      const launchDx = dx * scale * maxDrag;
      const launchDy = dy * scale * maxDrag;

      const ok = originalLaunch(piece, launchDx, launchDy);
      if (!ok) return false;

      piece.moving = true;
      piece.trail = [];
      piece.trailClock = 0;
      game.__lastLaunchAt = performance.now();
      game.__lastLaunchTeam = piece.team;
      game.__lastLaunchPiece = piece.id;
      return true;
    };

    // Hard guarantee for local alternate turns. The normal settleTurn() does this
    // first; this watchdog only intervenes when a physics state gets stuck.
    let lastPhysicsAt = 0;
    let lastPhysicsSignature = "";
    let stuckSince = 0;

    setInterval(() => {
      if (!game || game.gameOver) return;
      const moving = game.pieces.filter((p) => p.alive && p.moving);
      const signature = moving.map((p) => `${p.id}:${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.moving}`).join("|");

      if (game.phase === "physics") {
        if (signature !== lastPhysicsSignature) {
          lastPhysicsSignature = signature;
          lastPhysicsAt = performance.now();
          stuckSince = 0;
        }

        if (moving.length === 0) {
          if (!stuckSince) stuckSince = performance.now();
          // Main settleTurn normally switches within ~0.3s. If it did not,
          // force the transition rather than leaving Black permanently locked out.
          if (performance.now() - stuckSince > 900) {
            const previous = game.currentPlayer;
            game.currentPlayer = previous === "white" ? "black" : "white";
            game.phase = "aim";
            game.settledFor = 0;
            game.turnTimeLeft = game.turnTime;
            game.selectedPiece = null;
            game.dragging = false;
            game.pointer = null;
            game.powerRatio = 0;
            game.activeCollisions.clear();
            game.feedback = `${game.currentPlayer.toUpperCase()} TO MOVE`;
            window.UI?.update?.(true);
            stuckSince = 0;
            lastPhysicsSignature = "";
          }
        } else {
          stuckSince = 0;
        }
      } else {
        stuckSince = 0;
        lastPhysicsSignature = "";
      }
    }, 100);
  });

  // Load the real asset pack after the renderer/game exists. This fixes the
  // previous integration where the asset module existed but was never loaded.
  const loadAssets = () => import("./oss_piece_assets.js?v=20260825-2").catch((error) => console.warn("ArChess piece asset loader unavailable", error));
  if ("requestIdleCallback" in window) requestIdleCallback(loadAssets, { timeout: 1800 });
  else setTimeout(loadAssets, 1200);
})();
