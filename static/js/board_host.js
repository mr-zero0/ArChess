(() => {
  "use strict";
  if (window.__ArChessBoardHost) return;
  window.__ArChessBoardHost = true;

  function normalize() {
    const boardWrap = document.querySelector(".game-layout > .board-zone .board-wrap") || document.querySelector(".board-wrap");
    const boardCanvas = document.querySelector("#gameCanvas");
    const glCanvas = document.querySelector("#glCanvas");
    if (!boardWrap) return false;

    boardWrap.id = "boardWrap";
    boardWrap.classList.add("archess-board-host");
    boardWrap.style.position = "relative";
    boardWrap.style.pointerEvents = "auto";

    if (boardCanvas) {
      boardCanvas.style.position = "absolute";
      boardCanvas.style.inset = "0";
      boardCanvas.style.width = "100%";
      boardCanvas.style.height = "100%";
      boardCanvas.style.display = "block";
      boardCanvas.style.pointerEvents = "auto";
    }
    if (glCanvas) {
      glCanvas.style.position = "absolute";
      glCanvas.style.inset = "0";
      glCanvas.style.width = "100%";
      glCanvas.style.height = "100%";
      glCanvas.style.display = "block";
      glCanvas.style.pointerEvents = "none";
    }

    // Keep the real game board in the original game-layout container.
    // The professional shell is an overlay and must never re-parent the renderer canvas.
    document.body.classList.add("archess-board-ready");
    window.dispatchEvent(new Event("resize"));
    return Boolean(boardCanvas || glCanvas);
  }

  const started = performance.now();
  const poll = () => {
    if (normalize()) return;
    if (performance.now() - started < 15000) setTimeout(poll, 25);
  };
  poll();
})();
