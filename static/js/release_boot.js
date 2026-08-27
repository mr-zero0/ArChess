// DISABLED: Legacy release boot loaded overlapping experimental runtimes.
// ArChess now boots from the native template script chain only.
(() => {
  "use strict";
  window.__ArChessReleaseBoot = true;
  window.ArChessObservability?.info?.("RELEASE_BOOT_DISABLED", { reason: "native_lifecycle" });
})();
