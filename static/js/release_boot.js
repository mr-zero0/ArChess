(() => {
  "use strict";
  if (window.__ArChessReleaseBoot) return;
  window.__ArChessReleaseBoot = true;

  const load = (path, delay) => setTimeout(() => import(path).catch((error) => console.error(`ArChess module failed: ${path}`, error)), delay);
  // Bootstrap order matters: auth gate first, then physics/input/render layers.
  load("/static/js/auth_gate.js?v=release2", 20);
  load("/static/js/local_physics_settle.js?v=release2", 80);
  load("/static/js/local_input_controller.js?v=release2", 160);
  load("/static/js/gameplay_polish.js?v=release2", 240);
  load("/static/js/projectile_visuals_v2.js?v=release2", 360);
  load("/static/js/render_router.js?v=release2", 460);
  load("/static/js/oss_piece_assets.js?v=release2", 900);
})();
