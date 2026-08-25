(() => {
  "use strict";
  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  const start = async () => {
    // professional_runtime.js is loaded before main.js so renderer gating is active from frame one.
    await load("./professional_shell.js?v=20260825-clean4");
    await load("./board_host.js?v=20260825-clean4");
    await Promise.all([
      load("./auth_gate.js?v=20260825-clean4"),
      load("./local_physics_settle.js?v=20260825-clean4"),
      load("./cburnett_piece_assets.js?v=20260825-clean4"),
      load("./oss_piece_assets.js?v=20260825-clean4"),
    ]);
  };

  start();
})();
