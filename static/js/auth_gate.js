(() => {
  "use strict";
  if (window.__ArChessAuthGate) return;
  window.__ArChessAuthGate = true;

  function install() {
    // Local 2D matches are intentionally playable without an account.
    // Authentication is still required by account, ranked and multiplayer flows.
    window.__ArChessAuthenticated = document.body?.dataset?.authenticated === "true";
    window.__ArChessLocalMatch = true;

    const gate = document.getElementById("archessAuthGate");
    if (gate) gate.remove();

    const newGame = document.getElementById("newGameBtn");
    if (newGame && newGame.__archessAuthGuard) {
      newGame.__archessAuthGuard = false;
    }
  }

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  } catch (error) {
    try { console.error("[ArChess] auth gate initialization failed", error); } catch (_) {}
  }
})();
