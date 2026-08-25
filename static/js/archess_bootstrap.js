(() => {
  "use strict";
  if (window.__ArChessBootstrap) return;
  window.__ArChessBootstrap = true;

  const load = (path) => import(path).catch((error) => console.error(`ArChess bootstrap failed: ${path}`, error));

  function normalizeBoardAndControls() {
    const shell = document.querySelector("#archessProfessionalShell");
    if (!shell) return false;

    const api = window.ArChessProfessionalShell || window.ArChessProfessionalUI;
    if (api && !window.ArChessProfessionalUI) window.ArChessProfessionalUI = api;

    const stage = shell.querySelector(".aps-stage");
    const boardZone = document.querySelector(".game-layout > .board-zone") || document.querySelector(".archess-board-host");
    if (stage && boardZone && boardZone.parentElement !== stage) stage.appendChild(boardZone);

    const boardWrap = document.querySelector(".board-wrap");
    if (boardWrap) boardWrap.id = "boardWrap";

    let modeGroup = shell.querySelector(".aps-native-mode-group");
    if (!modeGroup) {
      const source = shell.querySelector(".aps-mode-group");
      modeGroup = document.createElement("div");
      modeGroup.className = "aps-native-mode-group";
      modeGroup.setAttribute("role", "group");
      modeGroup.setAttribute("aria-label", "Render mode");
      modeGroup.style.cssText = "display:inline-flex;align-items:center;padding:3px;gap:3px;border:1px solid var(--archess-border,rgba(255,255,255,.1));border-radius:11px;background:rgba(255,255,255,.035);position:relative;z-index:300;pointer-events:auto;";
      for (const mode of ["2d", "3d"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.archessMode = mode;
        button.textContent = mode.toUpperCase();
        button.style.cssText = "min-width:48px;height:27px;border:0;border-radius:8px;background:transparent;color:#7f8b9d;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;pointer-events:auto;position:relative;z-index:301;";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const current = window.ArChessProfessionalShell || window.ArChessProfessionalUI;
          current?.applyMode?.(mode);
          updateModes(mode);
        });
        modeGroup.appendChild(button);
      }
      if (source) source.replaceWith(modeGroup);
      else shell.querySelector(".aps-center-controls")?.prepend(modeGroup);
    }

    function updateModes(mode = (window.ArChessProfessionalShell || window.ArChessProfessionalUI)?.getState?.().mode || document.body.dataset.renderMode || "2d") {
      modeGroup.querySelectorAll("[data-archess-mode]").forEach((button) => {
        const active = button.dataset.archessMode === mode;
        button.setAttribute("aria-pressed", String(active));
        button.removeAttribute("disabled");
        button.style.pointerEvents = "auto";
        button.style.background = active ? "color-mix(in srgb,var(--archess-accent) 18%,rgba(10,14,20,.92))" : "transparent";
        button.style.color = active ? "#fff" : "#7f8b9d";
      });
    }
    updateModes();

    ["archessBoardPlus", "archessBoardMinus", "archessFocusBtn", "archessTheatreBtn", "archessNewGameBtn", "archessThemeButton"].forEach((id) => {
      const node = shell.querySelector(`#${id}`);
      if (node) {
        node.removeAttribute("disabled");
        node.style.pointerEvents = "auto";
        node.style.position = "relative";
        node.style.zIndex = "250";
      }
    });

    document.querySelector(".aps-theme-menu")?.style.setProperty("z-index", "9999");
    document.querySelector(".aps-menu-wrap")?.style.setProperty("position", "relative");
    document.querySelector(".aps-menu-wrap")?.style.setProperty("z-index", "1000");
    document.documentElement.style.setProperty("--archess-ui-ready", "1");
    document.body.classList.add("archess-bootstrap-ready");
    window.dispatchEvent(new Event("resize"));
    return Boolean(boardWrap && shell.querySelector("[data-archess-mode='2d']") && shell.querySelector("#archessBoardPlus"));
  }

  const start = async () => {
    await load("./auth_gate.js?v=20260825-auth3");
    await load("./professional_shell.js?v=20260825-clean8");
    normalizeBoardAndControls();
    await load("./mode_controls_fix.js?v=20260825-mode4");
    await load("./board_host.js?v=20260825-host2");
    await load("./turn_resolution_guard.js?v=20260825-turn4");
    await Promise.all([
      load("./cburnett_piece_assets.js?v=20260825-clean7"),
      load("./oss_piece_assets.js?v=20260825-clean7"),
    ]);
    const started = performance.now();
    const poll = () => {
      if (normalizeBoardAndControls() || performance.now() - started > 15000) return;
      setTimeout(poll, 25);
    };
    poll();
  };

  start();
})();
