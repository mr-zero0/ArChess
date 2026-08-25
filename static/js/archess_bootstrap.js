(() => {
  "use strict";
  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  const start = async () => {
    await load("./professional_shell.js?v=20260825-clean6");
    await load("./mode_controls_fix.js?v=20260825-clean6");
    await load("./board_host.js?v=20260825-clean6");
    await load("./turn_resolution_guard.js?v=20260825-turn2");
    await Promise.all([
      load("./auth_gate.js?v=20260825-clean6"),
      load("./cburnett_piece_assets.js?v=20260825-clean6"),
      load("./oss_piece_assets.js?v=20260825-clean6"),
    ]);
  };

  start();
})();
