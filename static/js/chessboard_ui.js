"use strict";

(() => {
  const EMPTY_FEN = "";
  const board = document.getElementById("chessBoard");
  const log = window.ArChessObservability || { info() {}, warn() {}, error() {} };
  if (!board) {
    log.error?.("CHESSBOARD_UI_MISSING", new Error("#chessBoard element is missing"));
    return;
  }

  function applyTheme() {
    try {
      const theme = document.documentElement.dataset.theme || "wood";
      const palettes = {
        wood: ["#6c4932", "#d9bd95", "#825a3e", "#ead0aa"],
        dark: ["#163041", "#28465a", "#1d3b4f", "#36576b"],
        light: ["#8fa88f", "#e8e0cf", "#9db99d", "#f2ead6"],
      };
      const [dark, light, darkHover, lightHover] = palettes[theme] || palettes.wood;
      board.style.setProperty("--square-color-dark", dark);
      board.style.setProperty("--square-color-light", light);
      board.style.setProperty("--square-color-dark-hover", darkHover);
      board.style.setProperty("--square-color-light-hover", lightHover);
      board.style.setProperty("--outline-color-focus", "var(--archess-accent)");
      board.style.setProperty("--piece-padding", "4%");
      board.style.setProperty("--inner-border-width", "0");
    } catch (error) {
      log.warn?.("CHESSBOARD_THEME_ERROR", { error: String(error) });
    }
  }

  function activate() {
    try {
      board.setAttribute("fen", EMPTY_FEN);
      board.setAttribute("coordinates", "inside");
      board.removeAttribute("interactive");
      board.setAttribute("aria-label", "ArChess physics chess board");
      applyTheme();
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
        applyTheme,
      });
      window.addEventListener("archess:themechange", applyTheme);
      log.info?.("CHESSBOARD_LIBRARY_READY", { library: "gchessboard", version: "1.4.0" });
    } catch (error) {
      document.body.dataset.boardRenderer = "canvas";
      document.body.classList.remove("archess-board-library-ready");
      window.ArChessBoardUI = Object.freeze({ isReady: () => false });
      log.error?.("CHESSBOARD_LIBRARY_INIT_ERROR", error);
    }
  }

  function boot() {
    try {
      if (customElements.get("g-chess-board")) {
        activate();
        return;
      }
      customElements.whenDefined("g-chess-board").then(activate).catch((error) => {
        document.body.dataset.boardRenderer = "canvas";
        log.error?.("CHESSBOARD_LIBRARY_LOAD_ERROR", error);
      });
    } catch (error) {
      document.body.dataset.boardRenderer = "canvas";
      log.error?.("CHESSBOARD_LIBRARY_BOOT_ERROR", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
