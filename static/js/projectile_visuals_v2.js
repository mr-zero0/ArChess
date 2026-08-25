(() => {
  "use strict";
  if (window.__ArChessProjectileVisualsV2) return;
  window.__ArChessProjectileVisualsV2 = true;

  const wait = (fn) => {
    let tries = 0;
    const timer = setInterval(() => {
      if (fn() || ++tries > 240) clearInterval(timer);
    }, 50);
  };

  wait(() => {
    const Scene = window.ThreeDScene;
    if (!Scene?.prototype || Scene.prototype.__archessProjectileVisualsV2) return Boolean(Scene?.prototype);

    const originalUpdate = Scene.prototype.updatePieces;
    Scene.prototype.__archessProjectileVisualsV2 = true;

    Scene.prototype.updatePieces = function updatePiecesWithProjectileMotion(game, deltaTime) {
      originalUpdate.call(this, game, deltaTime);

      for (const entry of this.entries.values()) {
        const piece = entry.piece;
        if (!entry.group || entry.dying) continue;

        if (piece.moving) {
          if (!entry.__flightAge || entry.__flightWasMoving !== true) {
            entry.__flightAge = 0;
            entry.__flightStartSpeed = Math.hypot(piece.vx || 0, piece.vy || 0);
          }
          entry.__flightWasMoving = true;
          entry.__flightAge += deltaTime;

          const launchSpeed = entry.__flightStartSpeed || Math.hypot(piece.vx || 0, piece.vy || 0);
          const maxSpeed = GAME_CONFIG.maxLaunchSpeed || 13.5;
          const speedRatio = Math.min(1, launchSpeed / maxSpeed);

          // One physically readable launch hop: quick lift, apex, then settle.
          // It is visual only; the 2D physics state remains authoritative.
          const hopDuration = 0.72;
          const t = Math.min(1, entry.__flightAge / hopDuration);
          const hop = Math.sin(t * Math.PI) * (0.10 + speedRatio * 0.36);
          entry.group.position.y += hop;

          // Fast pieces bank into their velocity vector and spin subtly during flight.
          const vx = piece.vx || 0;
          const vy = piece.vy || 0;
          const speed = Math.hypot(vx, vy);
          if (speed > 0.05) {
            const lean = Math.min(0.18, speed / maxSpeed * 0.18);
            entry.group.rotation.x += (vy / speed) * lean;
            entry.group.rotation.z += (vx / speed) * lean;
            entry.group.rotation.y += deltaTime * (2.4 + speed * 0.24);
          }

          const stretch = 1 + speedRatio * 0.055;
          const baseScale = piece.radius / 0.30;
          entry.group.scale.set(baseScale * stretch, baseScale * (1 - speedRatio * 0.025), baseScale * stretch);
        } else {
          entry.__flightWasMoving = false;
          entry.__flightAge = 0;
        }
      }
    };
    return true;
  });
})();
