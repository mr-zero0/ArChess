(() => {
  "use strict";
  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  const start = async () => {
    await load("./auth_gate.js?v=20260825-auth2");
    await load("./professional_shell.js?v=20260825-clean7");
    await load("./mode_controls_fix.js?v=20260825-mode3");
    await load("./board_host.js?v=20260825-clean7");
    await load("./turn_resolution_guard.js?v=20260825-turn3");
    await Promise.all([
      load("./cburnett_piece_assets.js?v=20260825-clean7"),
      load("./oss_piece_assets.js?v=20260825-clean7"),
    ]);
  };

  start();
})();
