// DISABLED: Native ArChess 2D runtime is authoritative.
(() => {
  "use strict";
  if (window.ArChessObservability?.info) {
    window.ArChessObservability.info("PROFESSIONAL_RUNTIME_DISABLED", { reason: "native_2d_renderer" });
  }
  window.__ArChessProfessionalRuntime = true;
})();
