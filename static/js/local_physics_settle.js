(() => {
  "use strict";
  if (window.__ArChessLocalPhysicsSettle) return;
  window.__ArChessLocalPhysicsSettle = true;

  const boot = () => {
    if (!window.Physics || !window.gameState || !window.GAME_CONFIG) return false;
    const originalStep = window.Physics.step.bind(window.Physics);
    let quietTime = 0;
    let turnAge = 0;

    window.Physics.step = (game, deltaTime) => {
      originalStep(game, deltaTime);
      if (!game || game.gameOver || game.phase !== "physics") {
        quietTime = 0;
        turnAge = 0;
        return;
      }

      turnAge += deltaTime;
      const alive = game.pieces.filter((piece) => piece.alive);
      const maxSpeed = alive.reduce((max, piece) => Math.max(max, Math.hypot(piece.vx || 0, piece.vy || 0)), 0);
      const threshold = Math.max(0.20, (GAME_CONFIG.minVelocity || 0.18) * 1.25);
      const settled = maxSpeed <= threshold;
      if (settled) quietTime += deltaTime;
      else quietTime = 0;

      const settleWindow = Math.max(0.10, GAME_CONFIG.settleDelay || 0.18);
      const hardStop = turnAge >= 3.2 && maxSpeed <= 2.5;
      if (quietTime < settleWindow && !hardStop) return;

      for (const piece of alive) {
        piece.vx = 0;
        piece.vy = 0;
        piece.moving = false;
      }
      game.activeCollisions?.clear?.();
      game.hitPairs?.clear?.();
      game.settledFor = 0;
      quietTime = 0;
      turnAge = 0;
    };
    return true;
  };

  const started = performance.now();
  const poll = () => { if (boot() || performance.now() - started > 12000) return; setTimeout(poll, 40); };
  poll();
})();
