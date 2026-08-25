(() => {
  "use strict";
  if (window.__ArChessRuntimeStabilizer) return;
  window.__ArChessRuntimeStabilizer = true;

  const setMode = (mode) => {
    if (mode !== "2d" && mode !== "3d") return;
    try { localStorage.setItem("archess-view-mode", mode); } catch (_) {}
    document.body.dataset.renderMode = mode;
    document.documentElement.dataset.renderMode = mode;
    document.body.classList.toggle("archess-mode-2d", mode === "2d");
    document.body.classList.toggle("archess-mode-3d", mode === "3d");
    try { window.ArChessRenderMode?.set?.(mode); } catch (_) {}
    window.dispatchEvent(new CustomEvent("archess:modechange", { detail: { mode } }));
  };

  const normalize = () => {
    const shell = document.querySelector("#archessProfessionalShell");
    if (!shell) return false;

    // The shell is a UI overlay. Never re-parent or transform the live game renderer.
    shell.style.position = "fixed";
    shell.style.inset = "0";
    shell.style.zIndex = "60";
    shell.style.pointerEvents = "none";

    const board = document.querySelector(".game-layout > .board-zone .board-wrap") || document.querySelector(".board-wrap");
    if (board) {
      board.id = "boardWrap";
      board.style.position = "relative";
      board.style.pointerEvents = "auto";
      const frame = board.closest(".board-frame");
      if (frame) frame.style.pointerEvents = "auto";
      const canvas2d = board.querySelector("#gameCanvas");
      const canvas3d = board.querySelector("#glCanvas");
      if (canvas2d) { canvas2d.style.display = "block"; canvas2d.style.pointerEvents = "auto"; }
      if (canvas3d) { canvas3d.style.display = "block"; canvas3d.style.pointerEvents = "none"; }
    }

    const group = shell.querySelector(".aps-mode-group");
    if (group) {
      let native = shell.querySelector(".archess-native-mode-group");
      if (!native) {
        native = document.createElement("div");
        native.className = "archess-native-mode-group";
        native.setAttribute("role", "group");
        native.setAttribute("aria-label", "Render mode");
        native.style.cssText = "display:inline-flex;align-items:center;gap:3px;padding:3px;border:1px solid var(--archess-border,rgba(255,255,255,.1));border-radius:11px;background:rgba(255,255,255,.035);position:relative;z-index:120;pointer-events:auto";
        for (const mode of ["2d", "3d"]) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.archessMode = mode;
          button.textContent = mode.toUpperCase();
          button.style.cssText = "min-width:48px;height:28px;border:0;border-radius:8px;background:transparent;color:#7f8b9d;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;position:relative;z-index:121;pointer-events:auto";
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            setMode(mode);
            syncModeButtons();
          });
          native.appendChild(button);
        }
        group.replaceWith(native);
      }
      syncModeButtons();
    }

    for (const id of ["archessBoardPlus", "archessBoardMinus", "archessFocusBtn", "archessTheatreBtn", "archessNewGameBtn", "archessThemeButton"]) {
      const button = shell.querySelector(`#${id}`);
      if (!button) continue;
      button.removeAttribute("disabled");
      button.style.pointerEvents = "auto";
      button.style.position = "relative";
      button.style.zIndex = "122";
    }

    const menu = shell.querySelector("#archessThemeMenu");
    if (menu) menu.style.zIndex = "130";
    return Boolean(board);
  };

  const syncModeButtons = () => {
    const current = document.body.dataset.renderMode || document.documentElement.dataset.renderMode || "2d";
    document.querySelectorAll(".archess-native-mode-group [data-archess-mode]").forEach((button) => {
      const active = button.dataset.archessMode === current;
      button.removeAttribute("disabled");
      button.setAttribute("aria-pressed", String(active));
      button.style.background = active ? "color-mix(in srgb,var(--archess-accent) 18%,rgba(10,14,20,.92))" : "transparent";
      button.style.color = active ? "#fff" : "#7f8b9d";
      button.style.boxShadow = active ? "inset 0 0 0 1px color-mix(in srgb,var(--archess-accent) 35%,transparent),0 6px 18px color-mix(in srgb,var(--archess-accent) 9%,transparent)" : "none";
    });
  };

  const start = performance.now();
  const tick = () => {
    const ready = normalize();
    syncModeButtons();
    if (!ready && performance.now() - start < 15000) setTimeout(tick, 25);
  };
  tick();
  new MutationObserver(() => { normalize(); syncModeButtons(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled", "data-render-mode"] });
})();
