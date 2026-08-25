(() => {
  "use strict";
  if (window.__ArChessReleaseBoot) return;
  window.__ArChessReleaseBoot = true;
  const load = (path, delay) => setTimeout(() => import(path).catch((error) => console.error(`ArChess module failed: ${path}`, error)), delay);
  load("/static/js/local_physics_settle.js?v=release1", 80);
  load("/static/js/local_input_controller.js?v=release1", 160);
  load("/static/js/gameplay_polish.js?v=release1", 240);
  load("/static/js/projectile_visuals_v2.js?v=release1", 360);
  load("/static/js/render_router.js?v=release1", 460);
  load("/static/js/oss_piece_assets.js?v=release1", 900);
})();
