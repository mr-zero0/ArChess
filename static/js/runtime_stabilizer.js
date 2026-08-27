// DISABLED: legacy professional shell stabilizer. Native game layout is authoritative.
(() => {
  "use strict";
  window.__ArChessRuntimeStabilizer = true;
  window.ArChessObservability?.info?.("RUNTIME_STABILIZER_DISABLED", { reason: "native_game_layout" });
})();
