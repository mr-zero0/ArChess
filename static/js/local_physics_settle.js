(() => {
  "use strict";

  // Local turn settlement is owned by main.js -> settle().
  // This compatibility module intentionally does not wrap Physics.step: a second
  // settlement observer can prematurely zero collision velocities and create a
  // false "hit then freeze" feeling after the first impact.
  if (window.__ArChessLocalPhysicsSettle) return;
  window.__ArChessLocalPhysicsSettle = true;
  window.ArChessObservability?.debug?.("LOCAL_SETTLE_COMPAT_READY");
})();
