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

      const threshold = GAME_CONFIG.minVelocity || 0.18;
      const moving = game.pieces.filter((piece) => piece.alive && piece.moving);
      const maxSpeed = moving.reduce((max, piece) => Math.max(max, Math.hypot(piece.vx, piece.vy)), 0);

      // Contact resolution can leave bodies geometrically touching with zero kinetic
      // energy. That is a settled board, not an active collision state.
      if (maxSpeed <= threshold) {
        quietTime += deltaTime;
      } else {
        quietTime = 0;
      }

      const settleWindow = Math.max(0.08, GAME_CONFIG.settleDelay || 0.18);
      if (quietTime >= settleWindow) {
        for (const piece of game.pieces) {
          if (!piece.alive) continue;
          if (Math.hypot(piece.vx, piece.vy) <= threshold) {
            piece.vx = 0;
            piece.vy = 0;
            piece.moving = false;
          }
        }
        game.activeCollisions.clear();
        quietTime = 0;
      }
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
