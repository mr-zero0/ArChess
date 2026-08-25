(() => {
  "use strict";
  if (window.__ArChessLocalPhysicsSettle) return;
  window.__ArChessLocalPhysicsSettle = true;

  const boot = () => {
    if (!window.Physics || !window.gameState || !window.GAME_CONFIG) return false;
    const originalStep = window.Physics.step.bind(window.Physics);
    let quietTime = 0;

    window.Physics.step = (game, deltaTime) => {
      originalStep(game, deltaTime);
      if (!game || game.phase !== "physics" || game.gameOver) {
        quietTime = 0;
        return;
      }

      const kineticThreshold = Math.max(0.34, (GAME_CONFIG.minVelocity || 0.18) * 2.25);
      const alive = game.pieces.filter((piece) => piece.alive);
      const maxSpeed = alive.reduce((max, piece) => Math.max(max, Math.hypot(piece.vx || 0, piece.vy || 0)), 0);

      // Collision contact is not motion. A piece can remain geometrically touching
      // another piece with negligible velocity; that state must still settle.
      if (maxSpeed <= kineticThreshold) quietTime += deltaTime;
      else quietTime = 0;

      const settleWindow = Math.max(0.12, GAME_CONFIG.settleDelay || 0.18);
      if (quietTime < settleWindow) return;

      for (const piece of alive) {
        const speed = Math.hypot(piece.vx || 0, piece.vy || 0);
        if (speed <= kineticThreshold) {
          piece.vx = 0;
          piece.vy = 0;
          piece.moving = false;
        }
      }

      game.activeCollisions.clear();
      quietTime = 0;
    };
    return true;
  };

  const started = performance.now();
  const poll = () => {
    if (boot() || performance.now() - started > 12000) return;
    setTimeout(poll, 40);
  };
  poll();
})();
