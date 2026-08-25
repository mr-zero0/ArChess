(() => {
  "use strict";
  if (window.__ArChessTurnResolutionGuard) return;
  window.__ArChessTurnResolutionGuard = true;

  let physicsAge = 0;
  let quietAge = 0;
  let lastPlayer = null;
  let lastResolvedPlayer = null;

  const installMenuLayerFix = () => {
    if (document.getElementById("archessRuntimeLayerFix")) return;
    const style = document.createElement("style");
    style.id = "archessRuntimeLayerFix";
    style.textContent = `
      #archessProfessionalShell { position: relative; z-index: 10; }
      #archessProfessionalShell .aps-topbar,
      #archessProfessionalShell .aps-center-controls,
      #archessProfessionalShell .aps-menu-wrap { position: relative; z-index: 1000; }
      #archessProfessionalShell .aps-theme-menu { position: absolute; z-index: 1100 !important; pointer-events: auto !important; }
      #archessProfessionalShell .aps-stage { position: relative; z-index: 1; }
      #archessProfessionalShell .aps-stage canvas { position: relative; z-index: 1; }
    `;
    document.head.appendChild(style);
  };

  const safeHistory = (message) => {
    try {
      if (window.gameState.history) window.gameState.history.push(message);
      if (window.UI?.log) UI.log(message);
    } catch (_) {}
  };

  const resolveTurn = () => {
    const game = window.gameState;
    if (!game || game.gameOver || game.phase !== "physics") return false;
    const playedTeam = game.currentPlayer;

    // Prefer the real main.js settle path when available. It preserves replay,
    // challenge, timer and history behavior in the authoritative game loop.
    if (window.ArChessTurnApi?.forceSettle) {
      window.ArChessTurnApi.forceSettle();
      return true;
    }

    // Safe fallback for early bootstrap races: settle the state without allowing
    // a second launcher or leaving the board stuck in physics forever.
    for (const piece of game.pieces || []) {
      piece.vx = 0;
      piece.vy = 0;
      piece.moving = false;
    }
    game.activeCollisions?.clear?.();
    game.hitPairs?.clear?.();
    game.settledFor = 0;
    game.currentPlayer = playedTeam === "white" ? "black" : "white";
    game.phase = "aim";
    game.selectedPiece = null;
    game.dragging = false;
    game.pointer = null;
    game.powerRatio = 0;
    game.turnTimeLeft = game.turnTime || 0;
    safeHistory(`${game.currentPlayer === "white" ? "White" : "Black"} to move.`);
    window.UI?.update?.(true);
    return true;
  };

  const tick = (dt) => {
    installMenuLayerFix();
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

    const forceAfter = 4.0;
    const quietEnough = quietAge >= 0.22;
    const safetySettle = physicsAge >= forceAfter && maxSpeed <= 6.0;
    if (!quietEnough && !safetySettle) return;
    if (lastResolvedPlayer === game.currentPlayer) return;

    lastResolvedPlayer = game.currentPlayer;
    resolveTurn();
    physicsAge = 0;
    quietAge = 0;
  };

  const loop = (now) => {
    const previous = loop.previous ?? now;
    loop.previous = now;
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
    tick(dt);
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
})();
