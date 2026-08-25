(() => {
  "use strict";

  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  const start = async () => {
    // main.js remains the authoritative game loop; presentation modules never own input or physics.
    await load("./professional_runtime.js?v=20260825-clean3");
    await load("./professional_shell.js?v=20260825-clean3");
    await load("./board_host.js?v=20260825-clean3");
    await Promise.all([
      load("./auth_gate.js?v=20260825-clean3"),
      load("./local_physics_settle.js?v=20260825-clean3"),
      load("./cburnett_piece_assets.js?v=20260825-clean3"),
      load("./oss_piece_assets.js?v=20260825-clean3"),
    ]);
  };

  start();
})();
