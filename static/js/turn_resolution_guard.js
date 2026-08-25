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

    if (maxSpeed <= kineticThreshold) quietAge += dt;
    else quietAge = 0;

    if (quietAge < 0.22 && !(physicsAge >= 4.0 && maxSpeed <= 6.0)) return;

    for (const piece of alive) {
      piece.vx = 0;
      piece.vy = 0;
      piece.moving = false;
    }
    game.activeCollisions?.clear?.();
    game.hitPairs?.clear?.();
    game.settledFor = Math.max(game.settledFor || 0, window.GAME_CONFIG?.settleDelay || 0.18);
    // Leave phase/currentPlayer untouched. main.js settleTurn() performs the official
    // transition so replay/history/timers/challenges continue through one code path.

    physicsAge = 0;
    quietAge = 0;
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
