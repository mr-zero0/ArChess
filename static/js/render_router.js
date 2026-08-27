// DISABLED: Native renderer owns the 2D canvas directly.
(() => {
  "use strict";
  window.__ArChessRenderRouter = "disabled";
  window.ArChessObservability?.info?.("RENDER_ROUTER_DISABLED", { reason: "native_2d_renderer" });
})();
