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

    Scene.prototype.updatePieces = function(game, deltaTime) {
      originalUpdate.call(this, game, deltaTime);

      for (const entry of this.entries.values()) {
        const piece = entry.piece;
        if (!entry.group || entry.dying) continue;
        const moving = Boolean(piece.moving);

        if (moving && !entry.__flightActive) {
          entry.__flightActive = true;
          entry.__flightTime = 0;
          entry.__flightStartSpeed = Math.hypot(piece.vx || 0, piece.vy || 0);
          entry.__flightStartRotation = entry.group.rotation.y;
        }
        if (!moving) {
          entry.__flightActive = false;
          entry.__flightTime = 0;
          continue;
        }

        entry.__flightTime += deltaTime;
        const maxSpeed = GAME_CONFIG.maxLaunchSpeed || 13.5;
        const speed = Math.hypot(piece.vx || 0, piece.vy || 0);
        const launchRatio = Math.min(1, (entry.__flightStartSpeed || speed) / maxSpeed);
        const progress = Math.min(1, entry.__flightTime / 0.72);
        const arc = Math.sin(progress * Math.PI) * (0.08 + launchRatio * 0.34);

        // The x/z position is authoritative physics. The y offset is purely visual,
        // making the piece read as a thrown object instead of a sprite sliding on rails.
        entry.group.position.y += arc;

        if (speed > 0.05) {
          const vx = piece.vx || 0;
          const vy = piece.vy || 0;
          const lean = Math.min(0.18, speed / maxSpeed * 0.18);
          entry.group.rotation.x += (vy / speed) * lean;
          entry.group.rotation.z += (vx / speed) * lean;
          entry.group.rotation.y += deltaTime * (1.8 + speed * 0.18);
        }
      }
    };
    return true;
  });
})();
