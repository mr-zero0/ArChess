(() => {
  "use strict";

  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  const start = async () => {
    // main.js is already the authoritative game loop. These modules only add the
    // presentation shell, auth gate, deterministic local settling, and real 3D assets.
    await load("./professional_runtime.js?v=20260825-clean1");
    await load("./professional_shell.js?v=20260825-clean1");
    await Promise.all([
      load("./auth_gate.js?v=20260825-clean1"),
      load("./local_physics_settle.js?v=20260825-clean1"),
      load("./oss_piece_assets.js?v=20260825-clean1"),
    ]);
  };

  start();
})();
