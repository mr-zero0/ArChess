// DISABLED: This legacy bootstrap injected the experimental professional overlay.
// Native templates + main.js own the application lifecycle now.
(() => {
  "use strict";
  window.__ArChessBootstrap = true;
  window.ArChessObservability?.info?.("ARCHESS_BOOTSTRAP_DISABLED", { reason: "native_lifecycle" });
})();
