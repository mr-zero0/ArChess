// Consolidated boot sequence for Archess Professional Shell
(() => {
  "use strict";
  if (window.__ArChessReleaseBoot) return;
  window.__ArChessReleaseBoot = true;

  const load = (path, delay) => setTimeout(() => {
    import(path)
      .then((module) => {
        // Expose critical UI controllers to global scope for testing/integration
        if (module.default) window.ArChessProfessionalUI = module.default;
      })
      .catch((error) => console.error(`ArChess module failed: ${path}`, error));
  }, delay);

  // Expose global state for test compatibility
  window.gameState = window.gameState || {};
  window.Physics = window.Physics || {};
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  window.__ArChessReleaseBoot = true;
  // 1. Core Services & Themes
  load("/static/js/theme.js", 0);
  load("/static/js/audio.js", 0);
  load("/static/js/identity.js", 0);

  // 2. Game State & Auth
  load("/static/js/auth_gate.js?v=release2", 50);
  load("/static/js/mode.js", 50);

  // 3. Renderer & Shell (The Professional Layer)
  load("/static/js/render_router.js?v=release2", 150);
  load("/static/js/render3d.js?v=release2", 200);
  load("/static/js/professional_runtime.js?v=release2", 250);

  // 4. Gameplay & Polish
  load("/static/js/local_input_controller.js?v=release2", 350);
  load("/static/js/gameplay_polish.js?v=release2", 450);
  load("/static/js/archess_bootstrap.js", 650);
})();



