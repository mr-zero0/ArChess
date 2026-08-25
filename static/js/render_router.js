(() => {
  "use strict";
  if (window.__ArChessRenderRouter) return;
  window.__ArChessRenderRouter = true;

  const started = performance.now();
  const tick = () => {
    if (window.GameRenderer?.prototype?.draw && window.__ArChessRenderRouter !== "disabled") {
      const proto = window.GameRenderer.prototype;
      if (!proto.__archess3DRoute) {
        const originalDraw = proto.draw;
        proto.__archess3DRoute = true;
        proto.draw = function routedDraw(state) {
          // When WebGL is active, ThreeDScene owns visible board rendering.
          // Keep the legacy draw method available only until the real renderer is ready.
          if (document.body.classList.contains("archess-3d-ready")) return;
          return originalDraw.call(this, state);
        };
      }
      return true;
    }
    if (performance.now() - started < 12000) setTimeout(tick, 40);
    return false;
  };
  tick();
})();
