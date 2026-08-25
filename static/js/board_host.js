(() => {
  "use strict";
  if (window.__ArChessBoardHost) return;
  window.__ArChessBoardHost = true;

  function mount() {
    const host = document.querySelector("#archessProfessionalShell .aps-stage");
    const board = document.querySelector(".game-layout > .board-zone") || document.querySelector(".archess-board-host");
    if (!host || !board) return false;
    const boardWrap = board.querySelector(".board-wrap");
    if (boardWrap) boardWrap.id = "boardWrap";
    board.classList.add("archess-board-host");
    if (board.parentElement !== host) host.appendChild(board);
    document.body.classList.add("archess-board-mounted");
    window.dispatchEvent(new Event("resize"));
    return Boolean(boardWrap);
  }

  const started = performance.now();
  const poll = () => {
    if (mount()) return;
    if (performance.now() - started < 15000) setTimeout(poll, 25);
  };
  poll();
})();
