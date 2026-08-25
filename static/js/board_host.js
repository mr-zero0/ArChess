(() => {
  "use strict";
  if (window.__ArChessBoardHost) return;
  window.__ArChessBoardHost = true;

  function mount() {
    const host = document.querySelector("#archessProfessionalShell .aps-stage");
    const board = document.querySelector(".game-layout > .board-zone");
    if (!host || !board) return false;
    board.id = "boardWrap";
    board.classList.add("archess-board-host");
    if (board.parentElement !== host) host.appendChild(board);
    document.body.classList.add("archess-board-mounted");
    window.dispatchEvent(new Event("resize"));
    return true;
  }

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }
})();
