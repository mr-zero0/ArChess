// DISABLED: The professional overlay previously conflicted with the authoritative
// ArChess board renderer. The production page now uses the native game shell.
(() => {
  "use strict";
  if (window.ArChessObservability?.info) {
    window.ArChessObservability.info("PROFESSIONAL_SHELL_DISABLED", { reason: "native_game_shell" });
  }
  window.__ArChessProfessionalShell = true;
})();
