(() => {
  "use strict";
  if (window.__ArChessTurnResolutionGuard) return;
  window.__ArChessTurnResolutionGuard = true;

  let physicsAge = 0;
  let quietAge = 0;
  let lastPlayer = null;

  const tick = (dt) => {
    const game = window.gameState;
    if (!game || game.gameOver || game.phase !== "physics") {
      physicsAge = 0;
      quietAge = 0;
      lastPlayer = game?.currentPlayer ?? null;
      return;
    }

    if (lastPlayer !== game.currentPlayer) {
      lastPlayer = game.currentPlayer;
      physicsAge = 0;
      quietAge = 0;
    }

    physicsAge += dt;
    const alive = (game.pieces || []).filter((piece) => piece.alive);
    const maxSpeed = alive.reduce((max, piece) => Math.max(max, Math.hypot(piece.vx || 0, piece.vy || 0)), 0);
    const kineticThreshold = Math.max(0.22, (window.GAME_CONFIG?.minVelocity || 0.18) * 1.25);
    const quiet = maxSpeed <= kineticThreshold;

    if (quiet) quietAge += dt;
    else quietAge = 0;

    const boundedFallback = physicsAge >= 4.0 && maxSpeed <= 6.0;
    if (quietAge < 0.22 && !boundedFallback) return;

    for (const piece of alive) {
      piece.vx = 0;
      piece.vy = 0;
      piece.moving = false;
    }
    game.activeCollisions?.clear?.();
    game.hitPairs?.clear?.();
    game.settledFor = 0;
    game.phase = "aim";
    game.currentPlayer = game.currentPlayer === "white" ? "black" : "white";
    game.turnTimeLeft = game.turnTime || 0;
    game.feedback = { text: `${String(game.currentPlayer).toUpperCase()} TO MOVE`, life: 1.0 };
    if (window.UI?.update) window.UI.update(true);

    physicsAge = 0;
    quietAge = 0;
    lastPlayer = game.currentPlayer;
  };

  let previous = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
    previous = now;
    tick(dt);
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
})();
