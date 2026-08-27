"use strict";

(() => {
  const EMPTY_FEN = "8/8/8/8/8/8/8/8";
  const board = document.getElementById("chessBoard");
  const log = window.ArChessObservability || { info() {}, warn() {}, error() {} };
  if (!board) {
    log.error?.("CHESSBOARD_UI_MISSING", new Error("#chessBoard element is missing"));
    return;
  }

  function activate() {
    try {
      board.setAttribute("fen", EMPTY_FEN);
      board.removeAttribute("interactive");
      board.setAttribute("aria-label", "ArChess physics chess board");
      document.body.dataset.boardRenderer = "library";
      document.body.classList.add("archess-board-library-ready");
      window.ArChessBoardUI = Object.freeze({
        isReady: () => true,
        orientation: () => board.orientation || "white",
        setOrientation: (orientation) => {
          if (orientation !== "white" && orientation !== "black") return;
          board.orientation = orientation;
          log.info?.("BOARD_ORIENTATION_CHANGED", { orientation });
        },
      });
      log.info?.("CHESSBOARD_LIBRARY_READY", { library: "gchessboard", version: "1.4.0" });
    } catch (error) {
      document.body.dataset.boardRenderer = "canvas";
      document.body.classList.remove("archess-board-library-ready");
      window.ArChessBoardUI = Object.freeze({ isReady: () => false });
      log.error?.("CHESSBOARD_LIBRARY_INIT_ERROR", error);
    }
  }

  function boot() {
    if (customElements.get("g-chess-board")) {
      activate();
      return;
    }
    customElements.whenDefined("g-chess-board")
      .then(activate)
      .catch((error) => {
        document.body.dataset.boardRenderer = "canvas";
        log.error?.("CHESSBOARD_LIBRARY_LOAD_ERROR", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
